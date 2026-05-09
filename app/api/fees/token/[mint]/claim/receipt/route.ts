import { NextRequest, NextResponse } from "next/server";
import { feeEvents } from "@/db/schema";
import { db } from "@/lib/db";
import { verifyWalletRequest } from "@/lib/wallet-auth";

export const dynamic = "force-dynamic";

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,100}$/;

export async function POST(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!MINT.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const auth = verifyWalletRequest(req, { action: "claim-receipt", mint: params.mint });
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const txSignature = typeof body.txSignature === "string" ? body.txSignature.trim() : "";
  if (!BASE58.test(txSignature)) {
    return NextResponse.json({ error: "Invalid txSignature" }, { status: 400 });
  }

  await db
    .insert(feeEvents)
    .values({
      tokenMint: params.mint,
      wallet: auth.wallet,
      eventType: "claim_receipt",
      txSignature,
    })
    .onConflictDoNothing();

  return NextResponse.json({
    receipt: {
      status: "recorded",
      tokenMint: params.mint,
      wallet: auth.wallet,
      txSignature,
      explorerHref: `https://solscan.io/tx/${txSignature}`,
      source: "wallet_submitted_receipt",
      message: "Claim receipt recorded after wallet execution. BagsPulse did not fabricate a claim event.",
    },
  });
}
