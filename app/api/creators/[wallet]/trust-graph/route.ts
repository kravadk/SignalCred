export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { count, desc, eq, sum } from "drizzle-orm";
import { posts, rewardCampaigns, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getTokenOverview } from "@/lib/birdeye";
import { getBagsClaimEvents, getBagsCreators, getBagsLifetimeFees, getBagsPoolByMint } from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { rateLimit } from "@/lib/rate-limit";

type LinkedRole = "creator" | "admin" | "claimer" | "campaign_funder";
type Severity = "low" | "medium" | "high";

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "anon";
}

function validateWallet(wallet: string) {
  try {
    return new PublicKey(wallet).toBase58();
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function safeNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function addLinkedWallet(
  map: Map<string, { wallet: string; role: LinkedRole; tokenCount: number; tokens: Set<string> }>,
  wallet: string | null | undefined,
  role: LinkedRole,
  tokenMint: string
) {
  if (!wallet) return;
  const key = `${wallet}:${role}`;
  const row = map.get(key) ?? { wallet, role, tokenCount: 0, tokens: new Set<string>() };
  row.tokens.add(tokenMint);
  row.tokenCount = row.tokens.size;
  map.set(key, row);
}

function suspicious(id: string, label: string, severity: Severity, evidence: string[]) {
  return { id, label, severity, evidence };
}

export async function GET(req: NextRequest, { params }: { params: { wallet: string } }) {
  const rl = rateLimit(`creator-trust-graph:${clientKey(req)}`, 50, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const wallet = validateWallet(params.wallet);
  if (!wallet) return NextResponse.json({ error: "Invalid creator wallet" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;
  const linkedWallets = new Map<string, { wallet: string; role: LinkedRole; tokenCount: number; tokens: Set<string> }>();

  const localTokens = await db
    .select()
    .from(tokens)
    .where(eq(tokens.creatorWallet, wallet))
    .orderBy(desc(tokens.launchedAt))
    .limit(80);

  for (const token of localTokens) addLinkedWallet(linkedWallets, wallet, "creator", token.mint);

  const enrichedSettled = await Promise.allSettled(
    localTokens.slice(0, 40).map(async (token) => {
      const [social] = await db
        .select({
          postCount: count(posts.id),
          totalLikes: sum(posts.likesCount),
          totalComments: sum(posts.commentsCount),
          totalReposts: sum(posts.repostsCount),
        })
        .from(posts)
        .where(eq(posts.tokenMint, token.mint));

      const [lifetimeFeesRaw, claimEvents24h, claimEvents, creators, pool, market, tokenCampaigns] = await Promise.all([
        withTimeout(getBagsLifetimeFees(token.mint), 2_500, null),
        withTimeout(getBagsClaimEvents(token.mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
        withTimeout(getBagsClaimEvents(token.mint, { limit: 20 }), 2_500, []),
        withTimeout(getBagsCreators(token.mint), 2_500, []),
        withTimeout(getBagsPoolByMint(token.mint), 2_500, null),
        withTimeout(getTokenOverview(token.mint), 2_500, null),
        withTimeout(db.select().from(rewardCampaigns).where(eq(rewardCampaigns.tokenMint, token.mint)).limit(20), 2_500, []),
      ]);

      for (const creator of creators) {
        addLinkedWallet(linkedWallets, creator.wallet, creator.isAdmin ? "admin" : "creator", token.mint);
      }
      for (const event of claimEvents) addLinkedWallet(linkedWallets, event.wallet, "claimer", token.mint);
      for (const campaign of tokenCampaigns) addLinkedWallet(linkedWallets, campaign.fundedByWallet, "campaign_funder", token.mint);

      const lifetimeFeesLamports = safeNumber(lifetimeFeesRaw);
      const feeVelocity = await withTimeout(getFeeVelocity24h(token.mint, lifetimeFeesLamports), 2_500, null);
      const claimedFees24hLamports = claimEvents24h.reduce((sum, event) => sum + safeNumber(event.amount), 0);
      const socialScore =
        safeNumber(social?.postCount) * 3 +
        safeNumber(social?.totalLikes) +
        safeNumber(social?.totalComments) * 2 +
        safeNumber(social?.totalReposts) * 3;
      const creatorProof = creators.some((creator) => creator.wallet === wallet && (creator.isCreator || creator.isAdmin || creator.wallet));
      const poolVerified = Boolean(pool);
      const riskLabels: string[] = [];
      if (!creatorProof) riskLabels.push("Creator proof pending");
      if (!poolVerified) riskLabels.push("Pool proof pending");
      if (!market) riskLabels.push("No DEX pair yet");
      if (lifetimeFeesLamports === 0) riskLabels.push("Zero fees indexed");
      if (socialScore >= 15 && lifetimeFeesLamports === 0) riskLabels.push("Social activity without fees");
      if (feeVelocity?.status === "pending") riskLabels.push("Fee baseline warming");

      return {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.imageUrl,
        passportHref: `/passport/${token.mint}`,
        lifetimeFeesLamports,
        claimedFees24hLamports,
        feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports ?? null,
        feeVelocityStatus: feeVelocity?.status ?? "unavailable",
        poolVerified,
        creatorProof,
        hasMarketPair: Boolean(market),
        socialScore,
        officialUpdates: safeNumber(social?.postCount),
        claimEventsCount: claimEvents.length,
        campaignsPlanned: tokenCampaigns.length,
        campaignsFunded: tokenCampaigns.filter((campaign) => campaign.status === "funded" || campaign.fundingTxSignature).length,
        riskLabels,
      };
    })
  );

  const graphTokens = enrichedSettled
    .map((result) => result.status === "fulfilled" ? result.value : null)
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const officialUpdates = await db
    .select({ count: count(posts.id) })
    .from(posts)
    .where(eq(posts.authorWallet, wallet))
    .then((rows) => safeNumber(rows[0]?.count));

  const allCampaigns = await db
    .select()
    .from(rewardCampaigns)
    .where(eq(rewardCampaigns.creatorWallet, wallet))
    .orderBy(desc(rewardCampaigns.createdAt))
    .limit(50);

  const tokenCount = graphTokens.length;
  const creatorProofCount = graphTokens.filter((token) => token.creatorProof).length;
  const poolVerifiedCount = graphTokens.filter((token) => token.poolVerified).length;
  const marketPairCount = graphTokens.filter((token) => token.hasMarketPair).length;
  const feeGeneratingCount = graphTokens.filter((token) => token.lifetimeFeesLamports > 0).length;
  const claimEventCount = graphTokens.reduce((sum, token) => sum + token.claimEventsCount, 0);
  const socialQualityRaw = graphTokens.reduce((sum, token) => sum + token.socialScore, 0) + officialUpdates * 3;
  const fundedCampaigns = allCampaigns.filter((campaign) => campaign.status === "funded" || campaign.fundingTxSignature).length;

  const suspiciousPatterns = [];
  if (tokenCount === 0) suspiciousPatterns.push(suspicious("new-creator", "No indexed creator launches yet", "low", ["local token index"]));
  if (tokenCount > 0 && creatorProofCount === 0) suspiciousPatterns.push(suspicious("creator-proof-missing", "No Bags creator/admin proof across indexed tokens", "medium", graphTokens.map((token) => token.mint)));
  if (tokenCount > 0 && poolVerifiedCount / tokenCount < 0.35) suspiciousPatterns.push(suspicious("low-pool-coverage", "Low pool proof coverage", "high", graphTokens.filter((token) => !token.poolVerified).map((token) => token.mint)));
  if (tokenCount > 0 && feeGeneratingCount === 0) suspiciousPatterns.push(suspicious("zero-fee-history", "Creator has no indexed fee generation yet", "low", graphTokens.map((token) => token.mint)));
  if (graphTokens.some((token) => token.socialScore >= 15 && token.lifetimeFeesLamports === 0)) {
    suspiciousPatterns.push(suspicious(
      "social-without-fees",
      "Some tokens have social activity but zero indexed fees",
      "medium",
      graphTokens.filter((token) => token.socialScore >= 15 && token.lifetimeFeesLamports === 0).map((token) => token.mint)
    ));
  }

  const linkedRows = Array.from(linkedWallets.values()).map((row) => ({
    wallet: row.wallet,
    role: row.role,
    tokenCount: row.tokenCount,
  })).sort((a, b) => b.tokenCount - a.tokenCount);

  const riskPenalty = suspiciousPatterns.reduce((sum, pattern) => {
    if (pattern.severity === "high") return sum + 18;
    if (pattern.severity === "medium") return sum + 10;
    return sum + 4;
  }, 0);

  const scoreBreakdown = {
    creatorProof: tokenCount ? clampScore((creatorProofCount / tokenCount) * 20) : 0,
    poolSurvival: tokenCount ? clampScore((poolVerifiedCount / tokenCount) * 20) : 0,
    feeGeneration: tokenCount ? clampScore((feeGeneratingCount / tokenCount) * 20) : 0,
    claims: clampScore(Math.min(claimEventCount, 20)),
    socialQuality: clampScore(Math.min(socialQualityRaw, 15)),
    campaignReliability: allCampaigns.length ? clampScore((fundedCampaigns / allCampaigns.length) * 10) : 0,
    riskPenalty,
  };
  const reliabilityScore = clampScore(
    scoreBreakdown.creatorProof +
    scoreBreakdown.poolSurvival +
    scoreBreakdown.feeGeneration +
    scoreBreakdown.claims +
    scoreBreakdown.socialQuality +
    scoreBreakdown.campaignReliability -
    scoreBreakdown.riskPenalty
  );

  return NextResponse.json({
    wallet,
    reliabilityScore,
    scoreBreakdown,
    tokens: graphTokens,
    linkedWallets: linkedRows,
    suspiciousPatterns,
    totals: {
      tokenCount,
      creatorProofCount,
      poolVerifiedCount,
      marketPairCount,
      feeGeneratingCount,
      claimEventCount,
      officialUpdates,
      campaignsPlanned: allCampaigns.length,
      campaignsFunded: fundedCampaigns,
    },
    sourceLabels: {
      tokens: "local_token_index",
      creatorProof: "bags_creators_api",
      pools: "bags_pools",
      fees: "bags_lifetime_fees + fee_snapshots",
      claims: "bags_claim_events",
      social: "token_linked_square_posts",
      campaigns: "reward_campaigns",
    },
    noFakeData: true,
    generatedAt: new Date().toISOString(),
  });
}
