import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { follows, users } from "@/db/schema";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/action-log";

const WALLET = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(req: NextRequest) {
  const follower = req.headers.get("x-wallet")?.trim();
  if (!follower || !WALLET.test(follower)) {
    logAction({ action: "follow.toggle", type: "auth", status: "error", errorType: "invalid_wallet" });
    return NextResponse.json({ error: "Valid x-wallet required" }, { status: 401 });
  }
  const rl = rateLimit(`follow:${follower}`, 20, 60_000);
  if (!rl.allowed) {
    logAction({ action: "follow.toggle", type: "rate_limit", status: "error", wallet: follower, errorType: "rate_limit" });
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const following = typeof body.following === "string" ? body.following.trim() : "";
  if (!WALLET.test(following)) {
    logAction({ action: "follow.toggle", type: "validation", status: "error", wallet: follower, errorType: "invalid_following_wallet" });
    return NextResponse.json({ error: "Valid following wallet required" }, { status: 400 });
  }
  if (following === follower) {
    logAction({ action: "follow.toggle", type: "validation", status: "error", wallet: follower, errorType: "self_follow" });
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  await db.insert(users).values([{ wallet: follower }, { wallet: following }]).onConflictDoNothing();
  const inserted = await db
    .insert(follows)
    .values({ follower, following })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    await db.delete(follows).where(and(eq(follows.follower, follower), eq(follows.following, following)));
    logAction({ action: "follow.toggle", type: "creator", status: "success", wallet: follower, meta: { following: `${following.slice(0, 8)}...${following.slice(-5)}`, active: false } });
    return NextResponse.json({ following: false, wallet: following });
  }

  logAction({ action: "follow.toggle", type: "creator", status: "success", wallet: follower, meta: { following: `${following.slice(0, 8)}...${following.slice(-5)}`, active: true } });
  return NextResponse.json({ following: true, wallet: following });
}
