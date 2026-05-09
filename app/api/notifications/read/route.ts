import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ ok: false });

  // Optional: list of specific notification IDs to mark read.
  // If absent, mark all UNREAD as read (skip already-read rows for idempotency).
  let ids: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((s: unknown): s is string => typeof s === "string").slice(0, 100);
    }
  } catch { /* no body */ }

  if (ids && ids.length > 0) {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.recipientWallet, wallet), inArray(notifications.id, ids)));
  } else {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.recipientWallet, wallet), eq(notifications.isRead, false)));
  }

  return NextResponse.json({ ok: true });
}
