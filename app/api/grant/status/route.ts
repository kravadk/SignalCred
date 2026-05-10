import { NextResponse } from "next/server";
import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { feeSnapshots, posts, rewardCampaigns, tokens } from "@/db/schema";
import { getBagsLaunchFeed, getBagsPools } from "@/lib/bags-index";
import { db } from "@/lib/db";
import { dev3packResourceComparison, dev3packResourceGroups } from "@/lib/dev3pack-resources";
import { getRestreamReadiness } from "@/lib/restream";

export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

function hasPoolProof(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const root = metadata as Record<string, unknown>;
  const bags = root.bags && typeof root.bags === "object" && !Array.isArray(root.bags)
    ? root.bags as Record<string, unknown>
    : {};
  return Boolean(bags.poolVerified || bags.dbcPoolKey || bags.dammV2PoolKey);
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

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    indexedRows,
    tokenCountRow,
    feed,
    pools,
    latestSnapshotRows,
    activeVelocityRows,
    warmingSnapshotRows,
    tokenLinkedPostsRows,
    officialPostsRows,
    socialProofTokenRows,
    campaignRows,
  ] = await Promise.all([
    db.select().from(tokens).orderBy(desc(tokens.launchedAt)).limit(500),
    db.select({ value: count(tokens.mint) }).from(tokens),
    withTimeout(getBagsLaunchFeed(), 4_000, []),
    withTimeout(getBagsPools(true), 4_000, []),
    db.select({
      snapshotHour: feeSnapshots.snapshotHour,
      tokenCount: sql<number>`count(distinct ${feeSnapshots.tokenMint})`,
    }).from(feeSnapshots).groupBy(feeSnapshots.snapshotHour).orderBy(desc(feeSnapshots.snapshotHour)).limit(1),
    db.select({ value: sql<number>`count(distinct ${feeSnapshots.tokenMint})` }).from(feeSnapshots).where(sql`${feeSnapshots.snapshotHour} <= ${cutoff}`),
    db.select({ value: sql<number>`count(distinct ${feeSnapshots.tokenMint})` }).from(feeSnapshots),
    db.select({ value: count(posts.id) }).from(posts).where(isNotNull(posts.tokenMint)),
    db.select({ value: count(posts.id) }).from(posts).where(eq(posts.postType, "official")),
    db.select({ value: sql<number>`count(distinct ${posts.tokenMint})` }).from(posts).where(isNotNull(posts.tokenMint)),
    db.select().from(rewardCampaigns),
  ]);

  const indexedTokens = Number(tokenCountRow[0]?.value ?? 0);
  const poolProofCount = indexedRows.filter((row) => hasPoolProof(row.metadata)).length;
  const creatorProofCount = indexedRows.filter((row) => Boolean(row.creatorWallet)).length;
  const latestSnapshot = latestSnapshotRows[0] ?? null;
  const snapshotAgeMs = latestSnapshot?.snapshotHour ? Date.now() - new Date(latestSnapshot.snapshotHour).getTime() : null;
  const latestLiveEventMs = eventTimeMs(feed[0]);
  const restream = getRestreamReadiness();
  const activeVelocityCount = Number(activeVelocityRows[0]?.value ?? 0);
  const tokensWithSnapshots = Number(warmingSnapshotRows[0]?.value ?? 0);
  const fundedCampaigns = campaignRows.filter((row) => row.status === "funded" || Boolean(row.fundingTxSignature));
  const plannedCampaigns = campaignRows.filter((row) => row.status === "planned");
  const persistedLiveLaunches = indexedRows.filter((row) => {
    if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return false;
    const root = row.metadata as Record<string, unknown>;
    const bags = root.bags && typeof root.bags === "object" && !Array.isArray(root.bags)
      ? root.bags as Record<string, unknown>
      : {};
    return bags.restream === true || bags.source === "restream";
  }).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    bags: {
      indexedTokens,
      feedCount: feed.length,
      poolCount: pools.length,
      poolCoveragePercent: pct(poolProofCount, Math.max(indexedRows.length, 1)),
      creatorProofCoveragePercent: pct(creatorProofCount, Math.max(indexedRows.length, 1)),
      source: "DB indexed tokens + Bags feed/pools APIs",
      freshness: "request-time with external API timeout guards",
    },
    fees: {
      latestSnapshotAt: latestSnapshot?.snapshotHour?.toISOString?.() ?? null,
      snapshotAgeMinutes: snapshotAgeMs == null ? null : Math.max(0, Math.round(snapshotAgeMs / 60_000)),
      feeVelocityActiveCount: activeVelocityCount,
      baselineWarmingCount: Math.max(0, tokensWithSnapshots - activeVelocityCount),
      source: "fee_snapshots hourly cache",
      freshness: latestSnapshot?.snapshotHour?.toISOString?.() ?? "no snapshot yet",
    },
    live: {
      restreamConfigured: Boolean(process.env.BAGS_RESTREAM_WORKER_URL),
      restreamConnected: false,
      restreamStatus: process.env.BAGS_RESTREAM_WORKER_URL ? "configured_external_worker" : restream.status,
      lastEventAt: latestLiveEventMs ? new Date(latestLiveEventMs).toISOString() : null,
      lastEventAgeSeconds: latestLiveEventMs ? Math.max(0, Math.round((Date.now() - latestLiveEventMs) / 1000)) : null,
      persistedLiveLaunches,
      websocket: restream.endpoint,
      event: restream.event,
      source: "Bags ReStream readiness + Bags feed fallback",
    },
    social: {
      tokenLinkedPosts: Number(tokenLinkedPostsRows[0]?.value ?? 0),
      officialUpdates: Number(officialPostsRows[0]?.value ?? 0),
      socialProofTokens: Number(socialProofTokenRows[0]?.value ?? 0),
      source: "token-linked Square posts",
      freshness: "database live query",
    },
    campaigns: {
      planned: plannedCampaigns.length,
      funded: fundedCampaigns.length,
      plannedBudgetUsdt: plannedCampaigns.reduce((sum, row) => sum + money(row.budgetUsdt), 0),
      fundedBudgetUsdt: fundedCampaigns.reduce((sum, row) => sum + money(row.budgetUsdt), 0),
      source: "reward_campaigns planned/funding-proof rows",
      noAutomaticPayouts: true,
    },
    publicApi: {
      tokenTrustEndpoint: "available",
      creatorTrustEndpoint: "available",
      embedEndpoint: "available",
      tokenTrustHref: "/api/public/token/[mint]/trust",
      creatorTrustHref: "/api/public/creator/[wallet]/trust",
      embedHref: "/embed/trust/[mint]",
      cacheSeconds: 60,
      readOnly: true,
    },
    qvac: {
      enabled: process.env.QVAC_ENABLED === "true",
      serviceStatus: process.env.QVAC_SERVICE_URL ? "configured" : "optional",
      publicGateway: "/api/qvac",
      privateReview: true,
      cloudFallback: false,
      runtime: "QVAC service behind SignalCred API gateway",
      capabilities: ["private LLM trust review", "evidence embeddings/RAG", "translation", "proof-note drafting"],
      productSurfaces: ["/passport/[mint]", "/token/[mint]", "/profile/[wallet]", "/square", "/grant/status"],
      privacyPolicy: "SignalCred sends only public proof evidence to the QVAC review service. Wallet secrets, seed phrases, RPC URLs, and API keys are blocked.",
      source: "Tether QVAC review gateway",
    },
    builderResources: {
      source: "Dev3pack Resources mapped into SignalCred product decisions",
      categories: dev3packResourceGroups,
      comparison: dev3packResourceComparison,
    },
    passports: {
      availableCount: indexedTokens,
      endpoint: "/passport/[mint]",
      generatedOnDemand: true,
      source: "shared trust passport builder",
    },
    policies: {
      noFakeData: true,
      serverOnlyKeys: true,
      signatureAuthForWrites: true,
      rateLimits: true,
      tokenLinkedSocialOnly: true,
      publicApiReadOnly: true,
    },
    links: {
      grantStatus: "/grant/status",
      tokenIndex: "/token",
      fees: "/fees",
      square: "/square",
      docs: "/docs",
      passportPattern: "/passport/[mint]",
      publicTrustApi: "/api/public/token/[mint]/trust",
    },
    noFakeData: true,
  });
}
