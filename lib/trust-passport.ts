import { count, eq, sum } from "drizzle-orm";
import { feeEvents, posts, rewardCampaigns, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getTokenOverview } from "@/lib/birdeye";
import {
  getBagsClaimEvents,
  getBagsCreators,
  getBagsLifetimeFees,
  getBagsPoolByMint,
  importBagsTokenByMint,
} from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { feeVelocityValue } from "@/lib/fee-velocity-display";
import { getUsdtPricing, lamportsToUsdt } from "@/lib/stable-fees";
import { formatLamports, formatUsd, shortWallet } from "@/lib/utils";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type TrustEvidenceStatus = "verified" | "pending" | "warming" | "warning" | "unavailable";

export type TrustEvidenceRow = {
  id: string;
  label: string;
  status: TrustEvidenceStatus;
  source: string;
  value: string;
  timestamp: string | null;
  evidenceUrl: string | null;
  explanation: string;
  rawReference?: {
    endpoint?: string;
    account?: string;
    signature?: string;
    pairAddress?: string;
  };
};

export type TrustRiskLabel = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  evidenceIds: string[];
};

export type TokenPassportResponse = {
  mint: string;
  token: {
    name: string;
    symbol: string;
    imageUrl: string | null;
    creatorWallet: string | null;
  };
  verdict: "verified" | "warming" | "risk_review" | "unavailable";
  trustScore: number;
  scoreBreakdown: Record<string, number | string>;
  evidence: TrustEvidenceRow[];
  riskLabels: TrustRiskLabel[];
  links: {
    tokenPage: string;
    bags: string;
    solscanMint: string;
    dexScreener: string | null;
    meteora: string | null;
    creatorProfile: string | null;
  };
  sourceLabels: Record<string, string>;
  noFakeData: true;
  generatedAt: string;
};

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

function safeNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function shortKey(value?: unknown) {
  return typeof value === "string" && value.length > 8 ? shortWallet(value) : null;
}

function evidence(row: TrustEvidenceRow): TrustEvidenceRow {
  return row;
}

function statusScore(status: TrustEvidenceStatus, points: number) {
  if (status === "verified") return points;
  if (status === "warming") return Math.round(points * 0.35);
  if (status === "warning") return Math.round(points * 0.2);
  return 0;
}

function deriveVerdict(score: number, risks: TrustRiskLabel[], evidenceRows: TrustEvidenceRow[]): TokenPassportResponse["verdict"] {
  if (evidenceRows.every((row) => row.status === "unavailable")) return "unavailable";
  if (risks.some((risk) => risk.severity === "high")) return "risk_review";
  if (score >= 75) return "verified";
  return "warming";
}

function firstSignature<T extends { signature?: string | null; txSignature?: string | null }>(rows: T[]) {
  return rows.find((row) => row.signature || row.txSignature)?.signature ?? rows.find((row) => row.txSignature)?.txSignature ?? null;
}

function countSocialScore(row: { postCount?: unknown; totalLikes?: unknown; totalComments?: unknown; totalReposts?: unknown } | null) {
  return (
    safeNumber(row?.postCount) * 3 +
    safeNumber(row?.totalLikes) +
    safeNumber(row?.totalComments) * 2 +
    safeNumber(row?.totalReposts) * 3
  );
}

