export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { sdk, createTokenInfoAndMetadata, serializeVersionedTx, connection } from "@/lib/bags";
import { db } from "@/lib/db";
import { tokens, users } from "@/db/schema";
import { PublicKey, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { eq } from "drizzle-orm";

const log = (msg: string, ...args: unknown[]) =>
  console.log(`[launch] ${msg}`, ...args);

function isPrivateHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "::") return true;
  // IPv4 private/loopback/link-local/metadata
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;          // AWS/GCE metadata, link-local
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true; // CGNAT
  // IPv6 private ranges
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;   // unique-local
  if (/^fe80:/.test(h)) return true;               // link-local
  return false;
}

async function validateImageUrl(url: string): Promise<string | null> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return "Invalid image URL"; }
  if (!["http:", "https:"].includes(parsed.protocol)) return "Image URL must use http(s)";
  if (isPrivateHostname(parsed.hostname)) {
    return "Image URL points to an internal/private host";
  }
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000), redirect: "manual" });
    // Reject redirects to internal hosts
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) {
        try {
          const redir = new URL(loc, url);
          if (isPrivateHostname(redir.hostname)) return "Image URL redirects to a private host";
        } catch { /* ignore parse errors */ }
      }
    }
    if (!res.ok && res.status < 300) return `Image URL returned ${res.status}. Must be publicly accessible.`;
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !ct.startsWith("image/"))
      return `URL must point to an image (got "${ct}"). Use a direct .png/.jpg/.webp link.`;
    // Bags rejects images larger than 1 MB — surface a clear error before SDK call
    const cl = res.headers.get("content-length");
    if (cl) {
      const size = parseInt(cl, 10);
      if (Number.isFinite(size) && size > 1_048_576) {
        return `Image is ${(size/1024/1024).toFixed(2)} MB; Bags max is 1 MB. Compress or pick a smaller asset.`;
      }
    }
    return null;
  } catch (e) {
    return `Cannot reach image URL: ${String(e).slice(0, 80)}`;
  }
}

