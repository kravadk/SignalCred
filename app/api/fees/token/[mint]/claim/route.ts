import { NextRequest, NextResponse } from "next/server";
import { getClaimTxsForToken, serializeLegacyTx } from "@/lib/bags";
import { verifyWalletRequest } from "@/lib/wallet-auth";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const auth = verifyWalletRequest(req, { action: "claim-fees", mint: params.mint });
  if (!auth.ok) return auth.response;

  try {
    const txs = await getClaimTxsForToken(auth.wallet, params.mint);

    if (!txs.length) {
      return NextResponse.json({ error: "No claimable fees for this token" }, { status: 404 });
    }

    const serialized = txs.map(serializeLegacyTx);
    return NextResponse.json({ txs: serialized });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
