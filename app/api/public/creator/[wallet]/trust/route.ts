import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { publicJsonHeaders } from "@/lib/public-api-cache";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "anon";
}

function validateWallet(wallet: string) {
  try {
    return new PublicKey(wallet).toBase58();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { wallet: string } }) {
  const rl = rateLimit(`public-creator-trust:${clientKey(req)}`, 90, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  const wallet = validateWallet(params.wallet);
  if (!wallet) return NextResponse.json({ error: "Invalid creator wallet" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const graphRes = await fetch(`${origin}/api/creators/${wallet}/trust-graph`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const graph = await graphRes.json().catch(() => null);
  if (!graphRes.ok || !graph || typeof graph !== "object") {
    return NextResponse.json({ error: "Creator trust unavailable" }, { status: graphRes.status || 503 });
  }

  const body = graph as Record<string, unknown>;
  const totals = body.totals && typeof body.totals === "object" && !Array.isArray(body.totals)
    ? body.totals as Record<string, unknown>
    : {};
  const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 12) : [];

  return NextResponse.json({
    wallet,
    reliabilityScore: body.reliabilityScore,
    verdict: Number(body.reliabilityScore ?? 0) >= 70 ? "reliable" : Number(body.reliabilityScore ?? 0) >= 35 ? "warming" : "risk_review",
    totals: {
      tokenCount: totals.tokenCount ?? 0,
      creatorProofCount: totals.creatorProofCount ?? 0,
      poolVerifiedCount: totals.poolVerifiedCount ?? 0,
      feeGeneratingCount: totals.feeGeneratingCount ?? 0,
      campaignsPlanned: totals.campaignsPlanned ?? 0,
      campaignsFunded: totals.campaignsFunded ?? 0,
    },
    tokens: tokens.map((token) => {
      const row = token && typeof token === "object" && !Array.isArray(token) ? token as Record<string, unknown> : {};
      return {
        mint: row.mint,
        symbol: row.symbol,
        name: row.name,
        passportHref: row.passportHref,
        riskLabels: Array.isArray(row.riskLabels) ? row.riskLabels : [],
      };
    }),
    suspiciousPatterns: Array.isArray(body.suspiciousPatterns) ? body.suspiciousPatterns : [],
    sourceLabels: body.sourceLabels,
    noFakeData: true,
    generatedAt: body.generatedAt ?? new Date().toISOString(),
  }, { headers: publicJsonHeaders() });
}
