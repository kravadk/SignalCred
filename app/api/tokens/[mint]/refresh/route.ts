/**
 * Refresh a token's cached metadata from the Bags API. Solves drift between
 * our DB row (frozen at launch time) and edits the creator made on bags.fm
 * (image, social URLs, description). Only the creator may trigger a refresh.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bagsRequest } from "@/lib/bags";
import { rateLimit } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-error";

interface BagsTokenInfo {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export async function POST(req: NextRequest, { params }: { params: { mint: string } }) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`refresh:${wallet}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });
  if (token.creatorWallet !== wallet) {
    return NextResponse.json({ error: "Only the token creator can refresh metadata" }, { status: 403 });
  }

  try {
    const info = await bagsRequest<BagsTokenInfo>(`/token-launch/info/${params.mint}`);
    const update: Record<string, unknown> = {};
    if (typeof info.name === "string") update.name = info.name.slice(0, 100);
    if (typeof info.symbol === "string") update.symbol = info.symbol.slice(0, 12);
    if (typeof info.description === "string") update.description = info.description.slice(0, 1000);
    if (typeof info.image === "string") update.imageUrl = info.image.slice(0, 500);
    if (typeof info.twitter === "string") update.twitterUrl = info.twitter.slice(0, 200);
    if (typeof info.telegram === "string") update.telegramUrl = info.telegram.slice(0, 200);
    if (typeof info.website === "string") update.websiteUrl = info.website.slice(0, 200);

    if (Object.keys(update).length > 0) {
      await db.update(tokens).set(update).where(eq(tokens.mint, params.mint));
    }
    const refreshed = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });
    return NextResponse.json({ ok: true, token: refreshed, updated: Object.keys(update) });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
