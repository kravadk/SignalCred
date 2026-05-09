import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { feeEvents, rewardCampaigns } from "@/db/schema";
import { db } from "@/lib/db";
import { getBagsClaimEvents, getBagsCreators, getBagsLifetimeFees } from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { feeVelocityValue } from "@/lib/fee-velocity-display";
import { buildStableFeeFields, getUsdtPricing, lamportsToUsdt } from "@/lib/stable-fees";
import { formatLamports, shortWallet } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type StepStatus = "ok" | "pending" | "unavailable" | "warning";

function estimateCreatorBps(creators: Awaited<ReturnType<typeof getBagsCreators>>) {
  const creatorBps = creators
    .filter((creator) => creator.isCreator || creator.wallet)
    .reduce((sum, creator) => sum + Number(creator.royaltyBps ?? 0), 0);

  return creatorBps > 0 && creatorBps <= 10_000 ? creatorBps : 7_500;
}

function safeLamports(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function statusFromBoolean(done: boolean, emptyStatus: StepStatus = "pending"): StepStatus {
  return done ? "ok" : emptyStatus;
}

function eventTimestamp(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

export async function GET(_req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;

  const [
    lifetimeFeesResult,
    claimEventsResult,
    claimEvents24hResult,
    creatorsResult,
    receiptsResult,
    campaignsResult,
    pricingResult,
  ] = await Promise.allSettled([
    getBagsLifetimeFees(params.mint),
    getBagsClaimEvents(params.mint, { limit: 50 }),
    getBagsClaimEvents(params.mint, { from: since24h, to: now, limit: 100 }),
    getBagsCreators(params.mint),
    db
      .select()
      .from(feeEvents)
      .where(and(eq(feeEvents.tokenMint, params.mint), eq(feeEvents.eventType, "claim_receipt")))
      .orderBy(desc(feeEvents.createdAt))
      .limit(25),
    db
      .select()
      .from(rewardCampaigns)
      .where(eq(rewardCampaigns.tokenMint, params.mint))
      .orderBy(desc(rewardCampaigns.createdAt))
      .limit(50),
    getUsdtPricing(),
  ]);

  const lifetimeFeesAvailable = lifetimeFeesResult.status === "fulfilled";
  const lifetimeFeesLamports = lifetimeFeesAvailable ? safeLamports(lifetimeFeesResult.value) : 0;
  const creators = creatorsResult.status === "fulfilled" ? creatorsResult.value : [];
  const creatorBps = estimateCreatorBps(creators);
  const creatorFeeLamports = Math.floor(lifetimeFeesLamports * (creatorBps / 10_000));
  const platformFeeLamports = Math.max(lifetimeFeesLamports - creatorFeeLamports, 0);

  const claimEventsRaw = claimEventsResult.status === "fulfilled" ? claimEventsResult.value : [];
  const claimEvents24hRaw = claimEvents24hResult.status === "fulfilled" ? claimEvents24hResult.value : [];
  const claimEventsAvailable = claimEventsResult.status === "fulfilled" && claimEvents24hResult.status === "fulfilled";
  const claimedFees24hLamports = claimEvents24hRaw.reduce((sum, event) => sum + safeLamports(event.amount), 0);

  const receipts = receiptsResult.status === "fulfilled" ? receiptsResult.value : [];
  const campaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : [];
  const pricing = pricingResult.status === "fulfilled"
    ? pricingResult.value
    : { solPriceUsdt: 0, usdtSource: "dexscreener_sol_usdt" as const, usdtApproximate: true };

  const feeVelocity = lifetimeFeesAvailable
    ? await getFeeVelocity24h(params.mint, lifetimeFeesLamports)
    : {
        currentLifetimeFeesLamports: lifetimeFeesLamports,
        feeVelocity24hLamports: null,
        status: "unavailable" as const,
        snapshotSource: "fee_snapshots" as const,
        currentSnapshotAt: null,
        baselineSnapshotAt: null,
        baselineLifetimeFeesLamports: null,
        message: "Bags lifetime fees unavailable, so fee velocity cannot be calculated.",
      };

  const stableFees = buildStableFeeFields({
    solPriceUsdt: pricing.solPriceUsdt,
    lifetimeFeesLamports,
    feeVelocity24hLamports: feeVelocity.feeVelocity24hLamports,
    claimedFees24hLamports,
    creatorFeeLamports,
    platformFeeLamports,
  });

  const claimEvents = claimEventsRaw.map((event, index) => {
    const amountLamports = safeLamports(event.amount);
    return {
      id: event.signature ?? `${params.mint}-bags-claim-${index}`,
      wallet: event.wallet ?? null,
      walletShort: event.wallet ? shortWallet(event.wallet) : "unknown",
      isCreator: Boolean(event.isCreator),
      amountLamports,
      amountUsdt: lamportsToUsdt(amountLamports, pricing.solPriceUsdt),
      amountFormatted: amountLamports ? formatLamports(amountLamports) : null,
      signature: event.signature ?? null,
      txSignature: event.signature ?? null,
      timestamp: eventTimestamp(event.timestamp),
      href: event.signature ? `https://solscan.io/tx/${event.signature}` : null,
      source: "bags_claim_events",
    };
  });

  const claimReceipts = receipts.map((receipt) => ({
    id: receipt.id,
    wallet: receipt.wallet ?? null,
    walletShort: receipt.wallet ? shortWallet(receipt.wallet) : "unknown",
    amountLamports: receipt.amountLamports == null ? null : safeLamports(receipt.amountLamports),
    amountUsdt: receipt.amountLamports == null ? null : lamportsToUsdt(safeLamports(receipt.amountLamports), pricing.solPriceUsdt),
    txSignature: receipt.txSignature,
    href: receipt.txSignature ? `https://solscan.io/tx/${receipt.txSignature}` : null,
    timestamp: receipt.createdAt.toISOString(),
    source: "wallet_submitted_receipt",
    note: "Wallet-submitted receipt only; amount is shown only if recorded from a real event.",
  }));

  const campaignRows = campaigns.map((campaign) => ({
    id: campaign.id,
    tokenMint: campaign.tokenMint,
    creatorWallet: campaign.creatorWallet,
    title: campaign.title,
    description: campaign.description,
    budgetUsdt: Number(campaign.budgetUsdt ?? 0),
    status: campaign.status,
    fundingTxSignature: campaign.fundingTxSignature ?? null,
    fundedByWallet: campaign.fundedByWallet ?? null,
    fundedAt: campaign.fundedAt?.toISOString() ?? null,
    fundingAsset: campaign.fundingAsset ?? "USDT-SPL",
    href: campaign.fundingTxSignature ? `https://solscan.io/tx/${campaign.fundingTxSignature}` : null,
    previewOnly: campaign.status !== "funded",
    source: "reward_campaigns",
  }));

  const fundingProofs = campaignRows
    .filter((campaign) => campaign.fundingTxSignature)
    .map((campaign) => ({
      id: campaign.id,
      campaignId: campaign.id,
      title: campaign.title,
      asset: campaign.fundingAsset,
      txSignature: campaign.fundingTxSignature,
      href: campaign.href,
      fundedByWallet: campaign.fundedByWallet,
      fundedAt: campaign.fundedAt,
      source: "wallet_submitted_usdt_funding_proof",
    }));

  const plannedBudgetUsdt = campaignRows.reduce((sum, campaign) => sum + campaign.budgetUsdt, 0);
  const fundedBudgetUsdt = campaignRows
    .filter((campaign) => campaign.status === "funded")
    .reduce((sum, campaign) => sum + campaign.budgetUsdt, 0);

  const steps = [
    {
      id: "fees_generated",
      label: "Generated fees",
      status: feeVelocity.status === "active" ? "ok" : feeVelocity.status === "pending" ? "pending" : "unavailable",
      value: feeVelocityValue(feeVelocity.status, feeVelocity.feeVelocity24hLamports),
      usdtValue: stableFees.feeVelocity24hUsdt,
      description: feeVelocity.status === "active" ? "24h generated fees calculated from hourly snapshots." : feeVelocity.message,
      source: feeVelocity.snapshotSource,
      timestamp: feeVelocity.currentSnapshotAt,
    },
    {
      id: "fees_claimed",
      label: "Claimed fees",
      status: claimEventsAvailable ? statusFromBoolean(claimEvents.length > 0) : "unavailable",
      value: formatLamports(claimedFees24hLamports),
      usdtValue: stableFees.claimedFees24hUsdt,
      description: claimEvents.length ? "Bags claim events indexed with Solscan receipts." : "No claim events indexed yet.",
      source: "bags_claim_events",
      timestamp: claimEvents[0]?.timestamp ?? null,
      href: claimEvents[0]?.href ?? null,
    },
    {
      id: "claim_receipt",
      label: "Wallet receipt",
      status: statusFromBoolean(claimReceipts.length > 0),
      value: claimReceipts.length ? `${claimReceipts.length} receipt${claimReceipts.length === 1 ? "" : "s"}` : null,
      description: claimReceipts.length ? "Creator/admin wallet submitted claim receipts." : "No wallet-submitted claim receipts yet.",
      source: "fee_events",
      timestamp: claimReceipts[0]?.timestamp ?? null,
      href: claimReceipts[0]?.href ?? null,
    },
    {
      id: "campaign_planned",
      label: "USDT campaign planned",
      status: statusFromBoolean(campaignRows.length > 0),
      value: plannedBudgetUsdt ? `$${plannedBudgetUsdt.toFixed(2)} USDT` : null,
      description: campaignRows.length ? "USDT reward budget is planned for this token." : "Preview only - no transaction executed.",
      source: "reward_campaigns",
      timestamp: campaignRows[0]?.fundedAt ?? null,
    },
    {
      id: "campaign_funded",
      label: "USDT funding proof",
      status: statusFromBoolean(fundingProofs.length > 0),
      value: fundedBudgetUsdt ? `$${fundedBudgetUsdt.toFixed(2)} USDT` : null,
      description: fundingProofs.length ? "Funding proof attached from an external SPL USDT transaction." : "No funding proof attached.",
      source: "wallet_submitted_usdt_funding_proof",
      timestamp: fundingProofs[0]?.fundedAt ?? null,
      href: fundingProofs[0]?.href ?? null,
    },
  ] satisfies Array<{
    id: string;
    label: string;
    status: StepStatus;
    value?: string | null;
    usdtValue?: number | null;
    description: string;
    source: string;
    timestamp?: string | null;
    href?: string | null;
  }>;

  return NextResponse.json({
    mint: params.mint,
    lifetimeFeesLamports,
    lifetimeFeesUsdt: stableFees.lifetimeFeesUsdt,
    feeVelocity24hLamports: feeVelocity.feeVelocity24hLamports,
    feeVelocity24hUsdt: stableFees.feeVelocity24hUsdt,
    feeVelocityStatus: feeVelocity.status,
    claimedFees24hLamports,
    claimedFees24hUsdt: stableFees.claimedFees24hUsdt,
    creatorFeeLamports,
    creatorFeeUsdt: stableFees.creatorFeeUsdt,
    platformFeeLamports,
    platformFeeUsdt: stableFees.platformFeeUsdt,
    solPriceUsdt: pricing.solPriceUsdt,
    usdtSource: pricing.usdtSource,
    usdtApproximate: pricing.usdtApproximate,
    claimEvents,
    claimReceipts,
    campaigns: campaignRows,
    fundingProofs,
    campaignTotals: {
      count: campaignRows.length,
      plannedBudgetUsdt,
      fundedBudgetUsdt,
    },
    steps,
    sourceLabels: {
      fees: lifetimeFeesAvailable ? "bags_lifetime_fees" : "bags_lifetime_fees_unavailable",
      feeVelocity: feeVelocity.status === "active" ? "fee_snapshots" : `fee_snapshots_${feeVelocity.status}`,
      claims: claimEventsAvailable ? "bags_claim_events" : "bags_claim_events_unavailable",
      receipts: "fee_events",
      campaigns: "reward_campaigns",
      fundingProofs: "wallet_submitted_usdt_funding_proof",
      usdt: pricing.usdtSource,
    },
    noFakeData: true,
    generatedAt: new Date().toISOString(),
  });
}
