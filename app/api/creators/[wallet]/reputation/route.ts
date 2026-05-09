export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { count, desc, eq, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, rewardCampaigns, tokens, users } from "@/db/schema";
import { getTokenOverview } from "@/lib/birdeye";
import { getBagsClaimEvents, getBagsCreators, getBagsLifetimeFees, getBagsPoolByMint } from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { rateLimit } from "@/lib/rate-limit";
import { buildStableFeeFields, getUsdtPricing, lamportsToUsdt } from "@/lib/stable-fees";

type RiskFlag = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
};

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

function sumClaimEventsLamports(events: Array<{ amount?: string }>) {
  return events.reduce((total, event) => {
    const value = Number(event.amount ?? 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

export async function GET(req: NextRequest, { params }: { params: { wallet: string } }) {
  const rl = rateLimit(`creator-reputation:${clientKey(req)}`, 50, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const wallet = validateWallet(params.wallet);
  if (!wallet) return NextResponse.json({ error: "Invalid creator wallet" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;
  const pricing = await withTimeout(getUsdtPricing(), 2_500, {
    solPriceUsdt: 150,
    usdtSource: "dexscreener_sol_usdt" as const,
    usdtApproximate: true as const,
  });

  const localTokens = await db
    .select()
    .from(tokens)
    .where(eq(tokens.creatorWallet, wallet))
    .orderBy(desc(tokens.launchedAt))
    .limit(80);

  const user = await db.query.users.findFirst({ where: eq(users.wallet, wallet) });

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

      const [lifetimeFeesRaw, claimEvents24h, claimEvents, creators, pool, market] = await Promise.all([
        withTimeout(getBagsLifetimeFees(token.mint), 2_500, null),
        withTimeout(getBagsClaimEvents(token.mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
        withTimeout(getBagsClaimEvents(token.mint, { limit: 8 }), 2_500, []),
        withTimeout(getBagsCreators(token.mint), 2_500, []),
        withTimeout(getBagsPoolByMint(token.mint), 2_500, null),
        withTimeout(getTokenOverview(token.mint), 2_500, null),
      ]);

      const lifetimeFeesLamports = Number(lifetimeFeesRaw ?? 0);
      const safeLifetime = Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0;
      const feeVelocity = await withTimeout(getFeeVelocity24h(token.mint, safeLifetime), 2_500, null);
      const claimedFees24hLamports = sumClaimEventsLamports(claimEvents24h);
      const creatorProof = creators.some((creator) => creator.wallet === wallet && (creator.isCreator || creator.isAdmin || creator.wallet));
      const socialScore =
        Number(social?.postCount ?? 0) * 3 +
        Number(social?.totalLikes ?? 0) +
        Number(social?.totalComments ?? 0) * 2 +
        Number(social?.totalReposts ?? 0) * 3;
      const poolVerified = Boolean(pool);
      const stableFees = buildStableFeeFields({
        solPriceUsdt: pricing.solPriceUsdt,
        lifetimeFeesLamports: safeLifetime,
        feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports,
        claimedFees24hLamports,
        creatorFeeLamports: Math.floor(safeLifetime * 0.75),
        platformFeeLamports: Math.ceil(safeLifetime * 0.25),
      });

      const riskFlags: RiskFlag[] = [];
      if (!creatorProof) riskFlags.push({ id: "creator-proof-pending", label: "Creator proof pending", severity: "medium" });
      if (!poolVerified) riskFlags.push({ id: "pool-proof-pending", label: "Pool proof pending", severity: "medium" });
      if (safeLifetime === 0) riskFlags.push({ id: "zero-fees", label: "No lifetime fees indexed", severity: "low" });
      if (socialScore > 10 && safeLifetime === 0) riskFlags.push({ id: "social-no-fees", label: "Social activity without fee conviction", severity: "high" });

      return {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.imageUrl,
        launchedAt: token.launchedAt,
        lifetimeFeesLamports: safeLifetime,
        claimedFees24hLamports,
        feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports ?? null,
        feeVelocityStatus: feeVelocity?.status ?? "unavailable",
        ...stableFees,
        socialScore,
        posts: Number(social?.postCount ?? 0),
        poolVerified,
        creatorProof,
        market: market ? {
          price: market.price,
          volume24h: market.v24h,
          marketCap: market.mc,
          priceChange24hPercent: market.priceChange24hPercent,
        } : null,
        recentClaimEvents: claimEvents,
        riskFlags,
      };
    })
  );

  const creatorTokens = enrichedSettled
    .map((result) => result.status === "fulfilled" ? result.value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const officialUpdates = await db
    .select()
    .from(posts)
    .where(eq(posts.authorWallet, wallet))
    .orderBy(desc(posts.createdAt))
    .limit(12);

  const campaigns = await db
    .select()
    .from(rewardCampaigns)
    .where(eq(rewardCampaigns.creatorWallet, wallet))
    .orderBy(desc(rewardCampaigns.createdAt))
    .limit(20);

  const totals = creatorTokens.reduce((acc, token) => {
    acc.lifetimeFeesLamports += token.lifetimeFeesLamports;
    acc.claimedFees24hLamports += token.claimedFees24hLamports;
    acc.feeVelocity24hLamports += token.feeVelocity24hLamports ?? 0;
    acc.socialScore += token.socialScore;
    acc.verifiedTokens += token.creatorProof ? 1 : 0;
    acc.poolVerifiedTokens += token.poolVerified ? 1 : 0;
    return acc;
  }, {
    tokenCount: creatorTokens.length,
    lifetimeFeesLamports: 0,
    claimedFees24hLamports: 0,
    feeVelocity24hLamports: 0,
    socialScore: 0,
    verifiedTokens: 0,
    poolVerifiedTokens: 0,
  });

  const riskFlags: RiskFlag[] = [];
  if (totals.tokenCount === 0) riskFlags.push({ id: "no-local-tokens", label: "No indexed creator tokens yet", severity: "low" });
  if (totals.verifiedTokens === 0 && totals.tokenCount > 0) riskFlags.push({ id: "no-verified-creator-proof", label: "No Bags creator proof across indexed tokens", severity: "medium" });
  if (totals.lifetimeFeesLamports === 0 && totals.tokenCount > 0) riskFlags.push({ id: "zero-creator-fees", label: "Creator has no indexed lifetime fees yet", severity: "low" });

  return NextResponse.json({
    creator: {
      wallet,
      solscan: `https://solscan.io/account/${wallet}`,
      verifiedTokenCount: totals.verifiedTokens,
      username: user?.username ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      bio: user?.bio ?? null,
    },
    tokens: creatorTokens,
    officialUpdates,
    campaigns,
    campaignTotals: {
      count: campaigns.length,
      plannedBudgetUsdt: campaigns.reduce((sum, campaign) => {
        const value = Number(campaign.budgetUsdt ?? 0);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0),
    },
    recentClaimEvents: creatorTokens.flatMap((token) =>
      token.recentClaimEvents.map((event) => ({ ...event, tokenMint: token.mint, symbol: token.symbol }))
    ).slice(0, 20),
    totals: {
      ...totals,
      lifetimeFeesUsdt: lamportsToUsdt(totals.lifetimeFeesLamports, pricing.solPriceUsdt),
      claimedFees24hUsdt: lamportsToUsdt(totals.claimedFees24hLamports, pricing.solPriceUsdt),
      feeVelocity24hUsdt: lamportsToUsdt(totals.feeVelocity24hLamports, pricing.solPriceUsdt),
    },
    treasuryPlanner: {
      previewOnly: true,
      claimableEstimateLamports: Math.max(totals.feeVelocity24hLamports - totals.claimedFees24hLamports, 0),
      defaultKeepSolPercent: 50,
      defaultConvertUsdtPercent: 30,
      defaultRewardsPercent: 20,
    },
    riskFlags,
    solPriceUsdt: pricing.solPriceUsdt,
    usdtSource: pricing.usdtSource,
    usdtApproximate: pricing.usdtApproximate,
    source: {
      tokens: "local_index",
      fees: "bags_api",
      feeVelocity24h: "fee_snapshots",
      social: "signalcred_posts",
      usdt: pricing.usdtSource,
    },
  });
}
