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
  const rl = rateLimit(`milestones:${ip}`, 50, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  try {
    const context = await buildTokenSocialContext(params.mint);
    const completed = context.milestones.filter((milestone) => milestone.status === "completed").length;
    return NextResponse.json({
      milestones: context.milestones,
      completed,
      total: context.milestones.length,
      source: {
        generatedAt: new Date().toISOString(),
        noFakeData: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Milestones unavailable" }, { status: 500 });
  }
}
