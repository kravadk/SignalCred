import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { postReviews, posts, users } from "@/db/schema";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { jsonError, readJson, readWallet } from "@/lib/api-guards";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS = new Set(["spam", "wrong-token", "fake-proof", "unsafe-link"]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return jsonError("Invalid post id", 400, "invalid_post_id", "This post link is invalid. Refresh the feed and try again.");
  const wallet = readWallet(req);
  if (!wallet) return jsonError("Valid wallet required", 401, "invalid_wallet", "Connect a valid wallet before marking proof for review.");
  const rl = rateLimit(`post-review:${wallet}`, 8, 60_000);
  if (!rl.allowed) return jsonError("Rate limit", 429, "rate_limit", "Too many review reports. Wait a moment and try again.");

  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post || !post.tokenMint) {
    return jsonError("Token-linked post not found", 404, "post_not_found", "This post is no longer available in the token proof feed.");
  }

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body", 400, "invalid_json", "The review reason could not be read. Refresh and try again.");
  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!REASONS.has(reason)) {
    return jsonError("reason must be spam, wrong-token, fake-proof, or unsafe-link", 400, "invalid_reason", "Choose a supported proof review reason.");
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;

  await db.insert(users).values({ wallet }).onConflictDoNothing();
  const [review] = await db
    .insert(postReviews)
    .values({ postId: params.id, wallet, reason, note })
    .onConflictDoUpdate({
      target: [postReviews.postId, postReviews.wallet, postReviews.reason],
      set: { note },
    })
    .returning();

  return NextResponse.json({
    review,
    tokenLinkedOnly: true,
    moderation: "proof-review",
    message: "Proof issue marked for review.",
  });
}
