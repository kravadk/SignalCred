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
  const rl = rateLimit(`public-token-trust:${clientKey(req)}`, 120, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  if (!BASE58.test(params.mint)) return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });

  const passport = await buildTokenPassport(params.mint);
  if (!passport) return NextResponse.json({ error: "Trust profile unavailable" }, { status: 404 });

  const badges = passport.evidence
    .filter((row) => row.status === "verified")
    .slice(0, 5)
    .map((row) => row.label);
  const response = {
    mint: passport.mint,
    symbol: passport.token.symbol,
    name: passport.token.name,
    trustScore: passport.trustScore,
    verdict: passport.verdict,
    badges,
    riskLabels: passport.riskLabels.map((risk) => risk.label),
    sourceLabels: passport.sourceLabels,
    passportHref: `/passport/${passport.mint}`,
    embedHref: `/embed/trust/${passport.mint}`,
    links: {
      bags: passport.links.bags,
      solscan: passport.links.solscanMint,
      dexScreener: passport.links.dexScreener,
    },
    noFakeData: true,
    generatedAt: passport.generatedAt,
  };

  return NextResponse.json(response, { headers: publicJsonHeaders() });
}
