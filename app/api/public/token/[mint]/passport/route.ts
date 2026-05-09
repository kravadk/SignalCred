import { NextRequest, NextResponse } from "next/server";
import { buildTokenPassport } from "@/lib/trust-passport";
import { publicJsonHeaders } from "@/lib/public-api-cache";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "anon";
}

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  const rl = rateLimit(`public-token-passport:${clientKey(req)}`, 90, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  if (!BASE58.test(params.mint)) return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });

  const passport = await buildTokenPassport(params.mint);
  if (!passport) return NextResponse.json({ error: "Passport unavailable" }, { status: 404 });

  return NextResponse.json({
    ...passport,
    publicApi: true,
    embedHref: `/embed/trust/${passport.mint}`,
  }, { headers: publicJsonHeaders() });
}
