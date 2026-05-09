export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createSwapTx, getTradeQuote, serializeVersionedTx, SOL_MINT } from "@/lib/bags";
import { db } from "@/lib/db";
import { trades, users } from "@/db/schema";
import { PublicKey } from "@solana/web3.js";
import { USDT_MINT } from "@/lib/usdt";
import { rateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-error";
import { jsonError } from "@/lib/api-guards";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet || !BASE58.test(wallet)) {
    return jsonError("Valid wallet required", 401, "invalid_wallet", "Connect a valid wallet before preparing a swap.");
  }

  const rl = rateLimit(`swap:${wallet}`, 30, 60_000);
  if (!rl.allowed) {
    return jsonError("Rate limit", 429, "rate_limit", "Too many swap requests. Wait a moment and refresh the quote.");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400, "invalid_json", "The swap request could not be read. Refresh and try again.");
  }
  const { quoteResponse } = body;
  const requestedOutputMint = typeof body.outputMint === "string" ? body.outputMint : undefined;

  if (!quoteResponse || typeof quoteResponse !== "object") {
    return jsonError("quoteResponse required", 400, "missing_quote", "Refresh the quote before opening the wallet.");
  }
  const quote = quoteResponse as Record<string, unknown>;

  // Strict shape validation - refuse unknown fields/types.
  const inputMint = String(quote.inputMint ?? "");
  const outputMint = String(quote.outputMint ?? "");
  const inAmount = String(quote.inAmount ?? "");
  const slippageBps = Number(quote.slippageBps ?? 100);

  if (!BASE58.test(inputMint) || !BASE58.test(outputMint)) {
    return jsonError("Invalid mints in quote", 400, "invalid_quote_mints", "This quote contains an invalid mint. Refresh the page.");
  }
  // Force one side of the pair to be a known asset
  const supported = new Set([SOL_MINT, USDT_MINT]);
  if (!supported.has(inputMint) && !supported.has(outputMint)) {
    return jsonError("Unsupported pair", 400, "unsupported_pair", "Only SOL/USDT routes into or out of this Bags token are supported here.");
  }
  // Optional client-supplied outputMint must match the quote's outputMint (no rebinding)
  if (requestedOutputMint && requestedOutputMint !== outputMint) {
    return jsonError("outputMint does not match quote", 400, "quote_rebinding_blocked", "The quote changed before signing. Refresh and try again.");
  }
  const inAmountNum = Number(inAmount);
  if (!Number.isFinite(inAmountNum) || inAmountNum <= 0 || inAmountNum > 1e18) {
    return jsonError("Invalid inAmount", 400, "invalid_amount", "Trade amount is invalid.");
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
    return jsonError("Invalid slippageBps", 400, "invalid_slippage", "Slippage must be between 0% and 50%.");
  }

  try {
    // Re-quote on the server with the same parameters and ensure the result
    // is consistent (within tolerance) with the client-supplied quoteResponse.
    // This prevents the client from forging a malicious route.
    let serverQuote;
    try {
      serverQuote = await getTradeQuote({
        inputMint, outputMint,
        amount: inAmountNum,
        slippageBps,
      });
    } catch (e) {
      return jsonError("Could not re-quote", 502, "quote_unavailable", safeError(e));
    }

    // Compare outAmounts: allow <=10% drift due to market movement; block large gaps.
    const clientOut = Number(quote.outAmount ?? 0);
    const serverOut = Number((serverQuote as { outAmount?: number | string }).outAmount ?? 0);
    if (Number.isFinite(clientOut) && Number.isFinite(serverOut) && serverOut > 0) {
      const drift = Math.abs(serverOut - clientOut) / serverOut;
      if (drift > 0.1) {
        return NextResponse.json({
          error: "Quote drifted; refresh and try again",
          errorType: "quote_drift",
          userMessage: "Price moved too much before signing. Refresh the quote and try again.",
          serverOut,
          clientOut,
        }, { status: 409 });
      }
    }

    const tx = await createSwapTx(serverQuote, new PublicKey(wallet));
    const txBase64 = serializeVersionedTx(tx);

    await db.insert(users).values({ wallet }).onConflictDoNothing();
    const [trade] = await db.insert(trades).values({
      wallet,
      inputMint, outputMint,
      inAmount: String(inAmountNum),
      outAmount: String(serverOut || clientOut || 0),
      priceImpactPct: String(quote.priceImpactPct ?? 0),
    }).returning({ id: trades.id });

    return NextResponse.json({
      tx: txBase64,
      tradeId: trade?.id ?? null,
      safety: {
        serverRequoted: true,
        quoteBinding: "input/output/amount/slippage validated",
        custody: "user_wallet_signs_transaction",
      },
    });
  } catch (e) {
    return jsonError("Swap preparation failed", 500, "swap_prepare_failed", safeError(e));
  }
}
