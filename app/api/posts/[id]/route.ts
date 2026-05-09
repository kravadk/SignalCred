import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { comments, posts, reactions } from "@/db/schema";
import { db } from "@/lib/db";
import { buildTokenSocialContext } from "@/lib/token-social-proof";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post || post.visibility !== "public") {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const [commentRows, quotedPost, viewerReactions] = await Promise.all([
    db.select().from(comments).where(eq(comments.postId, params.id)),
    post.quotedPostId ? db.query.posts.findFirst({ where: eq(posts.id, post.quotedPostId) }) : Promise.resolve(null),
    req.headers.get("x-wallet")
      ? db
          .select({ kind: reactions.kind })
          .from(reactions)
          .where(and(eq(reactions.postId, params.id), eq(reactions.wallet, req.headers.get("x-wallet")!)))
      : Promise.resolve([]),
  ]);

  const tokenContext = post.tokenMint
    ? await buildTokenSocialContext(post.tokenMint).catch(() => null)
    : null;

  return NextResponse.json({
    post,
    quotedPost: quotedPost ?? null,
    comments: commentRows,
    reactions: viewerReactions.map((row) => row.kind),
    tokenContext: tokenContext
      ? {
          token: tokenContext.token,
          socialProof: tokenContext.socialProof,
          milestonesCompleted: tokenContext.milestones.filter((item) => item.status === "completed").length,
          milestonesTotal: tokenContext.milestones.length,
          campaigns: tokenContext.campaigns.length,
        }
      : null,
    tokenLinkedOnly: true,
    noFakeData: true,
  });
}
