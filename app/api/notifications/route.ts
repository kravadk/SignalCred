import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  noStore();
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ notifications: [] });

  const rows = await db.select().from(notifications)
    .where(eq(notifications.recipientWallet, wallet))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return NextResponse.json({ notifications: rows });
}

export async function POST(req: NextRequest) {
  const senderWallet = req.headers.get("x-wallet");
  if (!senderWallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = rateLimit(`notif:${senderWallet}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { recipientWallet, type, postId, tokenMint, message } = await req.json();
  if (!recipientWallet || !type) return NextResponse.json({ ok: false });

  // Don't notify yourself
  if (recipientWallet === senderWallet) return NextResponse.json({ ok: false });

  // Bound message length
  const safeMessage = typeof message === "string" ? message.slice(0, 500) : null;
  const allowedTypes = ["like", "comment", "follow", "tip", "mention", "post", "repost"];
  if (!allowedTypes.includes(String(type))) return NextResponse.json({ ok: false });

  await db.insert(users).values({ wallet: recipientWallet }).onConflictDoNothing();
  await db.insert(notifications).values({
    recipientWallet, senderWallet, type, postId, tokenMint, message: safeMessage,
  });

  return NextResponse.json({ ok: true });
}
