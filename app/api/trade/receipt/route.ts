export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trades } from "@/db/schema";
import { BASE58_WALLET, UUID, jsonError, readJson, readWallet } from "@/lib/api-guards";
import { rateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-error";

const TX_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");

export async function POST(req: NextRequest) {
  const wallet = readWallet(req);
  if (!wallet || !BASE58_WALLET.test(wallet)) {
    return jsonError("Valid wallet required", 401, "invalid_wallet", "Connect a valid wallet before saving a trade receipt.");
  }

  const rl = rateLimit(`trade-receipt:${wallet}`, 20, 60_000);
  if (!rl.allowed) {
    return jsonError("Rate limit", 429, "rate_limit", "Too many receipt updates. Wait a moment and try again.");
  }

  const body = await readJson(req);
  if (!body) {
    return jsonError("Invalid JSON body", 400, "invalid_json", "The trade receipt could not be read. Refresh and try again.");
  }

  const tradeId = String(body.tradeId ?? "");
  const txSignature = String(body.txSignature ?? "");
  if (!UUID.test(tradeId)) {
    return jsonError("Invalid tradeId", 400, "invalid_trade_id", "This trade receipt is missing a valid local trade id.");
  }
  if (!TX_SIG.test(txSignature)) {
    return jsonError("Invalid txSignature", 400, "invalid_signature", "The wallet returned an invalid Solana transaction signature.");
  }

  let chainStatus: "confirmed" | "submitted" | "failed" = "submitted";
  try {
    const { value } = await connection.getSignatureStatuses([txSignature], {
      searchTransactionHistory: true,
    });
    const status = value[0];
    if (status?.err) chainStatus = "failed";
    else if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      chainStatus = "confirmed";
    }
  } catch (error) {
    console.warn("[trade-receipt] signature status unavailable", safeError(error));
  }

  const [updated] = await db
    .update(trades)
    .set({ txSignature })
    .where(and(eq(trades.id, tradeId), eq(trades.wallet, wallet)))
    .returning();

  if (!updated) {
    return jsonError("Trade not found", 404, "trade_not_found", "This trade record was not found for the connected wallet.");
  }

  return NextResponse.json({
    trade: {
      id: updated.id,
      wallet: updated.wallet,
      inputMint: updated.inputMint,
      outputMint: updated.outputMint,
      inAmount: updated.inAmount,
      outAmount: updated.outAmount,
      priceImpactPct: updated.priceImpactPct,
      txSignature: updated.txSignature,
      status: chainStatus,
      explorerHref: `https://solscan.io/tx/${txSignature}`,
      createdAt: updated.createdAt,
    },
    source: "signalcred_trade_receipt",
    noFakeData: true,
  });
}