export async function buildTokenPassport(mint: string): Promise<TokenPassportResponse | null> {
  if (!BASE58.test(mint)) return null;

  let token = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  if (!token) token = (await importBagsTokenByMint(mint)) ?? undefined;

  const bagsMeta = readBagsMeta(token?.metadata);
  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;

  const [
    pool,
    creators,
    lifetimeFeesRaw,
    claimEvents24h,
    claimEventsAll,
    market,
    social,
    campaigns,
    receipts,
    pricing,
  ] = await Promise.all([
    withTimeout(getBagsPoolByMint(mint), 2_500, null),
    withTimeout(getBagsCreators(mint), 2_500, []),
    withTimeout(getBagsLifetimeFees(mint), 2_500, null),
    withTimeout(getBagsClaimEvents(mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
    withTimeout(getBagsClaimEvents(mint, { limit: 25 }), 2_500, []),
    withTimeout(getTokenOverview(mint), 2_500, null),
    withTimeout(
      db
        .select({
          postCount: count(posts.id),
          totalLikes: sum(posts.likesCount),
          totalComments: sum(posts.commentsCount),
          totalReposts: sum(posts.repostsCount),
        })
        .from(posts)
        .where(eq(posts.tokenMint, mint))
        .then((rows) => rows[0] ?? null),
      2_500,
      null
    ),
    withTimeout(db.select().from(rewardCampaigns).where(eq(rewardCampaigns.tokenMint, mint)).limit(50), 2_500, []),
    withTimeout(db.select().from(feeEvents).where(eq(feeEvents.tokenMint, mint)).limit(25), 2_500, []),
    withTimeout(getUsdtPricing(), 2_500, { solPriceUsdt: 0, usdtSource: "dexscreener_sol_usdt" as const, usdtApproximate: true as const }),
  ]);

  const generatedAt = new Date().toISOString();
  const poolKey = pool?.dbcPoolKey || pool?.dammV2PoolKey || bagsMeta.dbcPoolKey || bagsMeta.dammV2PoolKey || bagsMeta.dbcConfigKey || null;
  const hasFeedProof = Boolean(bagsMeta.importedFromBags || bagsMeta.source === "token-launch/feed" || token?.bagsLaunchId);
  const hasPoolProof = Boolean(pool || bagsMeta.poolVerified || poolKey);
  const creator = creators.find((entry) => entry.isCreator && entry.wallet) ?? creators.find((entry) => entry.wallet);
  const creatorWallet = token?.creatorWallet ?? creator?.wallet ?? null;
  const lifetimeFeesLamports = safeNumber(lifetimeFeesRaw ?? bagsMeta.lifetimeFees);
  const feeVelocity = await withTimeout(getFeeVelocity24h(mint, lifetimeFeesLamports), 2_500, null);
  const claimed24hLamports = claimEvents24h.reduce((sum, event) => sum + safeNumber(event.amount), 0);
  const socialScore = countSocialScore(social);
  const firstClaimSig = firstSignature(claimEventsAll);
  const firstReceiptSig = receipts.find((row) => row.txSignature)?.txSignature ?? null;
  const fundedCampaign = campaigns.find((row) => row.fundingTxSignature);
  const plannedBudgetUsdt = campaigns.reduce((sum, row) => sum + safeNumber(row.budgetUsdt), 0);
  const fundedBudgetUsdt = campaigns
    .filter((row) => row.status === "funded" || row.fundingTxSignature)
    .reduce((sum, row) => sum + safeNumber(row.budgetUsdt), 0);
  const dexScreener = market?.pairAddress ? `https://dexscreener.com/solana/${market.pairAddress}` : null;
  const meteora = pool?.dammV2PoolKey ? `https://app.meteora.ag/pools/${pool.dammV2PoolKey}` : null;
  const solscanMint = `https://solscan.io/token/${mint}`;
  const bagsUrl = `https://bags.fm/${mint}`;

  const evidenceRows = [
    evidence({
      id: "bags-source",
      label: "Bags source proof",
      status: hasFeedProof || hasPoolProof ? "verified" : "pending",
      source: hasFeedProof ? "bags_feed" : hasPoolProof ? "bags_pool" : "bags_index",
      value: hasFeedProof ? "Bags launch/feed metadata found" : hasPoolProof ? "Bags pool found" : "Not in cached Bags feed yet",
      timestamp: generatedAt,
      evidenceUrl: bagsUrl,
      explanation: "Confirms whether this mint is visible through Bags launch metadata or Bags pool discovery.",
      rawReference: { endpoint: hasFeedProof ? "/token-launch/feed" : "/solana/bags/pools/token-mint" },
    }),
    evidence({
      id: "pool-proof",
      label: "Pool proof",
      status: hasPoolProof ? "verified" : "pending",
      source: "bags_pools",
      value: poolKey ? shortKey(poolKey) ?? String(poolKey) : "No Bags pool/config account found yet",
      timestamp: generatedAt,
      evidenceUrl: poolKey ? `https://solscan.io/account/${poolKey}` : null,
      explanation: "Looks for Bags DBC config, Bags pool, or Meteora DAMM v2 pool keys and links the on-chain account when available.",
      rawReference: poolKey ? { endpoint: "/solana/bags/pools/token-mint", account: String(poolKey) } : { endpoint: "/solana/bags/pools/token-mint" },
    }),
    evidence({
      id: "creator-proof",
      label: "Creator/admin proof",
      status: creatorWallet ? "verified" : "pending",
      source: "bags_creators_api",
      value: creatorWallet ? shortWallet(creatorWallet) : "Creator/admin wallet not returned yet",
      timestamp: generatedAt,
      evidenceUrl: creatorWallet ? `https://solscan.io/account/${creatorWallet}` : null,
      explanation: "Uses the Bags creators/admin API and local creator wallet if present. Official actions must still be wallet-signed.",
      rawReference: creatorWallet ? { endpoint: "/token-launch/creator/v3", account: creatorWallet } : { endpoint: "/token-launch/creator/v3" },
    }),
    evidence({
      id: "launch-proof",
      label: "Launch proof",
      status: token?.bagsLaunchId || bagsMeta.launchSignature ? "verified" : token ? "warming" : "pending",
      source: "bags_launch_metadata",
      value: String(token?.bagsLaunchId ?? bagsMeta.launchSignature ?? token?.launchStatus ?? "Launch metadata warming"),
      timestamp: token?.launchedAt?.toISOString?.() ?? token?.createdAt?.toISOString?.() ?? generatedAt,
      evidenceUrl: bagsMeta.launchSignature ? `https://solscan.io/tx/${bagsMeta.launchSignature}` : bagsUrl,
      explanation: "Shows Bags launch id/signature when available. If only a local imported token exists, the launch proof stays warming.",
      rawReference: bagsMeta.launchSignature ? { signature: String(bagsMeta.launchSignature) } : { endpoint: "/token-launch/feed" },
    }),
    evidence({
      id: "market-proof",
      label: "Market proof",
      status: market ? "verified" : "pending",
      source: market ? "dexscreener" : "dexscreener_pending",
      value: market ? `${formatUsd(market.mc) ?? "mcap pending"} / ${formatUsd(market.v24h) ?? "volume pending"} vol 24h` : "No DEX pair yet",
      timestamp: generatedAt,
      evidenceUrl: dexScreener,
      explanation: "Uses live market data only when a real Solana DEX pair exists. Missing pairs are shown as pending, not fabricated.",
      rawReference: market?.pairAddress ? { pairAddress: market.pairAddress } : undefined,
    }),
    evidence({
      id: "fee-loop-proof",
      label: "Fee loop proof",
      status: feeVelocity?.status === "active" ? "verified" : feeVelocity?.status === "pending" ? "warming" : "unavailable",
      source: "bags_fees + fee_snapshots",
      value: `${formatLamports(lifetimeFeesLamports)} lifetime / ${feeVelocityValue(feeVelocity?.status, feeVelocity?.feeVelocity24hLamports)} 24h`,
      timestamp: feeVelocity?.currentSnapshotAt ?? generatedAt,
      evidenceUrl: bagsUrl,
      explanation: feeVelocity?.message ?? "Bags fee data or local fee snapshots are temporarily unavailable.",
      rawReference: { endpoint: "/token-launch/lifetime-fees" },
    }),
    evidence({
      id: "claim-receipts",
      label: "Claim receipts",
      status: firstClaimSig || firstReceiptSig ? "verified" : claimEvents24h.length > 0 ? "verified" : "pending",
      source: firstReceiptSig ? "bags_claim_events + fee_events" : "bags_claim_events",
      value: `${claimEvents24h.length} Bags claim events / ${formatLamports(claimed24hLamports)} claimed 24h`,
      timestamp: claimEvents24h[0]?.timestamp ?? receipts[0]?.createdAt?.toISOString?.() ?? generatedAt,
      evidenceUrl: firstClaimSig || firstReceiptSig ? `https://solscan.io/tx/${firstClaimSig ?? firstReceiptSig}` : bagsUrl,
      explanation: "Links real Bags claim events or wallet-submitted claim receipts. Amounts are shown only when returned by a real event.",
      rawReference: firstClaimSig || firstReceiptSig ? { endpoint: "/fee-share/token/claim-events", signature: String(firstClaimSig ?? firstReceiptSig) } : { endpoint: "/fee-share/token/claim-events" },
    }),
    evidence({
      id: "social-proof",
      label: "Social proof",
      status: safeNumber(social?.postCount) > 0 ? "verified" : "pending",
      source: "square_token_posts",
      value: `${safeNumber(social?.postCount)} posts / score ${socialScore}`,
      timestamp: generatedAt,
      evidenceUrl: `/square?token=${mint}`,
      explanation: "Counts token-linked Square activity only. Generic posts do not increase token social proof.",
      rawReference: { endpoint: "/api/posts?tokenMint={mint}" },
    }),
    evidence({
      id: "usdt-proof",
      label: "USDT campaign/funding proof",
      status: fundedCampaign ? "verified" : campaigns.length > 0 ? "warming" : "pending",
      source: fundedCampaign ? "spl_usdt_funding_proof" : "reward_campaigns",
      value: fundedCampaign
        ? `${formatUsd(fundedBudgetUsdt) ?? "$0"} funded / ${formatUsd(plannedBudgetUsdt) ?? "$0"} planned`
        : campaigns.length > 0
          ? `${formatUsd(plannedBudgetUsdt) ?? "$0"} planned - preview only`
          : "No USDT campaign proof attached",
      timestamp: fundedCampaign?.fundedAt?.toISOString?.() ?? campaigns[0]?.createdAt?.toISOString?.() ?? generatedAt,
      evidenceUrl: fundedCampaign?.fundingTxSignature ? `https://solscan.io/tx/${fundedCampaign.fundingTxSignature}` : null,
      explanation: "Shows planned USDT campaigns and externally attached SPL USDT funding proof. SignalCred does not fabricate or execute payouts here.",
      rawReference: fundedCampaign?.fundingTxSignature ? { signature: fundedCampaign.fundingTxSignature } : { endpoint: "/api/tokens/{mint}/campaigns" },
    }),
  ];

  const scoreBreakdown = {
    bagsSource: statusScore(evidenceRows[0].status, 15),
    poolProof: statusScore(evidenceRows[1].status, 15),
    creatorProof: statusScore(evidenceRows[2].status, 15),
    launchProof: statusScore(evidenceRows[3].status, 10),
    marketProof: statusScore(evidenceRows[4].status, 10),
    feeLoop: statusScore(evidenceRows[5].status, 15),
    claimReceipts: statusScore(evidenceRows[6].status, 5),
    socialProof: statusScore(evidenceRows[7].status, 10),
    usdtProof: statusScore(evidenceRows[8].status, 5),
    formula: "15 Bags source + 15 pool + 15 creator + 10 launch + 10 market + 15 fee loop + 5 claims + 10 social + 5 USDT",
  };
  const trustScore = Object.entries(scoreBreakdown)
    .filter(([, value]) => typeof value === "number")
    .reduce((sum, [, value]) => sum + Number(value), 0);

  const riskLabels: TrustRiskLabel[] = [];
  if (!hasFeedProof && !hasPoolProof) riskLabels.push({ id: "no-bags-source", label: "Bags source proof pending", severity: "high", evidenceIds: ["bags-source"] });
  if (!hasPoolProof) riskLabels.push({ id: "no-pool-proof", label: "Pool proof pending", severity: "high", evidenceIds: ["pool-proof"] });
  if (!creatorWallet) riskLabels.push({ id: "no-creator-proof", label: "Creator/admin proof pending", severity: "medium", evidenceIds: ["creator-proof"] });
  if (!market) riskLabels.push({ id: "no-market-proof", label: "No DEX pair yet", severity: "low", evidenceIds: ["market-proof"] });
  if (feeVelocity?.status === "pending") riskLabels.push({ id: "baseline-warming", label: "Fee velocity baseline warming", severity: "low", evidenceIds: ["fee-loop-proof"] });
  if (lifetimeFeesLamports === 0) riskLabels.push({ id: "zero-fees", label: "Zero lifetime fees indexed", severity: "low", evidenceIds: ["fee-loop-proof"] });
  if (safeNumber(social?.postCount) >= 5 && lifetimeFeesLamports === 0) riskLabels.push({ id: "social-zero-fees", label: "Social activity exists but fees are zero", severity: "medium", evidenceIds: ["social-proof", "fee-loop-proof"] });
  if (campaigns.length > 0 && !fundedCampaign) riskLabels.push({ id: "campaign-preview", label: "USDT campaign is planned but not funded", severity: "low", evidenceIds: ["usdt-proof"] });

  return {
    mint,
    token: {
      name: token?.name ?? market?.name ?? `Bags ${mint.slice(0, 4)}`,
      symbol: token?.symbol ?? market?.symbol ?? "BAGS",
      imageUrl: token?.imageUrl ?? market?.logoURI ?? null,
      creatorWallet,
    },
    verdict: deriveVerdict(trustScore, riskLabels, evidenceRows),
    trustScore,
    scoreBreakdown,
    evidence: evidenceRows,
    riskLabels,
    links: {
      tokenPage: `/token/${mint}`,
      bags: bagsUrl,
      solscanMint,
      dexScreener,
      meteora,
      creatorProfile: creatorWallet ? `/profile/${creatorWallet}` : null,
    },
    sourceLabels: {
      token: token ? "local_token_db + bags_import" : "derived_from_live_sources",
      bags: hasFeedProof ? "bags_feed" : hasPoolProof ? "bags_pool" : "pending",
      market: market ? "dexscreener" : "pending",
      fees: lifetimeFeesRaw != null ? "bags_lifetime_fees" : "pending",
      velocity: feeVelocity?.status === "active" ? "fee_snapshots" : `fee_snapshots_${feeVelocity?.status ?? "unavailable"}`,
      claims: claimEventsAll.length > 0 ? "bags_claim_events" : "pending",
      social: "token_linked_square_posts",
      usdt: pricing.usdtSource,
      usdtValue: `${lamportsToUsdt(lifetimeFeesLamports, pricing.solPriceUsdt).toFixed(2)} USDT lifetime approx`,
    },
    noFakeData: true,
    generatedAt,
  };
}
