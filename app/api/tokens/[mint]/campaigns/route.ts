import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { rewardCampaigns, tokens, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getBagsCreators } from "@/lib/bags-index";
import { rateLimit } from "@/lib/rate-limit";
import { verifyWalletRequest } from "@/lib/wallet-auth";
import { logAction } from "@/lib/action-log";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const CAMPAIGN_STATUSES = new Set(["planned", "funded", "completed", "cancelled"]);

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`campaigns-read:${ip}`, 80, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const campaigns = await db
    .select()
    .from(rewardCampaigns)
    .where(eq(rewardCampaigns.tokenMint, params.mint))
    .orderBy(desc(rewardCampaigns.createdAt))
    .limit(50);

  return NextResponse.json({
    campaigns,
    previewOnly: true,
    fundingProof: {
      status: "preview_only",
      execution: "none",
      asset: "USDT-SPL",
      txSignature: null,
      explorerHref: null,
      message: "No USDT transfer is executed by this planner. A future funded state should attach a wallet-signed SPL USDT transaction signature.",
    },
    message: "Campaign budgets are preview/planning only. No USDT transaction is executed.",
  });
}

export async function POST(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    logAction({ action: "campaign.create", type: "validation", status: "error", tokenMint: params.mint, errorType: "invalid_mint" });
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const auth = verifyWalletRequest(req, { action: "create-campaign", mint: params.mint });
  if (!auth.ok) {
    logAction({ action: "campaign.create", type: "auth", status: "error", tokenMint: params.mint, errorType: "wallet_signature" });
    return auth.response;
  }

  const rl = rateLimit(`campaigns-write:${auth.wallet}`, 5, 60_000);
  if (!rl.allowed) {
    logAction({ action: "campaign.create", type: "rate_limit", status: "error", wallet: auth.wallet, tokenMint: params.mint, errorType: "rate_limit" });
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const title = cleanText(body.title, 120);
  const description = cleanText(body.description, 600);
  const budgetUsdt = Number(body.budgetUsdt);
  const status = typeof body.status === "string" && CAMPAIGN_STATUSES.has(body.status)
    ? body.status
    : "planned";

  if (title.length < 3) {
    logAction({ action: "campaign.create", type: "validation", status: "error", wallet: auth.wallet, tokenMint: params.mint, errorType: "title_too_short" });
    return NextResponse.json({ error: "Campaign title is too short" }, { status: 400 });
  }
  if (!Number.isFinite(budgetUsdt) || budgetUsdt < 1 || budgetUsdt > 100_000) {
    logAction({ action: "campaign.create", type: "validation", status: "error", wallet: auth.wallet, tokenMint: params.mint, errorType: "invalid_budget" });
    return NextResponse.json({ error: "budgetUsdt must be between 1 and 100000" }, { status: 400 });
  }

  const [token, creators] = await Promise.all([
    db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) }),
    getBagsCreators(params.mint),
  ]);
  if (!token) {
    logAction({ action: "campaign.create", type: "lookup", status: "error", wallet: auth.wallet, tokenMint: params.mint, errorType: "token_not_indexed" });
    return NextResponse.json({ error: "Token not indexed" }, { status: 404 });
  }

  const verifiedWallets = new Set(
    creators
      .filter((creator) => creator.isCreator || creator.isAdmin)
      .map((creator) => creator.wallet)
      .filter((wallet): wallet is string => typeof wallet === "string")
  );
  if (!verifiedWallets.has(auth.wallet)) {
    logAction({ action: "campaign.create", type: "creator_proof", status: "error", wallet: auth.wallet, tokenMint: params.mint, errorType: "creator_not_verified" });
    return NextResponse.json({
      error: "Only Bags creators API verified creator/admin wallets can create USDT campaigns",
      verification: creators.length ? "creators_api" : "creators_api_empty",
    }, { status: 403 });
  }

  await db.insert(users).values({ wallet: auth.wallet }).onConflictDoNothing();
  const [campaign] = await db
    .insert(rewardCampaigns)
    .values({
      tokenMint: params.mint,
      creatorWallet: auth.wallet,
      title,
      description: description || null,
      budgetUsdt: budgetUsdt.toFixed(2),
      status,
    })
    .returning();

  logAction({ action: "campaign.create", type: "usdt_budget", status: "success", wallet: auth.wallet, tokenMint: params.mint, meta: { campaignId: campaign.id, budgetUsdt: budgetUsdt.toFixed(2), previewOnly: true } });
  return NextResponse.json({
    campaign,
    previewOnly: true,
    fundingProof: {
      status: "preview_only",
      execution: "none",
      asset: "USDT-SPL",
      txSignature: null,
      explorerHref: null,
      message: "Campaign saved without executing a USDT transfer.",
    },
    message: "Campaign saved as a planned USDT budget. No transaction executed.",
  });
}
