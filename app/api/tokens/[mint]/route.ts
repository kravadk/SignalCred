import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens, type Token } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTokenOverview } from "@/lib/birdeye";
import { importBagsTokenByMint } from "@/lib/bags-index";

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  let token: Token | null = await db.query.tokens.findFirst({
    where: eq(tokens.mint, params.mint),
  }) ?? null;

  if (!token) {
    token = (await importBagsTokenByMint(params.mint)) ?? null;
  }

  const marketData = await getTokenOverview(params.mint);

  return NextResponse.json({ token: token ?? null, marketData });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });

  // Explicit non-null check — null !== null short-circuits to allowing edits
  if (!token || !token.creatorWallet || token.creatorWallet !== wallet) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // Only social fields. launchStatus / launchedAt / bagsLaunchId MUST go through /confirm
  // which performs on-chain verification. Otherwise creators can fake "live" tokens.
  const allowed = ["imageUrl", "websiteUrl", "twitterUrl", "telegramUrl", "description"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    const v = body[key];
    if (v === undefined) continue;
    if (typeof v !== "string") continue;
    // Reject dangerous URI schemes to prevent stored XSS via image/link sinks
    if ((key === "imageUrl" || key.endsWith("Url")) && v) {
      const lower = v.trim().toLowerCase();
      if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") ||
          (lower.startsWith("data:") && !lower.startsWith("data:image/"))) {
        return NextResponse.json({ error: `Unsafe ${key}` }, { status: 400 });
      }
    }
    if (v.length > 2000) {
      return NextResponse.json({ error: `${key} too long` }, { status: 400 });
    }
    update[key] = v;
  }

  await db.update(tokens).set(update).where(eq(tokens.mint, params.mint));
  const updated = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });
  return NextResponse.json({ token: updated });
}
