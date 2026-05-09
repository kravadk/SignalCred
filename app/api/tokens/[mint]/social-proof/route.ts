import { NextRequest, NextResponse } from "next/server";
import { buildTokenSocialContext } from "@/lib/token-social-proof";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = rateLimit(`social-proof:${ip}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  try {
    const context = await buildTokenSocialContext(params.mint);
    return NextResponse.json({
      ...context.socialProof,
      token: context.token,
      completedMilestones: context.milestones.filter((milestone) => milestone.status === "completed").length,
      totalMilestones: context.milestones.length,
      source: {
        generatedAt: new Date().toISOString(),
        noFakeData: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Social proof unavailable" }, { status: 500 });
  }
}
