import { NextRequest, NextResponse } from "next/server";
import { getBagsClaimEvents } from "@/lib/bags-index";
import { rateLimit } from "@/lib/rate-limit";
import { formatLamports, shortWallet } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function eventTimestamp(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`claim-events:${ip}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const limit = clampNumber(req.nextUrl.searchParams.get("limit"), 20, 1, 100);
  const offset = clampNumber(req.nextUrl.searchParams.get("offset"), 0, 0, 10_000);

  const events = await getBagsClaimEvents(params.mint, { limit, offset });
  const normalized = events.map((event, index) => {
    const amountLamports = Number(event.amount ?? 0);
    const safeAmount = Number.isFinite(amountLamports) ? amountLamports : 0;
    return {
      id: event.signature ?? `${params.mint}-${offset + index}`,
      wallet: event.wallet ?? null,
      walletShort: event.wallet ? shortWallet(event.wallet) : "unknown",
      isCreator: Boolean(event.isCreator),
      amountLamports: safeAmount,
      amountSol: safeAmount / 1e9,
      amountFormatted: formatLamports(safeAmount),
      signature: event.signature ?? null,
      timestamp: eventTimestamp(event.timestamp),
      href: event.signature ? `https://solscan.io/tx/${event.signature}` : null,
      source: "bags_claim_events",
    };
  });

  return NextResponse.json({
    events: normalized,
    count: normalized.length,
    hasMore: normalized.length === limit,
    claimAction: {
      status: "wallet_required",
      method: "POST",
      endpoint: `/api/fees/token/${params.mint}/claim`,
      auth: "wallet_signature",
      explorerReceipt: "solscan_tx_after_success",
      noFakeClaimableAmount: true,
      message: "Connect and sign with a verified creator/admin wallet to check and claim fees. This read endpoint never invents claimable balances.",
    },
    source: "bags_api",
    generatedAt: new Date().toISOString(),
  });
}
