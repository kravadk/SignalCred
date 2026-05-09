import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { room: string } }) {
  noStore();
  const rows = await db.select().from(chatMessages)
    .where(eq(chatMessages.roomId, params.room))
    .orderBy(desc(chatMessages.createdAt))
    .limit(50);
  return NextResponse.json({ messages: rows.reverse() });
}

export async function POST(req: NextRequest, { params }: { params: { room: string } }) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  await db.insert(users).values({ wallet }).onConflictDoNothing();
  const [msg] = await db.insert(chatMessages).values({
    roomId: params.room, wallet, content: content.trim().slice(0, 500),
  }).returning();

  return NextResponse.json({ message: msg });
}
