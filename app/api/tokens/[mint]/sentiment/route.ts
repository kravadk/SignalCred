import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communitySentiment } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { mint: string } }) {
  noStore();
  const rows = await db.select().from(communitySentiment)
    .where(eq(communitySentiment.tokenMint, params.mint));
  const bullish = rows.filter(r => r.vote === "bullish").length;
  const bearish = rows.filter(r => r.vote === "bearish").length;
  const total = rows.length;
  return NextResponse.json({
    bullish, bearish, total,
    bullishPct: total ? Math.round((bullish / total) * 100) : 0,
    bearishPct: total ? Math.round((bearish / total) * 100) : 0,
  });
}

export async function POST(req: NextRequest, { params }: { params: { mint: string } }) {
  noStore();
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { vote } = await req.json();
  if (vote !== "bullish" && vote !== "bearish")
    return NextResponse.json({ error: "vote must be bullish or bearish" }, { status: 400 });

  // Atomic upsert via composite unique index (tokenMint, wallet).
  // Prevents the prior delete-then-insert race that allowed multi-vote spam.
  await db.insert(communitySentiment)
    .values({ tokenMint: params.mint, wallet, vote })
    .onConflictDoUpdate({
      target: [communitySentiment.tokenMint, communitySentiment.wallet],
      set: { vote, createdAt: new Date() },
    });

  return NextResponse.json({ ok: true, vote });
}
