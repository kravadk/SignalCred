import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { mint, name, symbol, description, imageUrl, websiteUrl, twitterUrl, telegramUrl } = body;

  if (!mint || !name || !symbol) {
    return NextResponse.json({ error: "mint, name, symbol required" }, { status: 400 });
  }

  // If a row already exists for this mint, only the original creator can update it.
  // This prevents partner-config poisoning by squatting on a future mint.
  const existing = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  if (existing && existing.creatorWallet !== wallet) {
    return NextResponse.json({ error: "This token mint is owned by another creator" }, { status: 403 });
  }

  await db.insert(users).values({ wallet }).onConflictDoNothing();
  await db.insert(tokens).values({
    mint, creatorWallet: wallet, name, symbol, description, imageUrl,
    websiteUrl, twitterUrl, telegramUrl, launchStatus: "draft",
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