function getPlatformKeypair(): Keypair | null {
  const raw = process.env.PRIVATE_KEY?.trim();
  if (!raw) return null;
  try {
    return raw.startsWith("[")
      ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)))
      : Keypair.fromSecretKey(bs58.decode(raw));
  } catch (e) {
    console.error("[launch] PRIVATE_KEY is set but unparseable:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, symbol, description,
    imageUrl,
    websiteUrl, twitterUrl, telegramUrl,
    whitepaperUrl, tags, teamWallets,
    initialBuyLamports,
    tokenMint: preMint,
    metadataUrl: preMetadataUrl,
  } = body;

  log(`START wallet=${wallet.slice(0, 8)}... name="${name}" symbol="${symbol}"`);

  if (!name || !symbol) {
    return NextResponse.json({ error: "name and symbol required" }, { status: 400 });
  }
  if (!imageUrl && !preMint) {
    return NextResponse.json({ error: "imageUrl or pre-uploaded tokenMint required" }, { status: 400 });
  }

  try {
    const creatorPubkey = new PublicKey(wallet);

    // Step 1: metadata
    let tokenMint: string;
    let tokenMetadata: string;

    if (preMint && preMetadataUrl) {
      tokenMint     = preMint;
      tokenMetadata = preMetadataUrl;
      log(`step1 reuse pre-uploaded mint=${tokenMint.slice(0, 12)}...`);
    } else {
      log(`step1 validating imageUrl...`);
      const imgError = await validateImageUrl(imageUrl);
      if (imgError) {
        log(`step1 image validation failed: ${imgError}`);
        return NextResponse.json({ error: imgError }, { status: 400 });
      }

      log(`step1 calling createTokenInfoAndMetadata...`);
      try {
        const result = await createTokenInfoAndMetadata({
          name, symbol, description: description ?? "", imageUrl, websiteUrl, twitterUrl, telegramUrl,
        });
        tokenMint     = result.tokenMint;
        tokenMetadata = result.tokenMetadata;
        log(`step1 OK mint=${tokenMint.slice(0, 12)}... metadata=${tokenMetadata.slice(0, 40)}...`);
      } catch (e) {
        const msg = String(e);
        log(`step1 ERROR: ${msg.slice(0, 120)}`);
        if (msg.includes("400")) {
          return NextResponse.json({
            error: "Bags API rejected the metadata. Check: image accessible? Symbol unique (A-Z only, 2-10 chars)?",
          }, { status: 400 });
        }
        throw e;
      }
    }

    const mintPubkey = new PublicKey(tokenMint);

    // ── Step 2: fee-share config (CANONICAL — creator is payer + signer) ─
    // Per Bags docs `launch-token` guide, the creator's keypair signs:
    //   • fee share config txs
    //   • Lookup Table create/extend txs
    //   • the launch tx
    // We build all of these server-side and return serialized txs to the client.
    // The client wallet signs and broadcasts them in order. No platform keypair needed.
    const platformWalletStr = process.env.BAGS_PLATFORM_WALLET;
    const platformWallet = platformWalletStr ? new PublicKey(platformWalletStr) : null;

    const feeClaimers = (platformWallet && platformWallet.toBase58() !== creatorPubkey.toBase58())
      ? [{ user: creatorPubkey, userBps: 7500 }, { user: platformWallet, userBps: 2500 }]
      : [{ user: creatorPubkey, userBps: 10000 }];

    let configKey: PublicKey;
    const configTxsBase64: string[] = [];

    const existing = await db.query.tokens.findFirst({ where: eq(tokens.mint, tokenMint) });
    if (existing?.partnerConfig && existing.creatorWallet === wallet) {
      // Reuse cached config — no new config txs to sign.
      configKey = new PublicKey(existing.partnerConfig);
      log(`step2 reuse cached configKey=${configKey.toBase58().slice(0, 12)}…`);
    } else if (existing && existing.creatorWallet !== wallet) {
      return NextResponse.json({
        error: "This mint already exists with a different creator",
        hint: "Try uploading a fresh image or change the symbol — Bags generates a new mint per upload",
        existingCreator: existing.creatorWallet,
      }, { status: 409 });
    } else {
      log(`step2 building fee-share config payer=${creatorPubkey.toBase58().slice(0, 8)}… claimers=${feeClaimers.length}`);
      try {
        const cfg = await sdk.config.createBagsFeeShareConfig({
          feeClaimers, payer: creatorPubkey, baseMint: mintPubkey,
        });
        configKey = cfg.meteoraConfigKey;
        log(`step2 configKey=${configKey.toBase58().slice(0, 12)}… txs=${cfg.transactions?.length ?? 0}`);

        // Serialize ALL config txs (config + LUT bundles) for the client to sign.
        const allTxs = [...(cfg.transactions ?? []), ...(cfg.bundles ?? []).flat()].filter(Boolean);
        for (const tx of allTxs as VersionedTransaction[]) {
          configTxsBase64.push(serializeVersionedTx(tx));
        }
      } catch (configErr) {
        const errMsg = String(configErr);
        log(`step2 ERROR (trying single-claimer fallback): ${errMsg.slice(0, 150)}`);
        try {
          const fallback = await sdk.config.createBagsFeeShareConfig({
            feeClaimers: [{ user: creatorPubkey, userBps: 10000 }],
            payer: creatorPubkey, baseMint: mintPubkey,
          });
          configKey = fallback.meteoraConfigKey;
          log(`step2 fallback configKey=${configKey.toBase58().slice(0, 12)}… txs=${fallback.transactions?.length ?? 0}`);
          const allTxs = [...(fallback.transactions ?? []), ...(fallback.bundles ?? []).flat()].filter(Boolean);
          for (const tx of allTxs as VersionedTransaction[]) {
            configTxsBase64.push(serializeVersionedTx(tx));
          }
        } catch (fallbackErr) {
          throw new Error(`Fee config failed: ${errMsg.slice(0, 100)} | fallback: ${String(fallbackErr).slice(0, 100)}`);
        }
      }
    }

    // Step 3: launch tx
    // Validate initialBuyLamports: must be a non-negative integer <= 100 SOL
    const MAX_INITIAL_BUY = 100 * 1e9; // 100 SOL in lamports
    const rawBuy = Number(initialBuyLamports);
    const buyLamports = (Number.isFinite(rawBuy) && rawBuy > 0 && rawBuy <= MAX_INITIAL_BUY)
      ? Math.floor(rawBuy)
      : 0;
    log(`step3 createLaunchTransaction buyLamports=${buyLamports}`);

    const launchTx = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl: tokenMetadata,
      tokenMint:   mintPubkey,
      launchWallet: creatorPubkey,
      initialBuyLamports: buyLamports,
      configKey,
    });
    log(`step3 launchTx ready bytes=${launchTx.serialize().length}`);

    // Save draft
    await db.insert(users).values({ wallet }).onConflictDoNothing();
    await db.insert(tokens).values({
      mint: tokenMint, creatorWallet: wallet, name, symbol, description,
      imageUrl: imageUrl ?? "", websiteUrl, twitterUrl, telegramUrl,
      whitepaperUrl: whitepaperUrl ?? null,
      tags: tags && tags.length > 0 ? tags : null,
      teamWallets: teamWallets && teamWallets.length > 0 ? teamWallets : null,
      launchStatus: "pending", initialBuyLamports,
      partnerConfig: configKey.toBase58(),
    }).onConflictDoUpdate({
      target: tokens.mint,
      set: { partnerConfig: configKey.toBase58(), launchStatus: "pending" },
    });

    log(`DONE mint=${tokenMint.slice(0, 12)}... returning launchTx to client`);
    return NextResponse.json({
      mint: tokenMint,
      metadataUrl: tokenMetadata,
      configTxs: configTxsBase64,
      launchTx: serializeVersionedTx(launchTx),
    });
  } catch (e: unknown) {
    const { safeError } = await import("@/lib/safe-error");
    const msg = safeError(e, 300);
    console.error(`[launch] FATAL ${msg}`);
    if (msg.includes("insufficient funds") || msg.includes("0x1"))
      return NextResponse.json({ error: "Insufficient SOL. Need at least 0.05 SOL in your wallet." }, { status: 400 });
    if (msg.includes("already in use") || msg.includes("already exists"))
      return NextResponse.json({ error: "This token mint already exists. Try uploading a fresh image." }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
