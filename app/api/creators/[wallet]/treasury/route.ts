export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { desc, eq } from "drizzle-orm";
import { rewardCampaigns, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getBagsClaimEvents, getBagsLifetimeFees } from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { rateLimit } from "@/lib/rate-limit";
import { getUsdtPricing, lamportsToSolAmount, lamportsToUsdt } from "@/lib/stable-fees";

const CREATOR_SHARE = 0.75;

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
  ]).catch(() => fallback);
}

function safeLamports(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sumClaimEventsLamports(events: Array<{ amount?: string }>) {
  return events.reduce((total, event) => total + safeLamports(event.amount), 0);
}

function numeric(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest, { params }: { params: { wallet: string } }) {
  const rl = rateLimit(`creator-treasury:${clientKey(req)}`, 50, 60_000);
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

  const [creatorTokens, campaigns] = await Promise.all([
    db.select().from(tokens).where(eq(tokens.creatorWallet, wallet)).orderBy(desc(tokens.launchedAt)).limit(80),
    db.select().from(rewardCampaigns).where(eq(rewardCampaigns.creatorWallet, wallet)).orderBy(desc(rewardCampaigns.createdAt)).limit(80),
  ]);

  const tokenRows = await Promise.all(creatorTokens.slice(0, 40).map(async (token) => {
    const [lifetimeRaw, claimEvents24h] = await Promise.all([
      withTimeout(getBagsLifetimeFees(token.mint), 2_500, null),
      withTimeout(getBagsClaimEvents(token.mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
    ]);
    const lifetimeFeesLamports = safeLamports(lifetimeRaw);
    const feeVelocity = await withTimeout(getFeeVelocity24h(token.mint, lifetimeFeesLamports), 2_000, null);
    const claimedFees24hLamports = sumClaimEventsLamports(claimEvents24h);
    return {
      mint: token.mint,
      name: token.name,
      symbol: token.symbol,
      lifetimeFeesLamports,
      claimedFees24hLamports,
      feeVelocity24hLamports: feeVelocity?.feeVelocity24hLamports ?? null,
      feeVelocityStatus: feeVelocity?.status ?? "unavailable",
    };
  }));

  const lifetimeFeesLamports = tokenRows.reduce((sum, token) => sum + token.lifetimeFeesLamports, 0);
  const claimedFees24hLamports = tokenRows.reduce((sum, token) => sum + token.claimedFees24hLamports, 0);
  const feeVelocity24hLamports = tokenRows.reduce((sum, token) => sum + (token.feeVelocity24hLamports ?? 0), 0);
  const estimatedCreatorShareLamports = Math.floor(lifetimeFeesLamports * CREATOR_SHARE);
  const estimatedCreatorShareSol = lamportsToSolAmount(estimatedCreatorShareLamports);
  const plannedCampaignBudgetUsdt = campaigns.reduce((sum, campaign) => sum + numeric(campaign.budgetUsdt), 0);
  const fundedCampaignBudgetUsdt = campaigns
    .filter((campaign) => campaign.status === "funded" || campaign.fundingTxSignature)
    .reduce((sum, campaign) => sum + numeric(campaign.budgetUsdt), 0);
  const fundingProofs = campaigns
    .filter((campaign) => campaign.fundingTxSignature)
    .map((campaign) => ({
      campaignId: campaign.id,
      tokenMint: campaign.tokenMint,
      title: campaign.title,
      txSignature: campaign.fundingTxSignature as string,
      solscanHref: `https://solscan.io/tx/${campaign.fundingTxSignature}`,
      asset: "USDT-SPL" as const,
      fundedByWallet: campaign.fundedByWallet,
      fundedAt: campaign.fundedAt?.toISOString() ?? null,
      budgetUsdt: numeric(campaign.budgetUsdt),
    }));

  const keepSolPercent = 45;
  const convertUsdtPercent = 35;
  const rewardsPercent = 20;
  const retainedSol = estimatedCreatorShareSol * (keepSolPercent / 100);
  const treasuryUsdt = estimatedCreatorShareSol * (convertUsdtPercent / 100) * pricing.solPriceUsdt;
  const rewardBudgetUsdt = estimatedCreatorShareSol * (rewardsPercent / 100) * pricing.solPriceUsdt;
  const dailyCampaignBurnUsdt = plannedCampaignBudgetUsdt > 0 ? Math.max(plannedCampaignBudgetUsdt / 30, 1) : null;
  const runwayDays = dailyCampaignBurnUsdt && rewardBudgetUsdt > 0
    ? Math.floor(rewardBudgetUsdt / dailyCampaignBurnUsdt)
    : null;

  return NextResponse.json({
    wallet,
    solPriceUsdt: pricing.solPriceUsdt,
    usdtSource: pricing.usdtSource,
    approximate: pricing.usdtApproximate,
    totals: {
      tokenCount: tokenRows.length,
      lifetimeFeesSol: lamportsToSolAmount(lifetimeFeesLamports),
      lifetimeFeesUsdt: lamportsToUsdt(lifetimeFeesLamports, pricing.solPriceUsdt),
      estimatedCreatorShareSol,
      estimatedCreatorShareUsdt: estimatedCreatorShareSol * pricing.solPriceUsdt,
      claimed24hSol: lamportsToSolAmount(claimedFees24hLamports),
      claimed24hUsdt: lamportsToUsdt(claimedFees24hLamports, pricing.solPriceUsdt),
      feeVelocity24hSol: lamportsToSolAmount(feeVelocity24hLamports),
      feeVelocity24hUsdt: lamportsToUsdt(feeVelocity24hLamports, pricing.solPriceUsdt),
      plannedCampaignBudgetUsdt,
      fundedCampaignBudgetUsdt,
    },
    planner: {
      keepSolPercent,
      convertUsdtPercent,
      rewardsPercent,
      retainedSol,
      treasuryUsdt,
      rewardBudgetUsdt,
      runwayDays,
      dailyCampaignBurnUsdt,
    },
    fundingProofs,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      tokenMint: campaign.tokenMint,
      title: campaign.title,
      budgetUsdt: numeric(campaign.budgetUsdt),
      status: campaign.status,
      fundingTxSignature: campaign.fundingTxSignature,
      solscanHref: campaign.fundingTxSignature ? `https://solscan.io/tx/${campaign.fundingTxSignature}` : null,
    })),
    tokenRows,
    previewOnly: true,
    sourceLabels: {
      tokens: "local_creator_index",
      fees: "bags_lifetime_fees",
      claims: "bags_claim_events",
      velocity: "fee_snapshots",
      usdt: pricing.usdtSource,
      campaigns: "reward_campaigns",
      fundingProofs: "wallet_submitted_spl_usdt_tx",
    },
    safety: {
      automaticPayoutExecution: false,
      fundingProofOnly: true,
      message: "SignalCred never executes USDT payouts in this flow; creators attach external SPL USDT transaction proof.",
    },
    noFakeData: true,
    generatedAt: new Date().toISOString(),
  });
}
