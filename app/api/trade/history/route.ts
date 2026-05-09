export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trades } from "@/db/schema";
import { BASE58_WALLET, jsonError } from "@/lib/api-guards";
import { rateLimit } from "@/lib/rate-limit";

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function solscanTx(signature: string | null) {
  return signature ? `https://solscan.io/tx/${signature}` : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = (searchParams.get("wallet") || req.headers.get("x-wallet") || "").trim();

  if (!BASE58_WALLET.test(wallet)) {
    return jsonError("Valid wallet required", 400, "invalid_wallet", "Open history with a valid wallet address.");
  }

  const rl = rateLimit(`trade-history:${clientKey(req)}:${wallet}`, 60, 60_000);
  if (!rl.allowed) {
    return jsonError("Rate limit", 429, "rate_limit", "Too many history requests. Wait a moment and try again.");
  }

  const rows = await db
    .select()
    .from(trades)
    .where(eq(trades.wallet, wallet))
    .orderBy(desc(trades.createdAt))
    .limit(25);

  return NextResponse.json({
    wallet,
    count: rows.length,
    history: rows.map((row) => ({
      id: row.id,
      wallet: row.wallet,
      inputMint: row.inputMint,
      outputMint: row.outputMint,
      inAmount: row.inAmount,
      outAmount: row.outAmount,
      priceImpactPct: row.priceImpactPct,
      txSignature: row.txSignature,
      explorerHref: solscanTx(row.txSignature),
      status: row.txSignature ? "confirmed" : "prepared",
      createdAt: row.createdAt,
    })),
    source: "signalcred_trade_events",
    noFakeData: true,
  });
}
