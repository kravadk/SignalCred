/**
 * Upload a token image via Bags SDK.
 * Calls createTokenInfoAndMetadata with image:Buffer — SDK uploads to Bags CDN / IPFS.
 * Returns the hosted imageUrl so the client can preview it and reuse mint/metadataUrl at launch.
 */
import { NextRequest, NextResponse } from "next/server";
import { sdk } from "@/lib/bags";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file    = formData.get("file")        as File   | null;
    const name    = (formData.get("name")        as string) || "Token";
    const symbol  = (formData.get("symbol")      as string) || "TKN";
    const description = (formData.get("description") as string) || "";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/"))
      return NextResponse.json({ error: `Must be an image file, got ${file.type}` }, { status: 400 });
    if (file.size > 1_048_576)
      return NextResponse.json({
        error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 1 MB per Bags rules.`,
      }, { status: 400 });

    console.log(`[upload/image] ${file.name} ${(file.size/1024).toFixed(0)}KB type=${file.type} name="${name}" symbol="${symbol}"`);

    const buf = Buffer.from(await file.arrayBuffer());
    // Magic-byte sniff defends against MIME-spoof (curl can set any Content-Type)
    const sig = buf.subarray(0, 12);
    const isPng  = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
    const isJpg  = sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff;
    const isWebp = sig[0] === 0x52 && sig[1] === 0x49 && sig[8] === 0x57 && sig[9] === 0x45;
    const isGif  = sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46;
    if (!isPng && !isJpg && !isWebp && !isGif) {
      return NextResponse.json({ error: "File is not a valid image (magic-byte mismatch)" }, { status: 400 });
    }
    // Per-wallet rate limit — Bags createTokenInfoAndMetadata burns API quota
    const { rateLimit } = await import("@/lib/rate-limit");
    const rl = rateLimit(`upload:${wallet}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
    // Normalize symbol: uppercase letters only, 2-10 chars (Bags rule)
    const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10) || "TKN";
    const result = await sdk.tokenLaunch.createTokenInfoAndMetadata({
      image: { value: buf, options: { filename: file.name || "token.png", contentType: file.type } },
      name,
      symbol: normalizedSymbol,
      description,
    });

    console.log(`[upload/image] OK mint=${result.tokenMint.slice(0,12)}… image=${result.tokenLaunch.image.slice(0,40)}…`);
    return NextResponse.json({
      imageUrl:    result.tokenLaunch.image,
      metadataUrl: result.tokenMetadata,
      tokenMint:   result.tokenMint,
    });
  } catch (e) {
    const { safeError } = await import("@/lib/safe-error");
    const msg = safeError(e, 240);
    console.error("[upload/image] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
