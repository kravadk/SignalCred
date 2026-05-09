import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { posts, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getTokenOverview } from "@/lib/birdeye";
import {
  getBagsClaimEvents,
  getBagsCreators,
  getBagsLifetimeFees,
  getBagsPoolByMint,
} from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { feeVelocityValue } from "@/lib/fee-velocity-display";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function readBagsMeta(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const root = metadata as Record<string, unknown>;
  const bags = root.bags;
  return bags && typeof bags === "object" && !Array.isArray(bags)
    ? (bags as Record<string, unknown>)
    : {};
}

function normalizeImageUrl(value?: string | null) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${trimmed.replace("ipfs://", "").replace(/^ipfs\//, "")}`;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sumClaimEventsLamports(events: Array<{ amount?: string }>) {
  return events.reduce((sum, event) => {
    const value = Number(event.amount ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function sourceStatus(source: unknown) {
  return typeof source === "string" && source ? source : "pending";
}

export async function GET(_req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });
  const bagsMeta = readBagsMeta(token?.metadata);
  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;

  const [marketData, pool, creators, lifetimeFeesRaw, claimEvents24h, socialRows] = await Promise.all([
    withTimeout(getTokenOverview(params.mint), 2_500, null),
    withTimeout(getBagsPoolByMint(params.mint), 2_500, null),
    withTimeout(getBagsCreators(params.mint), 2_500, []),
    withTimeout(getBagsLifetimeFees(params.mint), 2_500, null),
    withTimeout(getBagsClaimEvents(params.mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
    withTimeout(db.select().from(posts).where(eq(posts.tokenMint, params.mint)).limit(50), 2_500, []),
  ]);

  const lifetimeFeesLamports = Number(lifetimeFeesRaw ?? 0);
  const safeLifetimeFeesLamports = Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0;
  const feeVelocity = await withTimeout(
    getFeeVelocity24h(params.mint, safeLifetimeFeesLamports),
    2_500,
    null
  );
  const creator = creators.find((entry) => entry.isCreator && entry.wallet) ?? creators.find((entry) => entry.wallet);
  const poolKey = pool?.dbcPoolKey || pool?.dammV2PoolKey || bagsMeta.dbcPoolKey || bagsMeta.dammV2PoolKey || null;
  const hasFeedProof = Boolean(bagsMeta.importedFromBags || bagsMeta.source === "token-launch/feed");
  const hasPoolProof = Boolean(pool || bagsMeta.poolVerified || poolKey);
  const hasCreatorProof = Boolean(creator?.wallet);
  const claimedFees24hLamports = sumClaimEventsLamports(claimEvents24h);
  const officialUpdates = socialRows.filter((row) => row.postType === "official" || row.postType === "launch").length;
  const uniqueSocialWallets = new Set(socialRows.map((row) => row.authorWallet).filter(Boolean)).size;
  const scoreBreakdown = {
    bagsSource: hasFeedProof || hasPoolProof ? 20 : 0,
    creatorProof: hasCreatorProof ? 20 : 0,
    feeEvidence: safeLifetimeFeesLamports > 0 ? 25 : 0,
    claimEvidence: claimEvents24h.length > 0 ? 15 : 0,
    socialProof: officialUpdates > 0 || uniqueSocialWallets >= 3 ? 10 : socialRows.length > 0 ? 5 : 0,
    marketProof: marketData ? 10 : 0,
  };
  const trustScore = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  const trustTags = [
    hasFeedProof ? "Bags Verified" : null,
    hasPoolProof ? "Pool Verified" : null,
    hasCreatorProof ? "Creator Verified" : null,
    safeLifetimeFeesLamports > 0 ? "Fee Active" : null,
    feeVelocity?.status === "active" ? "Velocity Active" : null,
    claimEvents24h.length > 0 ? "Claims Seen" : null,
    socialRows.length > 0 ? "Social Real" : null,
    marketData ? "Market Linked" : null,
  ].filter((tag): tag is string => Boolean(tag));
  const riskLabels = [
    !hasCreatorProof ? "No creator proof" : null,
    !hasPoolProof ? "No pool proof" : null,
    safeLifetimeFeesLamports <= 0 ? "Zero fees indexed" : null,
    socialRows.length >= 5 && safeLifetimeFeesLamports <= 0 ? "High social / zero fees" : null,
    !marketData ? "Stale or missing market data" : null,
    claimEvents24h.length === 0 ? "No claim events in 24h" : null,
    feeVelocity?.status !== "active" ? "Fee velocity baseline warming" : null,
  ].filter((risk): risk is string => Boolean(risk));

  return NextResponse.json({
    token: {
      mint: params.mint,
      name: token?.name ?? marketData?.name ?? `Bags ${params.mint.slice(0, 4)}`,
      symbol: token?.symbol ?? marketData?.symbol ?? "BAGS",
      description: token?.description ?? null,
      imageUrl: normalizeImageUrl(token?.imageUrl) ?? normalizeImageUrl(marketData?.logoURI),
      launchStatus: token?.launchStatus ?? "live",
      creatorWallet: token?.creatorWallet ?? creator?.wallet ?? null,
      launchedAt: token?.launchedAt ?? token?.createdAt ?? null,
    },
    market: marketData
      ? {
          price: marketData.price,
          marketCap: marketData.mc,
          liquidity: marketData.liquidity,
          volume24h: marketData.v24h,
          txns24h: marketData.txns24h,
          buys24h: marketData.buys24h,
          sells24h: marketData.sells24h,
          traders24h: marketData.traders24h,
          priceChange5mPercent: marketData.priceChange5mPercent,
          priceChange1hPercent: marketData.priceChange1hPercent,
          priceChange6hPercent: marketData.priceChange6hPercent,
          priceChange24hPercent: marketData.priceChange24hPercent,
          pairAddress: marketData.pairAddress ?? null,
          pairCreatedAt: marketData.pairCreatedAt ?? null,
          dexId: marketData.dexId ?? null,
        }
      : null,
    fees: {
      lifetimeFeesLamports: safeLifetimeFeesLamports,
      claimedFees24hLamports,
      feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports ?? null,
      feeVelocityStatus: feeVelocity?.status ?? "unavailable",
      baselineSnapshotAt: feeVelocity?.baselineSnapshotAt ?? null,
      currentSnapshotAt: feeVelocity?.currentSnapshotAt ?? null,
    },
    proof: {
      bagsFeed: hasFeedProof,
      pool: hasPoolProof,
      creator: hasCreatorProof,
      poolKey,
      sourceLabels: {
        token: hasFeedProof ? "Bags feed" : sourceStatus(bagsMeta.source),
        pool: hasPoolProof ? "Bags pool" : "pending",
        market: marketData ? "DexScreener" : "pending",
        fees: lifetimeFeesRaw != null ? "Bags fees" : "pending",
        velocity: feeVelocity?.status === "active" ? "fee snapshots" : feeVelocityValue(feeVelocity?.status, feeVelocity?.feeVelocity24hLamports),
      },
    },
    trustProfile: {
      trustScore,
      scoreBreakdown,
      trustTags,
      riskLabels,
      sourceLabels: {
        bagsSource: hasFeedProof ? "Bags feed" : hasPoolProof ? "Bags pool" : "pending",
        creatorProof: hasCreatorProof ? "Bags creators/admin API" : "pending",
        feeEvidence: lifetimeFeesRaw != null ? "Bags lifetime fees" : "pending",
        claimEvidence: claimEvents24h.length > 0 ? "Bags claim events" : "pending",
        socialProof: socialRows.length > 0 ? "token-linked Square posts" : "pending",
        marketProof: marketData ? "DexScreener" : "pending",
      },
      noFakeData: true,
    },
    links: {
      solscanMint: `https://solscan.io/token/${params.mint}`,
      bagsToken: `https://bags.fm/token/${params.mint}`,
      dexScreener: marketData?.pairAddress ? `https://dexscreener.com/solana/${marketData.pairAddress}` : null,
      pool: poolKey ? `https://solscan.io/account/${poolKey}` : null,
      creator: creator?.wallet ? `https://solscan.io/account/${creator.wallet}` : null,
      creatorProfile: creator?.wallet ? `/profile/${creator.wallet}` : token?.creatorWallet ? `/profile/${token.creatorWallet}` : null,
    },
    source: {
      token: token ? "local_token_db" : "derived_from_live_sources",
      market: marketData ? "dexscreener" : null,
      fees: lifetimeFeesRaw != null ? "bags_api" : null,
      proof: hasPoolProof ? "bags_pool" : hasFeedProof ? "bags_feed" : null,
      generatedAt: new Date().toISOString(),
    },
  });
}
