import { NextRequest, NextResponse } from "next/server";
import { getTradeQuote, SOL_MINT } from "@/lib/bags";
import { USDT_MINT } from "@/lib/usdt";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inputMint = searchParams.get("inputMint") ?? SOL_MINT;
  const outputMint = searchParams.get("outputMint");
  const amount = Number(searchParams.get("amount"));
  const slippageBps = Number(searchParams.get("slippageBps") ?? 100);

  if (!outputMint || !amount) {
    return NextResponse.json({ error: "outputMint and amount required" }, { status: 400 });
  }
  // Reject Infinity / NaN (Number("1e1000") → Infinity bypasses simple > 0 checks)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e18) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
    return NextResponse.json({ error: "Invalid slippageBps (0..5000)" }, { status: 400 });
  }
  if (!BASE58.test(inputMint) || !BASE58.test(outputMint)) {
    return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
  }

  // Validate supported input mints
  const supported = [SOL_MINT, USDT_MINT];
  if (!supported.includes(inputMint) && !supported.includes(outputMint)) {
    return NextResponse.json({ error: "unsupported mint pair" }, { status: 400 });
  }

  try {
    const quoteResponse = await getTradeQuote({ inputMint, outputMint, amount, slippageBps });
    return NextResponse.json({ quoteResponse, unavailable: false, source: "bags_trade_quote" });
  } catch (e) {
    const { safeError } = await import("@/lib/safe-error");
    return NextResponse.json({
      quoteResponse: null,
      unavailable: true,
      error: safeError(e),
      source: "bags_trade_quote",
      noFakeData: true,
    });
  }
}
