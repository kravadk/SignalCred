import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { feeEvents, posts } from "@/db/schema";
import { db } from "@/lib/db";
import { getBagsClaimEvents, getBagsLifetimeFees } from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { rateLimit } from "@/lib/rate-limit";
import { buildTokenSocialContext } from "@/lib/token-social-proof";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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

function event(id: string, type: string, status: string, label: string, description: string, source: string, href: string | null, timestamp: string | null, weight: number) {
  return { id, type, status, label, description, source, href, timestamp, weight };
}

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`social-events:${ip}`, 50, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;
  const [context, tokenPosts, lifetimeFeesRaw, claimEvents24h, localReceipts] = await Promise.all([
    withTimeout(buildTokenSocialContext(params.mint), 5_000, null),
    db.select().from(posts).where(eq(posts.tokenMint, params.mint)).orderBy(desc(posts.createdAt)).limit(40),
    withTimeout(getBagsLifetimeFees(params.mint), 2_500, null),
    withTimeout(getBagsClaimEvents(params.mint, { from: since24h, to: now, limit: 40 }), 2_500, []),
    db.select().from(feeEvents).where(eq(feeEvents.tokenMint, params.mint)).orderBy(desc(feeEvents.createdAt)).limit(20),
  ]);

  if (!context) {
    return NextResponse.json({ error: "Social events unavailable" }, { status: 503 });
  }

  const lifetimeFeesLamports = safeLamports(lifetimeFeesRaw);
  const velocity = await withTimeout(getFeeVelocity24h(params.mint, lifetimeFeesLamports), 2_500, null);
  const officialPosts = tokenPosts.filter((post) => post.postType === "official");
  const communityPosts = tokenPosts.filter((post) => post.postType !== "official");
  const completedMilestones = context.milestones.filter((milestone) => milestone.status === "completed");
  const campaigns = context.campaigns ?? [];

  const events = [
    ...officialPosts.slice(0, 8).map((post) => event(
      `official:${post.id}`,
      "official_update",
      "verified",
      "Official creator update",
      post.content.slice(0, 180),
      "wallet_signature + bags_creators_api",
      `/square?token=${params.mint}`,
      post.createdAt?.toISOString?.() ?? null,
      25
    )),
    ...communityPosts.slice(0, 10).map((post) => event(
      `community:${post.id}`,
      "community_proof_note",
      "verified",
      post.postType === "analysis" ? "Community proof note" : "Token-linked community post",
      post.content.slice(0, 180),
      "token_linked_square_posts",
      `/square?token=${params.mint}`,
      post.createdAt?.toISOString?.() ?? null,
      post.postType === "analysis" ? 12 : 8
    )),
    ...completedMilestones.slice(0, 8).map((milestone) => event(
      `milestone:${milestone.id}`,
      "milestone",
      "verified",
      milestone.label,
      `${milestone.value} from ${milestone.source}`,
      milestone.source,
      milestone.href ?? `/token/${params.mint}`,
      milestone.completedAt ?? null,
      10
    )),
    ...campaigns.slice(0, 8).map((campaign) => event(
      `campaign:${campaign.id}`,
      "campaign",
      campaign.status === "funded" || campaign.fundingTxSignature ? "verified" : "pending",
      campaign.status === "funded" || campaign.fundingTxSignature ? "USDT campaign funding proof" : "USDT campaign planned",
      `${campaign.title} / ${Number(campaign.budgetUsdt ?? 0).toLocaleString()} USDT`,
      campaign.fundingTxSignature ? "wallet_submitted_spl_usdt_tx" : "reward_campaigns",
      campaign.fundingTxSignature ? `https://solscan.io/tx/${campaign.fundingTxSignature}` : `/token/${params.mint}`,
      campaign.fundedAt?.toISOString?.() ?? campaign.createdAt?.toISOString?.() ?? null,
      campaign.status === "funded" || campaign.fundingTxSignature ? 18 : 9
    )),
    lifetimeFeesLamports > 0 ? event(
      "fee:lifetime",
      "fee_event",
      "verified",
      "Bags fees generated",
      `${(lifetimeFeesLamports / 1e9).toFixed(4)} SOL lifetime fees indexed.`,
      "bags_lifetime_fees",
      `https://bags.fm/token/${params.mint}`,
      new Date().toISOString(),
      18
    ) : event(
      "fee:lifetime",
      "fee_event",
      "pending",
      "Fees not indexed yet",
      "Bags lifetime fee proof is still pending. Score does not fake this value.",
      "bags_lifetime_fees",
      `https://bags.fm/token/${params.mint}`,
      null,
      0
    ),
    velocity?.status === "active" ? event(
      "fee:velocity",
      "fee_event",
      "verified",
      "Fee velocity active",
      "24h fee baseline is active from hourly snapshots.",
      "fee_snapshots",
      `/passport/${params.mint}`,
      new Date().toISOString(),
      12
    ) : event(
      "fee:velocity",
      "fee_event",
      "pending",
      "Fee velocity baseline warming",
      "Needs an older hourly snapshot before 24h generated fees can be compared.",
      "fee_snapshots",
      `/passport/${params.mint}`,
      null,
      0
    ),
    ...claimEvents24h.slice(0, 6).map((claim, index) => event(
      `claim:${claim.signature ?? index}`,
      "claim_receipt",
      "verified",
      "Bags claim event",
      `${claim.wallet ? `${claim.wallet.slice(0, 4)}...${claim.wallet.slice(-4)}` : "wallet"} claimed ${safeLamports(claim.amount) / 1e9} SOL.`,
      "bags_claim_events",
      claim.signature ? `https://solscan.io/tx/${claim.signature}` : `https://bags.fm/token/${params.mint}`,
      claim.timestamp ?? null,
      10
    )),
    ...localReceipts.filter((receipt) => receipt.eventType === "claim_receipt").slice(0, 6).map((receipt) => event(
      `receipt:${receipt.id}`,
      "claim_receipt",
      "verified",
      "Wallet-submitted claim receipt",
      receipt.txSignature ? `Receipt ${receipt.txSignature.slice(0, 6)}...${receipt.txSignature.slice(-6)}` : "Receipt attached without amount.",
      "fee_events",
      receipt.txSignature ? `https://solscan.io/tx/${receipt.txSignature}` : `/token/${params.mint}`,
      receipt.createdAt?.toISOString?.() ?? null,
      10
    )),
  ].sort((a, b) => b.weight - a.weight);

  const penalties = [
    context.socialProof.spamRisk > 0 ? {
      id: "spam-risk",
      label: "Spam / duplicate risk",
      severity: context.socialProof.spamRisk > 60 ? "high" : "medium",
      value: context.socialProof.spamRisk,
      source: "token_social_proof",
    } : null,
    context.socialProof.communityPostsCount >= 5 && lifetimeFeesLamports === 0 ? {
      id: "social-without-fees",
      label: "Social activity without fee proof",
      severity: "medium",
      value: context.socialProof.communityPostsCount,
      source: "square_posts + bags_lifetime_fees",
    } : null,
  ].filter(Boolean);

  return NextResponse.json({
    token: context.token,
    socialScore: context.socialProof.socialScore,
    scoreBreakdown: context.socialProof.scoreBreakdown,
    events,
    penalties,
    sourceLabels: {
      official: "wallet_signature + bags_creators_api",
      community: "token_linked_square_posts",
      milestones: "derived_real_milestones",
      campaigns: "reward_campaigns",
      fees: "bags_lifetime_fees + fee_snapshots",
      claims: "bags_claim_events + fee_events",
    },
    rankingPolicy: "Proof-ranked social validation: token-linked only, capped reactions, visible penalties, no AI magic.",
    tokenLinkedOnly: true,
    noFakeData: true,
    generatedAt: new Date().toISOString(),
  });
}
