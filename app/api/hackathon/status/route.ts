import { NextResponse } from "next/server";
import { count, desc, sql } from "drizzle-orm";
import { feeSnapshots, rewardCampaigns, tokens } from "@/db/schema";
import { getBagsLaunchFeed, getBagsPools } from "@/lib/bags-index";
import { db } from "@/lib/db";
import { getMultiTokenOverviews } from "@/lib/birdeye";
import { getRestreamReadiness } from "@/lib/restream";
import { getTrustSignalsLive } from "@/lib/trust-signals-live";

export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

function hasBagsProof(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const root = metadata as Record<string, unknown>;
  const bags = root.bags && typeof root.bags === "object" && !Array.isArray(root.bags)
    ? root.bags as Record<string, unknown>
    : {};
  return Boolean(bags.importedFromBags || bags.poolVerified || bags.dbcPoolKey || bags.dammV2PoolKey);
}

function eventTimeMs(event: unknown) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  const row = event as Record<string, unknown>;
  const candidate = row.timestamp ?? row.createdAt ?? row.launchedAt ?? row.launchTime;
  if (typeof candidate === "number") return candidate > 10_000_000_000 ? candidate : candidate * 1000;
  if (typeof candidate === "string") {
    const parsed = new Date(candidate).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function GET() {
  const [indexedRows, tokenCountRow, campaignCountRow, latestSnapshotRows, feed, pools, trustSignals] = await Promise.all([
    db.select().from(tokens).orderBy(desc(tokens.launchedAt)).limit(60),
    db.select({ value: count(tokens.mint) }).from(tokens),
    db.select({ value: count(rewardCampaigns.id) }).from(rewardCampaigns),
    db.select({
      snapshotHour: feeSnapshots.snapshotHour,
      total: sql<number>`count(*)`,
    }).from(feeSnapshots).groupBy(feeSnapshots.snapshotHour).orderBy(desc(feeSnapshots.snapshotHour)).limit(1),
    withTimeout(getBagsLaunchFeed(), 4_000, []),
    withTimeout(getBagsPools(true), 4_000, []),
    withTimeout(getTrustSignalsLive(12), 6_000, null),
  ]);

  const market = await withTimeout(
    getMultiTokenOverviews(indexedRows.slice(0, 30).map((row) => row.mint)),
    4_000,
    {}
  );
  const bagsProofCount = indexedRows.filter((row) => hasBagsProof(row.metadata)).length;
  const latestSnapshot = latestSnapshotRows[0] ?? null;
  const snapshotAgeMs = latestSnapshot?.snapshotHour ? Date.now() - new Date(latestSnapshot.snapshotHour).getTime() : null;
  const latestLiveEventMs = eventTimeMs(feed[0]);
  const restream = getRestreamReadiness();
  const persistedLiveLaunches = indexedRows.filter((row) => {
    if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return false;
    const root = row.metadata as Record<string, unknown>;
    const bags = root.bags && typeof root.bags === "object" && !Array.isArray(root.bags)
      ? root.bags as Record<string, unknown>
      : {};
    return bags.restream === true || bags.source === "restream";
  }).length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    bagsApi: {
      reachable: feed.length > 0 || pools.length > 0,
      feedCount: feed.length,
      migratedPoolCount: pools.length,
      rateLimitAware: true,
    },
    index: {
      indexedTokenCount: Number(tokenCountRow[0]?.value ?? 0),
      recentProofCount: bagsProofCount,
      recentRowsSampled: indexedRows.length,
    },
    market: {
      source: "dexscreener",
      sampled: Math.min(indexedRows.length, 30),
      marketCoverage: Object.keys(market).length,
    },
    fees: {
      snapshotFreshness: latestSnapshot?.snapshotHour?.toISOString?.() ?? null,
      snapshotAgeMinutes: snapshotAgeMs == null ? null : Math.round(snapshotAgeMs / 60_000),
      latestSnapshotTokenCount: Number(latestSnapshot?.total ?? 0),
    },
    social: {
      socialProofEndpoint: "active",
      campaigns: Number(campaignCountRow[0]?.value ?? 0),
      noFakeDataPolicy: true,
    },
    publicApi: {
      status: "active",
      readOnly: true,
      cacheSeconds: 60,
      noFakeData: true,
      endpoints: [
        "/api/public/token/[mint]/trust",
        "/api/public/token/[mint]/passport",
        "/api/public/creator/[wallet]/trust",
        "/embed/trust/[mint]",
      ],
      embedFramePolicy: "Content-Security-Policy: frame-ancestors *",
    },
    trustLayerPolicies: {
      noFakeData: true,
      tokenLinkedSocialOnly: true,
      walletSignatureAuth: true,
      serverOnlyKeys: true,
      rateLimits: true,
      publicTrustApiReadOnly: true,
      offTrackRoutesExcludedFromPrimaryFlow: true,
      restreamWorkerReadiness: process.env.BAGS_RESTREAM_WORKER_URL ? "configured" : "planned_external_worker",
    },
    restream,
    restreamWorker: {
      desired: true,
      status: process.env.BAGS_RESTREAM_WORKER_URL ? "configured" : "planned",
      externalRuntime: "Railway/Fly worker",
      websocket: restream.endpoint,
      event: restream.event,
      envReady: Boolean(process.env.BAGS_RESTREAM_WORKER_URL),
      workerUrl: process.env.BAGS_RESTREAM_WORKER_URL ?? null,
      nextStep: "Run a persistent websocket worker outside Next.js and persist launch events into the indexed token cache.",
    },
    liveFeed: {
      endpoint: "/api/bags/live",
      sseEndpoint: "/api/bags/live?stream=1",
      mode: "bags_feed_polling_sse_fallback",
      lastEventAt: latestLiveEventMs ? new Date(latestLiveEventMs).toISOString() : null,
      lastEventAgeSeconds: latestLiveEventMs ? Math.max(0, Math.round((Date.now() - latestLiveEventMs) / 1000)) : null,
      persistedLiveLaunches,
      recentLaunches: feed.slice(0, 5).map((item) => ({
        mint: item.tokenMint,
        symbol: item.symbol ?? "BAGS",
        status: item.status ?? "live",
      })),
    },
    trustSignals: trustSignals ? {
      endpoint: "/api/trust-signals/live",
      sseEndpoint: "/api/trust-signals/live?stream=1",
      mode: trustSignals.mode,
      noFakeData: trustSignals.noFakeData,
      coverage: trustSignals.coverage,
      recentSignals: trustSignals.signals.slice(0, 5).map((signal) => ({
        mint: signal.mint,
        label: signal.label,
        status: signal.status,
        category: signal.category,
        href: signal.href,
        passportHref: signal.passportHref,
      })),
    } : {
      endpoint: "/api/trust-signals/live",
      sseEndpoint: "/api/trust-signals/live?stream=1",
      mode: "unavailable",
      noFakeData: true,
      coverage: { tokensSampled: 0, signals: 0, verified: 0, warming: 0, risk: 0, campaigns: 0 },
      recentSignals: [],
    },
  });
}
