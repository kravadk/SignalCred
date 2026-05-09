import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments, posts, users, notifications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/action-log";
import { jsonError, readJson, readWallet, UUID } from "@/lib/api-guards";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID.test(params.id)) {
    logAction({ action: "comment.create", type: "validation", status: "error", postId: params.id, errorType: "invalid_post_id" });
    return jsonError("Invalid post id", 400, "invalid_post_id", "This post link is invalid. Refresh the feed and try again.");
  }
  const wallet = readWallet(req);
  if (!wallet) {
    logAction({ action: "comment.create", type: "auth", status: "error", postId: params.id, errorType: "unauthorized" });
    return jsonError("Valid wallet required", 401, "invalid_wallet", "Connect a valid wallet before replying.");
  }
  const rl = rateLimit(`comments:${wallet}`, 20, 60_000);
  if (!rl.allowed) {
    logAction({ action: "comment.create", type: "rate_limit", status: "error", wallet, postId: params.id, errorType: "rate_limit" });
    return jsonError("Rate limit", 429, "rate_limit", "Too many replies. Wait a moment and try again.");
  }

  const body = await readJson(req);
  if (!body) {
    logAction({ action: "comment.create", type: "validation", status: "error", wallet, postId: params.id, errorType: "invalid_json" });
    return jsonError("Invalid JSON body", 400, "invalid_json", "The reply could not be read. Refresh and try again.");
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content || typeof content !== "string") {
    logAction({ action: "comment.create", type: "validation", status: "error", wallet, postId: params.id, errorType: "missing_content" });
    return jsonError("content required", 400, "missing_content", "Write a reply before posting.");
  }
  if (content.length > 2000) {
    logAction({ action: "comment.create", type: "validation", status: "error", wallet, postId: params.id, errorType: "content_too_long" });
    return jsonError("content too long (max 2000)", 400, "content_too_long", "Reply is too long. Keep it under 2000 characters.");
  }
  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post) {
    logAction({ action: "comment.create", type: "lookup", status: "error", wallet, postId: params.id, errorType: "post_not_found" });
    return jsonError("Post not found", 404, "post_not_found", "This post is no longer available.");
  }
  if (!post.tokenMint) {
    logAction({ action: "comment.create", type: "token_context", status: "error", wallet, postId: params.id, errorType: "parent_not_token_linked" });
    return jsonError("Parent post has no token context", 400, "parent_not_token_linked", "Replies are only allowed on token-linked proof posts.");
  }

  await db.insert(users).values({ wallet }).onConflictDoNothing();

  const [comment] = await db
    .insert(comments)
    .values({ postId: params.id, authorWallet: wallet, content })
    .returning();

  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, params.id));

  if (post?.authorWallet && post.authorWallet !== wallet) {
    await db.insert(users).values({ wallet: post.authorWallet }).onConflictDoNothing();
    await db.insert(notifications).values({
      recipientWallet: post.authorWallet,
      senderWallet: wallet,
      type: "comment",
      postId: params.id,
      message: `commented on your post`,
    }).catch(() => {});
  }

  logAction({ action: "comment.create", type: "comment", status: "success", wallet, tokenMint: post.tokenMint, postId: params.id });
  return NextResponse.json({ comment, tokenMint: post.tokenMint, tokenLinkedOnly: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID.test(params.id)) return jsonError("Invalid post id", 400, "invalid_post_id", "This post link is invalid.");
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.postId, params.id));
  return NextResponse.json({ comments: rows });
}
