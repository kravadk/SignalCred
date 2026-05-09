import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, reactions, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logAction } from "@/lib/action-log";
import { jsonError, readJson, readWallet, UUID } from "@/lib/api-guards";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_KINDS = ["like", "repost", "bookmark"] as const;
type Kind = typeof ALLOWED_KINDS[number];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) {
    logAction({ action: "reaction.toggle", type: "validation", status: "error", postId: params.id, errorType: "invalid_post_id" });
    return jsonError("Invalid post id", 400, "invalid_post_id", "This post link is invalid. Refresh the feed and try again.");
  }

  const wallet = readWallet(req);
  if (!wallet) {
    logAction({ action: "reaction.toggle", type: "auth", status: "error", postId: params.id, errorType: "unauthorized" });
    return jsonError("Valid wallet required", 401, "invalid_wallet", "Connect a valid wallet before reacting.");
  }

  const rl = rateLimit(`reaction:${wallet}`, 80, 60_000);
  if (!rl.allowed) {
    logAction({ action: "reaction.toggle", type: "rate_limit", status: "error", wallet, postId: params.id, errorType: "rate_limit" });
    return jsonError("Rate limit", 429, "rate_limit", "Too many actions. Wait a moment and try again.");
  }

  const body = await readJson(req);
  if (!body) {
    logAction({ action: "reaction.toggle", type: "validation", status: "error", wallet, postId: params.id, errorType: "invalid_json" });
    return jsonError("Invalid JSON body", 400, "invalid_json", "The action could not be read. Refresh and try again.");
  }

  const rawKind = body.kind;
  if (typeof rawKind !== "string" || !ALLOWED_KINDS.includes(rawKind as Kind)) {
    logAction({ action: "reaction.toggle", type: String(rawKind ?? "unknown"), status: "error", wallet, postId: params.id, errorType: "invalid_kind" });
    return jsonError(`kind must be one of: ${ALLOWED_KINDS.join(", ")}`, 400, "invalid_kind", "This reaction type is not supported.");
  }
  const kind = rawKind as Kind;

  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post || !post.tokenMint) {
    logAction({ action: "reaction.toggle", type: kind, status: "error", wallet, postId: params.id, errorType: post ? "token_context_missing" : "post_not_found" });
    return jsonError("Token-linked post not found", post ? 400 : 404, post ? "token_context_missing" : "post_not_found", "This post is no longer available in the token proof feed.");
  }

  await db.insert(users).values({ wallet }).onConflictDoNothing();

  // Atomic toggle via INSERT ON CONFLICT RETURNING
  const inserted = await db
    .insert(reactions)
    .values({ postId: params.id, wallet, kind })
    .onConflictDoNothing()
    .returning();

  const counterCol = kind === "like" ? posts.likesCount : kind === "repost" ? posts.repostsCount : null;

  if (inserted.length === 0) {
    // Already reacted — toggle off
    const deleted = await db
      .delete(reactions)
      .where(and(eq(reactions.postId, params.id), eq(reactions.wallet, wallet), eq(reactions.kind, kind)))
      .returning();
    if (counterCol && deleted.length > 0) {
      await db.update(posts)
        .set({ [counterCol === posts.likesCount ? "likesCount" : "repostsCount"]: sql`GREATEST(${counterCol} - 1, 0)` })
        .where(eq(posts.id, params.id));
    }
    logAction({ action: "reaction.toggle", type: kind, status: "success", wallet, postId: params.id, meta: { active: false } });
    return NextResponse.json({ active: false, kind, tokenMint: post.tokenMint, tokenLinkedOnly: true });
  }

  if (counterCol) {
    await db.update(posts)
      .set({ [counterCol === posts.likesCount ? "likesCount" : "repostsCount"]: sql`${counterCol} + 1` })
      .where(eq(posts.id, params.id));
  }

  logAction({ action: "reaction.toggle", type: kind, status: "success", wallet, postId: params.id, meta: { active: true } });
  return NextResponse.json({ active: true, kind, tokenMint: post.tokenMint, tokenLinkedOnly: true });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return NextResponse.json({ reactions: [] });
  const wallet = readWallet(req);
  if (!wallet) return NextResponse.json({ reactions: [] });

  const rows = await db
    .select({ kind: reactions.kind })
    .from(reactions)
    .where(and(eq(reactions.postId, params.id), eq(reactions.wallet, wallet)));

  return NextResponse.json({ reactions: rows.map(r => r.kind) });
}
