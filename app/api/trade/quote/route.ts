import { NextRequest, NextResponse } from "next/server";
import { getTradeQuote, SOL_MINT } from "@/lib/bags";
import { USDT_MINT } from "@/lib/usdt";
import { jsonError } from "@/lib/api-guards";
import { rateLimit } from "@/lib/rate-limit";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inputMint = searchParams.get("inputMint") ?? SOL_MINT;
  const outputMint = searchParams.get("outputMint");
  const amount = Number(searchParams.get("amount"));
  const slippageBps = Number(searchParams.get("slippageBps") ?? 100);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const rl = rateLimit(`trade-quote:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return jsonError("Rate limit", 429, "rate_limit", "Too many quote requests. Wait a moment and try again.");
  }

  if (!outputMint || !amount) {
    return jsonError("outputMint and amount required", 400, "missing_quote_params", "Choose an amount before requesting a quote.");
  }
  // Reject Infinity / NaN (Number("1e1000") → Infinity bypasses simple > 0 checks)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e18) {
    return jsonError("Invalid amount", 400, "invalid_amount", "Trade amount is invalid.");
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
    return jsonError("Invalid slippageBps (0..5000)", 400, "invalid_slippage", "Slippage must be between 0% and 50%.");
  }
  if (!BASE58.test(inputMint) || !BASE58.test(outputMint)) {
    return jsonError("Invalid mint", 400, "invalid_mint", "This token mint is invalid.");
  }

  // Validate supported input mints
  const supported = [SOL_MINT, USDT_MINT];
  if (!supported.includes(inputMint) && !supported.includes(outputMint)) {
    return jsonError("unsupported mint pair", 400, "unsupported_pair", "Only SOL/USDT routes into or out of this Bags token are supported here.");
  }

  try {
    const quoteResponse = await getTradeQuote({ inputMint, outputMint, amount, slippageBps });
    return NextResponse.json({
      quoteResponse,
      unavailable: false,
      source: "bags_trade_quote",
      safety: {
        noCustody: true,
        transactionNotSignedYet: true,
      },
    });
  } catch (e) {
    const { safeError } = await import("@/lib/safe-error");
    return NextResponse.json({
      quoteResponse: null,
      unavailable: true,
      error: safeError(e),
      errorType: "quote_unavailable",
      userMessage: "No safe route is available right now. Try a smaller amount or switch SOL/USDT mode.",
      source: "bags_trade_quote",
      noFakeData: true,
    });
  }
}
