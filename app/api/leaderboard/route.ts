export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { count, desc, eq, sum } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { posts, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import {
  type BagsLaunchFeedItem,
  type BagsPool,
  getBagsClaimEvents,
  getBagsCreators,
  getBagsLaunchFeed,
  getBagsLifetimeFees,
  getBagsPools,
  getBagsPoolByMint,
} from "@/lib/bags-index";
import { getMultiTokenOverviews } from "@/lib/birdeye";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { rateLimit } from "@/lib/rate-limit";
import { buildStableFeeFields, getUsdtPricing } from "@/lib/stable-fees";

let cached: { at: number; data: unknown } | null = null;
let lastGoodCached: { at: number; data: unknown } | null = null;
const CACHE_MS = 60_000;
const SCAN_LIMIT = 150;

type IndexedRow = {
  mint: string;
  creatorWallet?: string | null;
  name: string;
  symbol: string;
  description?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  telegramUrl?: string | null;
  launchStatus: string;
  metadata: unknown;
  createdAt: Date | string;
  launchedAt?: Date | string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function withGracefulFailure<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.warn(
      "[leaderboard] live Bags universe unavailable",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}

function readBagsMeta(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const root = metadata as Record<string, unknown>;
  const bags = root.bags;
  return bags && typeof bags === "object" && !Array.isArray(bags)
    ? bags as Record<string, unknown>
    : {};
}

function sumClaimEventsLamports(events: Array<{ amount?: string }>) {
  return events.reduce((sum, event) => {
    const value = Number(event.amount ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
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

function hasCachedBagsProof(metadata: unknown) {
  const bagsMeta = readBagsMeta(metadata);
  return Boolean(
    bagsMeta.importedFromBags ||
    bagsMeta.poolVerified ||
    bagsMeta.dbcPoolKey ||
    bagsMeta.dbcConfigKey ||
    bagsMeta.dammV2PoolKey
  );
}

async function getCachedBagsRows(limit: number) {
  const rows = await db
    .select()
    .from(tokens)
    .where(eq(tokens.launchStatus, "live"))
    .orderBy(desc(tokens.launchedAt))
    .limit(limit);
  return rows
    .filter((row) => hasCachedBagsProof(row.metadata))
    .map((row) => ({ ...row, launchStatus: row.launchStatus ?? "live" }));
}

function bagsStatusToLaunchStatus(status?: string) {
  if (!status) return "live";
  const s = status.toUpperCase();
  if (s.includes("PRE") || s.includes("MIGRATED") || s.includes("LIVE")) return "live";
  if (s.includes("PENDING")) return "pending";
  if (s.includes("DRAFT")) return "draft";
  return "live";
}

function feedItemToRow(item: BagsLaunchFeedItem): IndexedRow | null {
  if (!item.tokenMint) return null;
  return {
    mint: item.tokenMint,
    creatorWallet: null,
    name: item.name?.trim() || `Bags ${item.tokenMint.slice(0, 4)}`,
    symbol: (item.symbol?.trim() || "BAGS").slice(0, 12),
    description: item.description ?? null,
    imageUrl: normalizeImageUrl(item.image),
    websiteUrl: item.website ?? null,
    twitterUrl: item.twitter ?? null,
    telegramUrl: null,
    launchStatus: bagsStatusToLaunchStatus(item.status),
    metadata: {
      source: "bags_feed",
      bags: {
        source: "token-launch/feed",
        importedFromBags: true,
        bagsStatus: item.status ?? null,
        launchSignature: item.launchSignature ?? null,
        dbcPoolKey: item.dbcPoolKey ?? null,
        dbcConfigKey: item.dbcConfigKey ?? null,
        accountKeys: item.accountKeys ?? null,
        uri: item.uri ?? null,
      },
    },
    createdAt: new Date().toISOString(),
    launchedAt: new Date().toISOString(),
  };
}

function poolToRow(pool: BagsPool): IndexedRow | null {
  if (!pool.tokenMint) return null;
  return {
    mint: pool.tokenMint,
    creatorWallet: null,
    name: `Bags ${pool.tokenMint.slice(0, 4)}`,
    symbol: "BAGS",
    description: null,
    imageUrl: null,
    websiteUrl: null,
    twitterUrl: null,
    telegramUrl: null,
    launchStatus: "live",
    metadata: {
      source: "bags_pool",
      bags: {
        source: "solana/bags/pools",
        importedFromBags: true,
        poolVerified: true,
        dbcPoolKey: pool.dbcPoolKey ?? null,
        dbcConfigKey: pool.dbcConfigKey ?? null,
        dammV2PoolKey: pool.dammV2PoolKey ?? null,
      },
    },
    createdAt: new Date().toISOString(),
    launchedAt: new Date().toISOString(),
  };
}

function mergePoolProof(row: IndexedRow, pool: BagsPool): IndexedRow {
  const meta = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {};
  const bags = readBagsMeta(row.metadata);
  return {
    ...row,
    metadata: {
      ...meta,
      bags: {
        ...bags,
        poolVerified: true,
        dbcPoolKey: bags.dbcPoolKey ?? pool.dbcPoolKey ?? null,
        dbcConfigKey: bags.dbcConfigKey ?? pool.dbcConfigKey ?? null,
        dammV2PoolKey: bags.dammV2PoolKey ?? pool.dammV2PoolKey ?? null,
      },
    },
  };
}

function buildBagsUniverse(feed: BagsLaunchFeedItem[], pools: BagsPool[]) {
  const byMint = new Map<string, IndexedRow>();
  for (const item of feed) {
    const row = feedItemToRow(item);
    if (row) byMint.set(row.mint, row);
  }
  for (const pool of pools) {
    const existing = byMint.get(pool.tokenMint);
    if (existing) {
      byMint.set(pool.tokenMint, mergePoolProof(existing, pool));
      continue;
    }
    const row = poolToRow(pool);
    if (row) byMint.set(row.mint, row);
  }
  return Array.from(byMint.values());
}

async function getLiveBagsUniverseRows(limit: number) {
  const [feed, pools] = await Promise.all([
    getBagsLaunchFeed(),
    getBagsPools(true),
  ]);
  const universe = buildBagsUniverse(feed, pools);
  return {
    rows: universe.slice(0, limit),
    total: universe.length,
    feedCount: feed.length,
    poolCount: pools.length,
  };
}

export async function GET(req: NextRequest) {
  noStore();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`lb:${ip}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.data);
  }

  let universe = await withTimeout(
    withGracefulFailure(getLiveBagsUniverseRows(SCAN_LIMIT), null),
    7_000,
    null
  );
  let liveTokens = universe?.rows ?? [];
  let indexSource = "bags_universe";
  if (!liveTokens.length) {
    if (lastGoodCached) {
      return NextResponse.json({
        ...(lastGoodCached.data as Record<string, unknown>),
        degraded: true,
        stale: true,
        warning: "Live Bags API is rate-limited; serving last successful leaderboard snapshot.",
      });
    }

    liveTokens = await getCachedBagsRows(SCAN_LIMIT);
    indexSource = "verified_bags_cache";
    universe = { rows: liveTokens, total: liveTokens.length, feedCount: 0, poolCount: 0 };
  }
  if (!liveTokens.length) {
    return NextResponse.json(
      { tokens: [], source: "bags_feed", degraded: true, error: "No Bags tokens returned by the Bags feed or verified cache" },
      { status: 503 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;
  const [market, pricing] = await Promise.all([
    withTimeout(getMultiTokenOverviews(liveTokens.map((token) => token.mint)), 5_000, {}),
    withTimeout(getUsdtPricing(), 2_500, {
      solPriceUsdt: 150,
      usdtSource: "dexscreener_sol_usdt" as const,
      usdtApproximate: true as const,
    }),
  ]);

  const enriched = await Promise.allSettled(
    liveTokens.slice(0, 60).map(async (t) => {
      const [social] = await db
        .select({
          postCount: count(posts.id),
          totalLikes: sum(posts.likesCount),
          totalComments: sum(posts.commentsCount),
          totalReposts: sum(posts.repostsCount),
        })
        .from(posts)
        .where(eq(posts.tokenMint, t.mint));

      const socialScore =
        Number(social?.postCount ?? 0) * 3 +
        Number(social?.totalLikes ?? 0) +
        Number(social?.totalComments ?? 0) * 2 +
        Number(social?.totalReposts ?? 0) * 3;

      const bagsMeta = readBagsMeta(t.metadata);
      const [lifetimeFees, creators, pool, claimEvents24h] = await Promise.all([
        withTimeout(getBagsLifetimeFees(t.mint), 2_500, null),
        withTimeout(getBagsCreators(t.mint), 2_500, []),
        withTimeout(getBagsPoolByMint(t.mint), 2_500, null),
        withTimeout(getBagsClaimEvents(t.mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
      ]);

      const feeLamports = Number(lifetimeFees ?? bagsMeta.lifetimeFees ?? 0);
      const safeFeeLamports = Number.isFinite(feeLamports) ? feeLamports : 0;
      const velocity = await withTimeout(getFeeVelocity24h(t.mint, Number.isFinite(feeLamports) ? feeLamports : 0), 2_500, null);
      const claimedFees24hLamports = sumClaimEventsLamports(claimEvents24h);
      const creator = creators.find((c) => c.isCreator && c.wallet) ?? creators.find((c) => c.wallet);
      const poolVerified = Boolean(
        pool ||
        bagsMeta.poolVerified ||
        bagsMeta.dbcPoolKey ||
        bagsMeta.dbcConfigKey ||
        bagsMeta.dammV2PoolKey
      );

      return {
        ...t,
        name: t.name.startsWith("Bags ") && market[t.mint]?.name ? market[t.mint].name : t.name,
        symbol: t.symbol === "BAGS" && market[t.mint]?.symbol ? market[t.mint].symbol.slice(0, 12) : t.symbol,
        imageUrl: t.imageUrl ?? normalizeImageUrl(market[t.mint]?.logoURI),
        creatorWallet: t.creatorWallet ?? creator?.wallet ?? null,
        totalFeesLamports: safeFeeLamports,
        claimedFees24hLamports,
        feeVelocity24hLamports: velocity?.feeVelocity24hLamports ?? null,
        feeVelocityStatus: velocity?.status ?? "unavailable",
        feeVelocity: velocity,
        solPriceUsdt: pricing.solPriceUsdt,
        usdtSource: pricing.usdtSource,
        usdtApproximate: pricing.usdtApproximate,
        ...buildStableFeeFields({
          solPriceUsdt: pricing.solPriceUsdt,
          lifetimeFeesLamports: safeFeeLamports,
          feeVelocity24hLamports: velocity?.feeVelocity24hLamports,
          claimedFees24hLamports,
          creatorFeeLamports: Math.floor(safeFeeLamports * 0.75),
          platformFeeLamports: Math.ceil(safeFeeLamports * 0.25),
        }),
        price: market[t.mint]?.price ?? null,
        volume24h: market[t.mint]?.v24h ?? null,
        marketCap: market[t.mint]?.mc ?? null,
        creators,
        socialScore,
        poolVerified,
        metricSource: {
          token: indexSource,
          proof: poolVerified ? "bags_pool" : "bags_feed",
          fees: "bags_api",
          claimed24h: "bags_claim_events",
          feeVelocity24h: velocity?.status === "active" ? "fee_snapshots" : "fee_snapshots_pending",
          usdt: pricing.usdtSource,
        },
        reputationScore:
          safeFeeLamports / 1e9 * 10 +
          Number(velocity?.feeVelocity24hLamports ?? 0) / 1e9 * 15 +
          claimedFees24hLamports / 1e9 * 12 +
          socialScore +
          (poolVerified ? 15 : 0),
      };
    })
  );

  const rows = enriched
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean)
    .sort((a, b) => {
      const feeDiff = (b!.totalFeesLamports ?? 0) - (a!.totalFeesLamports ?? 0);
      return feeDiff !== 0 ? feeDiff : (b!.socialScore ?? 0) - (a!.socialScore ?? 0);
    });

  const payload = {
    tokens: rows,
    source: indexSource,
    total: universe?.total ?? rows.length,
    scanned: liveTokens.length,
    ranked: rows.length,
    coverage: {
      feedCount: universe?.feedCount ?? 0,
      migratedPoolCount: universe?.poolCount ?? 0,
      feeVelocityActiveCount: rows.filter((row) => row?.feeVelocityStatus === "active").length,
    },
    solPriceUsdt: pricing.solPriceUsdt,
    usdtSource: pricing.usdtSource,
    usdtApproximate: pricing.usdtApproximate,
    degraded: indexSource !== "bags_universe",
  };
  cached = { at: Date.now(), data: payload };
  if (indexSource === "bags_universe") lastGoodCached = cached;
  return NextResponse.json(payload);
}
