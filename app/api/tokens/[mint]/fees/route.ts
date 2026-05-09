import { NextRequest, NextResponse } from "next/server";
import { sdk } from "@/lib/bags";
import { getBagsClaimEvents, getBagsCreators, getBagsLifetimeFees } from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { buildStableFeeFields, getUsdtPricing } from "@/lib/stable-fees";
import { PublicKey } from "@solana/web3.js";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function estimateCreatorBps(creators: Awaited<ReturnType<typeof getBagsCreators>>) {
  const creatorBps = creators
    .filter((creator) => creator.isCreator || creator.wallet)
    .reduce((sum, creator) => sum + Number(creator.royaltyBps ?? 0), 0);

  return creatorBps > 0 && creatorBps <= 10_000 ? creatorBps : 7_500;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;

  const [claimEventsResult, claimEvents24hResult, lifetimeFeesResult, creatorsResult] = await Promise.allSettled([
    getBagsClaimEvents(params.mint, { limit: 50 }),
    getBagsClaimEvents(params.mint, { from: since24h, to: now, limit: 100 }),
    getBagsLifetimeFees(params.mint),
    getBagsCreators(params.mint),
  ]);

  const lifetimeFeesLamports =
    lifetimeFeesResult.status === "fulfilled"
      ? Number(lifetimeFeesResult.value ?? 0)
      : 0;
  const creators = creatorsResult.status === "fulfilled" ? creatorsResult.value : [];
  const events = claimEventsResult.status === "fulfilled" ? claimEventsResult.value : [];
  const events24h = claimEvents24hResult.status === "fulfilled" ? claimEvents24hResult.value : [];

  let claimStats = null;
  try {
    claimStats = await sdk.state.getTokenClaimStats(new PublicKey(params.mint));
  } catch { /* token may not have stats */ }

  const totalFeeLamports = Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0;
  const claimedFees24hLamports = events24h.reduce((sum, event) => {
    const value = Number(event.amount ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const creatorBps = estimateCreatorBps(creators);
  const creatorFeeLamports = Math.floor(totalFeeLamports * (creatorBps / 10_000));
  const platformFeeLamports = Math.max(totalFeeLamports - creatorFeeLamports, 0);
  const [feeVelocity, pricing] = await Promise.all([
    getFeeVelocity24h(params.mint, totalFeeLamports),
    getUsdtPricing(),
  ]);
  const stableFees = buildStableFeeFields({
    solPriceUsdt: pricing.solPriceUsdt,
    lifetimeFeesLamports: totalFeeLamports,
    feeVelocity24hLamports: feeVelocity.feeVelocity24hLamports,
    claimedFees24hLamports,
    creatorFeeLamports,
    platformFeeLamports,
  });

  return NextResponse.json({
    events,
    lifetimeFeesLamports: totalFeeLamports,
    claimedFees24hLamports,
    feeVelocity24hLamports: feeVelocity.feeVelocity24hLamports,
    feeVelocityStatus: feeVelocity.status,
    feeVelocity,
    solPriceUsdt: pricing.solPriceUsdt,
    usdtSource: pricing.usdtSource,
    usdtApproximate: pricing.usdtApproximate,
    ...stableFees,
    creators,
    claimStats,
    source: {
      events: "bags_claim_events",
      lifetimeFees: "bags_api",
      creators: "bags_api",
      claimed24h: "bags_claim_events",
      feeVelocity24h: feeVelocity.status === "active" ? "fee_snapshots" : "fee_snapshots_pending",
      usdt: pricing.usdtSource,
    },
    split: {
      totalFeeLamports,
      creatorFeeLamports,
      platformFeeLamports,
      creatorBps,
      platformBps: 10_000 - creatorBps,
    },
  });
}
