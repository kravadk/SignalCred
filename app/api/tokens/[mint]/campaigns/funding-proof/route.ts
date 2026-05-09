import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { rewardCampaigns, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getBagsCreators } from "@/lib/bags-index";
import { rateLimit } from "@/lib/rate-limit";
import { verifyWalletRequest } from "@/lib/wallet-auth";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,100}$/;
const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!MINT.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const auth = verifyWalletRequest(req, { action: "campaign-funding-proof", mint: params.mint });
  if (!auth.ok) return auth.response;

  const rl = rateLimit(`campaign-funding-proof:${auth.wallet}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const txSignature = typeof body.txSignature === "string" ? body.txSignature.trim() : "";
  const campaignId = typeof body.campaignId === "string" ? body.campaignId : null;
  if (!BASE58.test(txSignature)) {
    return NextResponse.json({ error: "Invalid txSignature" }, { status: 400 });
  }
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (!UUID.test(campaignId)) {
    return NextResponse.json({ error: "Invalid campaignId" }, { status: 400 });
  }

  const [token, creators] = await Promise.all([
    db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) }),
    getBagsCreators(params.mint),
  ]);
  if (!token) return NextResponse.json({ error: "Token not indexed" }, { status: 404 });

  const verifiedWallets = new Set(
    creators
      .filter((creator) => creator.isCreator || creator.isAdmin)
      .map((creator) => creator.wallet)
      .filter((wallet): wallet is string => typeof wallet === "string")
  );
  if (!verifiedWallets.has(auth.wallet)) {
    return NextResponse.json({
      error: "Only Bags creators API verified creator/admin wallets can attach USDT funding proof",
      verification: creators.length ? "creators_api" : "creators_api_empty",
    }, { status: 403 });
  }

  const [campaign] = await db
    .update(rewardCampaigns)
    .set({
      status: "funded",
      fundingTxSignature: txSignature,
      fundedByWallet: auth.wallet,
      fundedAt: new Date(),
      fundingAsset: "USDT-SPL",
      updatedAt: new Date(),
    })
    .where(and(eq(rewardCampaigns.id, campaignId), eq(rewardCampaigns.tokenMint, params.mint)))
    .returning();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found for token" }, { status: 404 });
  }

  return NextResponse.json({
    fundingProof: {
      status: "funded",
      execution: "external_wallet_signature",
      asset: "USDT-SPL",
      txSignature,
      explorerHref: `https://solscan.io/tx/${txSignature}`,
      campaignId,
      campaignStatus: campaign.status,
      attachedBy: auth.wallet,
      message: "Funding proof attached. SignalCred did not execute a USDT transfer.",
    },
  });
}
