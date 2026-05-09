import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { comments, posts, reactions } from "@/db/schema";
import { db } from "@/lib/db";
import { buildTokenSocialContext } from "@/lib/token-social-proof";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

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
  const rawCommentRows = commentRows.length > 0
    ? []
    : await db.execute(sql`
        SELECT
          id,
          post_id AS "postId",
          author_wallet AS "authorWallet",
          content,
          created_at AS "createdAt"
        FROM comments
        WHERE post_id = ${params.id}
        ORDER BY created_at ASC
      `).catch(() => []);
  const rawRows = Array.isArray((rawCommentRows as unknown as { rows?: unknown[] })?.rows)
    ? (rawCommentRows as unknown as { rows: unknown[] }).rows
    : [];
  const fallbackComments = rawRows.map((row) => row as typeof commentRows[number]);
  let liveComments = commentRows.length > 0
    ? commentRows
    : Array.isArray(rawCommentRows)
      ? rawCommentRows
      : fallbackComments.length > 0
        ? fallbackComments
      : [];
  if (liveComments.length === 0) {
    const commentUrl = new URL(`/api/posts/${params.id}/comment`, req.url);
    const commentRes = await fetch(commentUrl, { cache: "no-store" }).catch(() => null);
    if (commentRes?.ok) {
      const commentBody = await commentRes.json().catch(() => ({}));
      if (Array.isArray(commentBody.comments)) {
        liveComments = commentBody.comments;
      }
    }
  }

  return NextResponse.json({
    post: {
      ...post,
      commentsCount: Math.max(post.commentsCount, liveComments.length),
    },
    quotedPost: quotedPost ?? null,
    comments: liveComments,
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
