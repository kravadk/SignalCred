import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const feed = await db
    .select()
    .from(posts)
    .where(eq(posts.tokenMint, params.mint))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return NextResponse.json({ posts: feed });
}
