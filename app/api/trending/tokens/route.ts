import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { posts, tokens } from "@/db/schema";
import { desc, eq, count, sum } from "drizzle-orm";
import { getMultiTokenOverviews } from "@/lib/birdeye";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { unstable_noStore as noStore } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import {
  type BagsLaunchFeedItem,
  type BagsPool,
  getBagsClaimEvents,
  getBagsLaunchFeed,
  getBagsLifetimeFees,
  getBagsPools,
  getBagsPoolByMint,
} from "@/lib/bags-index";

export const dynamic = "force-dynamic";

let cached: { at: number; data: unknown } | null = null;
let lastGoodCached: { at: number; data: unknown } | null = null;
const CACHE_MS = 60_000;
const DEFAULT_LIMIT = 150;
const MAX_LIMIT = 250;

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

type BagsUniverseResult = {
  rows: IndexedRow[];
  total: number;
  feedCount: number;
  poolCount: number;
  source: "bags_universe" | "verified_bags_cache";
  warning?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function withGracefulBagsFailure<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.warn(
      "[bags-index] live Bags universe unavailable",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
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

function hasCachedBagsProof(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const root = metadata as Record<string, unknown>;
  const bags = root.bags && typeof root.bags === "object" && !Array.isArray(root.bags)
    ? root.bags as Record<string, unknown>
    : {};
  return Boolean(
    bags.importedFromBags ||
    bags.poolVerified ||
    bags.dbcPoolKey ||
    bags.dbcConfigKey ||
    bags.dammV2PoolKey
  );
}

async function getCachedBagsRows(limit: number) {
  if (!isDatabaseConfigured()) return [];
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
    bagsLaunchId: item.launchSignature ?? null,
    partnerConfig: item.dbcConfigKey ?? null,
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
  } as IndexedRow;
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
  const bags = meta.bags && typeof meta.bags === "object" && !Array.isArray(meta.bags)
    ? meta.bags as Record<string, unknown>
    : {};
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

async function getLiveBagsUniverseRows(offset: number, limit: number): Promise<BagsUniverseResult> {
  const [feed, pools] = await Promise.all([
    getBagsLaunchFeed(),
    getBagsPools(true),
  ]);
  const universe = buildBagsUniverse(feed, pools);
  return {
    rows: universe.slice(offset, offset + limit),
    total: universe.length,
    feedCount: feed.length,
    poolCount: pools.length,
    source: "bags_universe",
  };
}

export async function GET(req: NextRequest) {
  noStore();

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rl = rateLimit(`trending:${ip}`, 30, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const limit = clampNumber(req.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT, 20, MAX_LIMIT);
  const offset = clampNumber(req.nextUrl.searchParams.get("offset"), 0, 0, 10_000);
  const cacheKey = `${limit}:${offset}`;

  if (cached && Date.now() - cached.at < CACHE_MS && (cached.data as { cacheKey?: string }).cacheKey === cacheKey) {
    return NextResponse.json(cached.data);
  }

  let universe = await withTimeout(
    withGracefulBagsFailure(getLiveBagsUniverseRows(offset, limit), null),
    7_000,
    null
  );
  if (!universe || !universe.rows.length) {
    if (lastGoodCached && (lastGoodCached.data as { cacheKey?: string }).cacheKey === cacheKey) {
      return NextResponse.json({
        ...(lastGoodCached.data as Record<string, unknown>),
        degraded: true,
        stale: true,
        warning: "Live Bags API is rate-limited; serving last successful live snapshot.",
      });
    }

    const cachedRows = await getCachedBagsRows(limit).catch(() => []);
    universe = {
      rows: cachedRows,
      total: cachedRows.length,
      feedCount: 0,
      poolCount: 0,
      source: "verified_bags_cache",
      warning: "Live Bags API unavailable or rate-limited; serving verified Bags cache.",
    };
  }
  const rows = universe.rows;
  const indexSource = universe.source;

  if (!rows.length) {
    return NextResponse.json(
      { tokens: [], source: "bags_feed", degraded: true, error: "No live Bags tokens returned by the Bags feed or verified cache" },
      { status: 503 }
    );
  }

  const socialScores = isDatabaseConfigured()
    ? await Promise.allSettled(rows.map(async (t) => {
      const [postStats] = await db
        .select({
          postCount: count(posts.id),
          totalLikes: sum(posts.likesCount),
          totalComments: sum(posts.commentsCount),
        })
        .from(posts)
        .where(eq(posts.tokenMint, t.mint));

      const pCount = postStats?.postCount ?? 0;
      const likes = Number(postStats?.totalLikes ?? 0);
      const comments = Number(postStats?.totalComments ?? 0);
      // Social Score formula from TZ
      const score = pCount * 3 + likes * 1 + comments * 2;
      return { mint: t.mint, score };
    }))
    : [];

  const scoreMap = new Map<string, number>();
  socialScores.forEach((r) => {
    if (r.status === "fulfilled") scoreMap.set(r.value.mint, r.value.score);
  });

  let market: Awaited<ReturnType<typeof getMultiTokenOverviews>> = {};
  if (rows.length > 0) {
    market = await withTimeout(getMultiTokenOverviews(rows.map((r) => r.mint)), 5_000, {});
  }

  const proofResults = await Promise.allSettled(
    rows.map(async (t) => {
      const meta = t.metadata && typeof t.metadata === "object" && !Array.isArray(t.metadata)
        ? t.metadata as Record<string, unknown>
        : {};
      const bags = meta.bags && typeof meta.bags === "object" && !Array.isArray(meta.bags)
        ? meta.bags as Record<string, unknown>
        : {};
      const metadataProof = Boolean(
        bags.poolVerified ||
        bags.dbcPoolKey ||
        bags.dbcConfigKey ||
        bags.dammV2PoolKey
      );
      const livePool = metadataProof
        ? null
        : await withTimeout(getBagsPoolByMint(t.mint), 2_500, null);

      return [t.mint, Boolean(metadataProof || livePool)] as const;
    })
  );
  const proofMap = new Map<string, boolean>();
  proofResults.forEach((result) => {
    if (result.status === "fulfilled") proofMap.set(result.value[0], result.value[1]);
  });

  const feeWindowMints = rows.slice(0, 60).map((row) => row.mint);
  const since24h = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const feeResults = await Promise.allSettled(
    feeWindowMints.map(async (mint) => {
      const [lifetimeFees, claimEvents24h] = await Promise.all([
        withTimeout(getBagsLifetimeFees(mint), 2_500, null),
        withTimeout(getBagsClaimEvents(mint, { from: since24h, to: Math.floor(Date.now() / 1000), limit: 100 }), 2_500, []),
      ]);
      const lifetimeFeesLamports = Number(lifetimeFees ?? 0);
      const velocity = await withTimeout(getFeeVelocity24h(mint, lifetimeFeesLamports), 2_500, null);
      return [
        mint,
        {
          lifetimeFeesLamports,
          claimedFees24hLamports: sumClaimEventsLamports(claimEvents24h),
          feeVelocity24hLamports: velocity?.feeVelocity24hLamports ?? null,
          feeVelocityStatus: velocity?.status ?? "unavailable",
          feeVelocity: velocity,
          feeSource: "bags_api",
        },
      ] as const;
    })
  );
  const feeMap = new Map<string, {
    lifetimeFeesLamports: number;
    claimedFees24hLamports: number;
    feeVelocity24hLamports: number | null;
    feeVelocityStatus: string;
    feeVelocity: Awaited<ReturnType<typeof getFeeVelocity24h>> | null;
    feeSource: string;
  }>();
  feeResults.forEach((result) => {
    if (result.status === "fulfilled") feeMap.set(result.value[0], result.value[1]);
  });

  const enriched = rows
    .map((t) => {
      const meta = t.metadata && typeof t.metadata === "object" && !Array.isArray(t.metadata)
        ? t.metadata as Record<string, unknown>
        : {};
      const bags = meta.bags && typeof meta.bags === "object" && !Array.isArray(meta.bags)
        ? meta.bags as Record<string, unknown>
        : {};
      const metadataProof = Boolean(
        bags.poolVerified ||
        bags.dbcPoolKey ||
        bags.dbcConfigKey ||
        bags.dammV2PoolKey
      );
      const poolVerified = proofMap.get(t.mint) ?? metadataProof;

      return ({
      ...t,
      name: t.name.startsWith("Bags ") && market[t.mint]?.name ? market[t.mint].name : t.name,
      symbol: t.symbol === "BAGS" && market[t.mint]?.symbol ? market[t.mint].symbol.slice(0, 12) : t.symbol,
      imageUrl: t.imageUrl ?? normalizeImageUrl(market[t.mint]?.logoURI),
      price: market[t.mint]?.price ?? null,
      pairAddress: market[t.mint]?.pairAddress ?? null,
      pairCreatedAt: market[t.mint]?.pairCreatedAt ?? null,
      dexId: market[t.mint]?.dexId ?? null,
      priceChange5mPercent: market[t.mint]?.priceChange5mPercent ?? null,
      priceChange1hPercent: market[t.mint]?.priceChange1hPercent ?? null,
      priceChange6hPercent: market[t.mint]?.priceChange6hPercent ?? null,
      priceChange24hPercent: market[t.mint]?.priceChange24hPercent ?? null,
      volume5m: market[t.mint]?.v5m ?? null,
      volume1h: market[t.mint]?.v1h ?? null,
      volume6h: market[t.mint]?.v6h ?? null,
      volume24h: market[t.mint]?.v24h ?? null,
      txns24h: market[t.mint]?.txns24h ?? null,
      buys24h: market[t.mint]?.buys24h ?? null,
      sells24h: market[t.mint]?.sells24h ?? null,
      traders24h: market[t.mint]?.traders24h ?? null,
      marketCap: market[t.mint]?.mc ?? null,
      liquidity: market[t.mint]?.liquidity ?? null,
      lifetimeFeesLamports: feeMap.get(t.mint)?.lifetimeFeesLamports ?? null,
      claimedFees24hLamports: feeMap.get(t.mint)?.claimedFees24hLamports ?? null,
      feeVelocity24hLamports: feeMap.get(t.mint)?.feeVelocity24hLamports ?? null,
      feeVelocityStatus: feeMap.get(t.mint)?.feeVelocityStatus ?? "pending",
      feeVelocity: feeMap.get(t.mint)?.feeVelocity ?? null,
      metricSource: {
        token: indexSource,
        proof: poolVerified ? "bags_pool" : "bags_feed",
        market: market[t.mint] ? "dexscreener" : null,
        fees: feeMap.has(t.mint) ? "bags_api" : null,
      },
      bagsStatus: bags.bagsStatus ?? null,
      poolVerified,
      source: indexSource,
      socialScore: scoreMap.get(t.mint) ?? 0,
    });
    })
    .sort((a, b) => {
      const feeDiff = Number(b.lifetimeFeesLamports ?? 0) - Number(a.lifetimeFeesLamports ?? 0);
      return feeDiff !== 0 ? feeDiff : b.socialScore - a.socialScore;
    });

  const payload = {
    cacheKey,
    tokens: enriched,
    source: indexSource,
    count: enriched.length,
    total: universe.total,
    limit,
    offset,
    hasMore: offset + enriched.length < universe.total,
    coverage: {
      feedCount: universe.feedCount,
      migratedPoolCount: universe.poolCount,
      marketCount: enriched.filter((token) => token.metricSource.market === "dexscreener").length,
      volume24h: enriched.reduce((total, token) => total + Number(token.volume24h ?? 0), 0),
      txns24h: enriched.reduce((total, token) => total + Number(token.txns24h ?? 0), 0),
      feeVelocityActiveCount: enriched.filter((token) => token.feeVelocityStatus === "active").length,
    },
    degraded: indexSource !== "bags_universe",
    warning: universe.warning ?? null,
  };
  if (indexSource === "bags_universe") {
    cached = { at: Date.now(), data: payload };
    lastGoodCached = cached;
  }
  return NextResponse.json(payload);
  } catch (error) {
    console.warn("[api/trending/tokens] unavailable", error instanceof Error ? error.message : error);
    if (lastGoodCached) {
      return NextResponse.json({
        ...(lastGoodCached.data as Record<string, unknown>),
        degraded: true,
        stale: true,
        warning: "Token index is temporarily degraded; serving last successful snapshot.",
      });
    }
    return NextResponse.json({
      tokens: [],
      source: "unavailable",
      count: 0,
      total: 0,
      limit: DEFAULT_LIMIT,
      offset: 0,
      hasMore: false,
      coverage: {
        feedCount: 0,
        migratedPoolCount: 0,
        marketCount: 0,
        volume24h: 0,
        txns24h: 0,
        feeVelocityActiveCount: 0,
      },
      degraded: true,
      warning: "Token index is temporarily unavailable.",
    });
  }
}
