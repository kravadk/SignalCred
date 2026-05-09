import { NextRequest, NextResponse } from "next/server";
import { buildTokenPassport } from "@/lib/trust-passport";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`token-passport:${ip}`, 90, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const passport = await buildTokenPassport(params.mint);
  if (!passport) {
    return NextResponse.json({ error: "Passport unavailable for this mint" }, { status: 404 });
  }

  return NextResponse.json(passport);
}
