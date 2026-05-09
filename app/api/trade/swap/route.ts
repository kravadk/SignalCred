export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createSwapTx, getTradeQuote, serializeVersionedTx, SOL_MINT } from "@/lib/bags";
import { db } from "@/lib/db";
import { trades, users } from "@/db/schema";
import { PublicKey } from "@solana/web3.js";
import { USDT_MINT } from "@/lib/usdt";
import { rateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-error";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`swap:${wallet}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await req.json();
  const { quoteResponse } = body;
  const requestedOutputMint: string | undefined = body.outputMint;

  if (!quoteResponse || typeof quoteResponse !== "object") {
    return NextResponse.json({ error: "quoteResponse required" }, { status: 400 });
  }

  // Strict shape validation - refuse unknown fields/types.
  const inputMint = String(quoteResponse.inputMint ?? "");
  const outputMint = String(quoteResponse.outputMint ?? "");
  const inAmount = String(quoteResponse.inAmount ?? "");
  const slippageBps = Number(quoteResponse.slippageBps ?? 100);

  if (!BASE58.test(inputMint) || !BASE58.test(outputMint)) {
    return NextResponse.json({ error: "Invalid mints in quote" }, { status: 400 });
  }
  // Force one side of the pair to be a known asset
  const supported = new Set([SOL_MINT, USDT_MINT]);
  if (!supported.has(inputMint) && !supported.has(outputMint)) {
    return NextResponse.json({ error: "Unsupported pair" }, { status: 400 });
  }
  // Optional client-supplied outputMint must match the quote's outputMint (no rebinding)
  if (requestedOutputMint && requestedOutputMint !== outputMint) {
    return NextResponse.json({ error: "outputMint does not match quote" }, { status: 400 });
  }
  const inAmountNum = Number(inAmount);
  if (!Number.isFinite(inAmountNum) || inAmountNum <= 0 || inAmountNum > 1e18) {
    return NextResponse.json({ error: "Invalid inAmount" }, { status: 400 });
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
    return NextResponse.json({ error: "Invalid slippageBps" }, { status: 400 });
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
      return NextResponse.json({ error: "Could not re-quote", detail: safeError(e) }, { status: 502 });
    }

    // Compare outAmounts: allow <=10% drift due to market movement; block large gaps.
    const clientOut = Number(quoteResponse.outAmount ?? 0);
    const serverOut = Number((serverQuote as { outAmount?: number | string }).outAmount ?? 0);
    if (Number.isFinite(clientOut) && Number.isFinite(serverOut) && serverOut > 0) {
      const drift = Math.abs(serverOut - clientOut) / serverOut;
      if (drift > 0.1) {
        return NextResponse.json({
          error: "Quote drifted; refresh and try again",
          serverOut, clientOut,
        }, { status: 409 });
      }
    }

    const tx = await createSwapTx(serverQuote, new PublicKey(wallet));
    const txBase64 = serializeVersionedTx(tx);

    await db.insert(users).values({ wallet }).onConflictDoNothing();
    await db.insert(trades).values({
      wallet,
      inputMint, outputMint,
      inAmount: String(inAmountNum),
      outAmount: String(serverOut || clientOut || 0),
      priceImpactPct: String(quoteResponse.priceImpactPct ?? 0),
    });

    return NextResponse.json({ tx: txBase64 });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
