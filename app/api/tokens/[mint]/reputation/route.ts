export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { count, eq, sum } from "drizzle-orm";
import { posts, tokens } from "@/db/schema";
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
import { rateLimit } from "@/lib/rate-limit";
import { buildStableFeeFields, getUsdtPricing } from "@/lib/stable-fees";

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
    ? bags as Record<string, unknown>
    : {};
}

type RiskFlag = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
};

export async function GET(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`token-reputation:${ip}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const mint = params.mint;
  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  let token = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  if (!token) token = (await importBagsTokenByMint(mint)) ?? undefined;

  const bagsMeta = readBagsMeta(token?.metadata);
  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;
  const [pool, creators, lifetimeFees, claimEvents24h, market, social] = await Promise.all([
    withTimeout(getBagsPoolByMint(mint), 2_500, null),
    withTimeout(getBagsCreators(mint), 2_500, []),
    withTimeout(getBagsLifetimeFees(mint), 2_500, null),
    withTimeout(getBagsClaimEvents(mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
    withTimeout(getTokenOverview(mint), 2_500, null),
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
  ]);

  const socialScore =
    Number(social?.postCount ?? 0) * 3 +
    Number(social?.totalLikes ?? 0) +
    Number(social?.totalComments ?? 0) * 2 +
    Number(social?.totalReposts ?? 0) * 3;

  const lifetimeFeesRaw = Number(lifetimeFees ?? bagsMeta.lifetimeFees ?? 0);
  const lifetimeFeesLamports = Number.isFinite(lifetimeFeesRaw) ? lifetimeFeesRaw : 0;
  const [feeVelocity, pricing] = await Promise.all([
    withTimeout(
      getFeeVelocity24h(mint, Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0),
      2_500,
      null
    ),
    withTimeout(getUsdtPricing(), 2_500, {
      solPriceUsdt: 150,
      usdtSource: "dexscreener_sol_usdt" as const,
      usdtApproximate: true as const,
    }),
  ]);
  const claimedFees24hLamports = claimEvents24h.reduce((sum, event) => {
    const value = Number(event.amount ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const feeSol = Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports / 1e9 : 0;
  const creator = creators.find((c) => c.isCreator && c.wallet) ?? creators.find((c) => c.wallet);
  const bagsVerified = Boolean(
    pool ||
    bagsMeta.poolVerified ||
    bagsMeta.dbcPoolKey ||
    bagsMeta.dbcConfigKey ||
    bagsMeta.dammV2PoolKey
  );

  const reputationScore = Math.round(
    feeSol * 10 +
    Number(feeVelocity?.feeVelocity24hLamports ?? 0) / 1e9 * 15 +
    socialScore +
    (market?.priceChange24hPercent ?? 0) * 0.2 +
    (bagsVerified ? 15 : 0)
  );

  const riskFlags: RiskFlag[] = [];
  if (!bagsVerified) {
    riskFlags.push({ id: "no-bags-proof", label: "No Bags pool proof found", severity: "high" });
  }
  if (!creator) {
    riskFlags.push({ id: "no-creator", label: "Creator identity unavailable", severity: "medium" });
  }
  if (socialScore === 0) {
    riskFlags.push({ id: "no-social", label: "No social traction yet", severity: "low" });
  }
  if (lifetimeFeesLamports === 0) {
    riskFlags.push({ id: "no-fees", label: "No lifetime fees indexed yet", severity: "low" });
  }
  if (!market) {
    riskFlags.push({ id: "no-market", label: "Market data unavailable", severity: "low" });
  }

  const creatorBps = creators
    .filter((c) => c.isCreator || c.wallet)
    .reduce((sum, c) => sum + Number(c.royaltyBps ?? 0), 0);
  const normalizedCreatorBps = creatorBps > 0 && creatorBps <= 10_000 ? creatorBps : 7_500;
  const creatorFeeLamports = Math.floor(lifetimeFeesLamports * (normalizedCreatorBps / 10_000));
  const platformFeeLamports = Math.max(lifetimeFeesLamports - creatorFeeLamports, 0);
  const stableFees = buildStableFeeFields({
    solPriceUsdt: pricing.solPriceUsdt,
    lifetimeFeesLamports,
    feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports,
    claimedFees24hLamports,
    creatorFeeLamports,
    platformFeeLamports,
  });

  const scoreBreakdown = {
    lifetimeFees: Math.round(feeSol * 10),
    feeVelocity: Math.round(Number(feeVelocity?.feeVelocity24hLamports ?? 0) / 1e9 * 15),
    social: socialScore,
    marketMomentum: Math.round((market?.priceChange24hPercent ?? 0) * 0.2),
    bagsProof: bagsVerified ? 15 : 0,
    formula: "fees*10 + velocity*15 + social + 24hChange*0.2 + bagsProof",
  };

  return NextResponse.json({
    mint,
    bagsVerified,
    lifetimeFeesLamports: Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0,
    claimedFees24hLamports,
    feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports ?? null,
    feeVelocityStatus: feeVelocity?.status ?? "unavailable",
    feeVelocity,
    solPriceUsdt: pricing.solPriceUsdt,
    usdtSource: pricing.usdtSource,
    usdtApproximate: pricing.usdtApproximate,
    ...stableFees,
    split: {
      creatorBps: normalizedCreatorBps,
      platformBps: 10_000 - normalizedCreatorBps,
      creatorFeeLamports,
      platformFeeLamports,
    },
    creator,
    creators,
    social: {
      posts: Number(social?.postCount ?? 0),
      likes: Number(social?.totalLikes ?? 0),
      comments: Number(social?.totalComments ?? 0),
      reposts: Number(social?.totalReposts ?? 0),
      score: socialScore,
    },
    market: market
      ? {
          price: market.price,
          priceChange24hPercent: market.priceChange24hPercent,
          volume24h: market.v24h,
          marketCap: market.mc,
        }
      : null,
    pool: pool ?? {
      dbcPoolKey: bagsMeta.dbcPoolKey ?? null,
      dbcConfigKey: bagsMeta.dbcConfigKey ?? null,
      dammV2PoolKey: bagsMeta.dammV2PoolKey ?? null,
    },
    riskFlags,
    source: {
      proof: bagsVerified ? "bags_pool" : "unverified",
      lifetimeFees: "bags_api",
      claimed24h: "bags_claim_events",
      feeVelocity24h: feeVelocity?.status === "active" ? "fee_snapshots" : "fee_snapshots_pending",
      market: market ? "dexscreener" : null,
      social: "signalcred_posts",
      usdt: pricing.usdtSource,
    },
    scoreBreakdown,
    creatorProfilePath: creator?.wallet ? `/profile/${creator.wallet}` : null,
    reputationScore,
  });
}
