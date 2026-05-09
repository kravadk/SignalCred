export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { importBagsTokenByMint } from "@/lib/bags-index";
import { rateLimit } from "@/lib/rate-limit";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`token-import:${ip}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { mint } = await req.json().catch(() => ({}));
  if (typeof mint !== "string" || !BASE58.test(mint)) {
    return NextResponse.json({ error: "Valid Solana token mint required" }, { status: 400 });
  }

  const token = await importBagsTokenByMint(mint);
  if (!token) {
    return NextResponse.json({ error: "Token was not found in Bags index or market data" }, { status: 404 });
  }

  return NextResponse.json({ token });
}
