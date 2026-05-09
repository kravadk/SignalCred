import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  // Validate mint to prevent free abuse of paid RPC quota
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid mint" }, { status: 400 });
  }
  // Rate-limit by wallet OR IP — anonymous callers fall back to forwarded IP
  const wallet = req.headers.get("x-wallet");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const key = wallet || `ip:${ip}`;
  const rl = rateLimit(`holders:${key}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getTokenLargestAccounts",
        params: [params.mint],
      }),
    });
    const data = await res.json();
    const accounts = data.result?.value ?? [];

    // Categorize holders
    const total = accounts.reduce((s: number, a: { uiAmount: number }) => s + (a.uiAmount ?? 0), 0);

    const holders = accounts.slice(0, 20).map((acc: { address: string; uiAmount: number }, i: number) => ({
      rank: i + 1,
      address: acc.address,
      amount: acc.uiAmount ?? 0,
      pct: total > 0 ? ((acc.uiAmount ?? 0) / total) * 100 : 0,
      label: i === 0 ? "Top Holder" : i < 3 ? "Whale 🐋" : i < 10 ? "Holder 💎" : "Retail",
    }));

    // Distribution buckets
    const whales = holders.filter((h: { pct: number }) => h.pct >= 5).reduce((s: number, h: { pct: number }) => s + h.pct, 0);
    const mid = holders.filter((h: { pct: number }) => h.pct >= 1 && h.pct < 5).reduce((s: number, h: { pct: number }) => s + h.pct, 0);
    const retail = Math.max(0, 100 - whales - mid);

    // On-chain count of holders is closer to truth than DB-cached count.
    // Bags doesn't expose a precise count; we surface both: largest-20 as a sample,
    // and `totalHolders` as the count of token-program accounts seen by RPC.
    return NextResponse.json({
      holders,
      distribution: { whales, mid, retail },
      totalHolders: accounts.length,
      note: accounts.length === 20 ? "RPC returns top 20; for accurate total use a holder-index service" : null,
    });
  } catch {
    return NextResponse.json({ holders: [], distribution: { whales: 0, mid: 0, retail: 100 }, totalHolders: 0 });
  }
}
