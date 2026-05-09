import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { posts, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getBagsCreators } from "@/lib/bags-index";
import { rateLimit } from "@/lib/rate-limit";
import { verifyWalletRequest } from "@/lib/wallet-auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Invalid post id" }, { status: 400 });

  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post || !post.tokenMint) {
    return NextResponse.json({ error: "Token-linked post not found" }, { status: 404 });
  }
  if (post.postType !== "official") {
    return NextResponse.json({ error: "Only official creator updates can be pinned" }, { status: 400 });
  }

  const auth = verifyWalletRequest(req, { action: "pin-post", mint: post.tokenMint });
  if (!auth.ok) return auth.response;
  const rl = rateLimit(`post-pin:${auth.wallet}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const [token, bagsCreators] = await Promise.all([
    db.query.tokens.findFirst({ where: eq(tokens.mint, post.tokenMint) }),
    getBagsCreators(post.tokenMint),
  ]);
  const creatorWallets = new Set(
    bagsCreators
      .filter((creator) => creator.isCreator || creator.isAdmin || creator.wallet)
      .map((creator) => creator.wallet)
      .filter((candidate): candidate is string => typeof candidate === "string")
  );
  const bagsCreatorVerified = creatorWallets.has(auth.wallet);
  const localCreatorFallback = creatorWallets.size === 0 && token?.creatorWallet === auth.wallet;
  if (!bagsCreatorVerified && !localCreatorFallback) {
    return NextResponse.json({
      error: "Only verified Bags creator/admin can pin official updates",
      reason: creatorWallets.size === 0 ? "Bags creators API returned no creator wallets and local fallback did not match" : "Connected wallet is not in Bags creators/admin list",
    }, { status: 403 });
  }

  await db.update(posts).set({ pinnedForToken: false }).where(and(eq(posts.tokenMint, post.tokenMint), eq(posts.postType, "official")));
  const [updated] = await db.update(posts).set({ pinnedForToken: true }).where(eq(posts.id, params.id)).returning();

  return NextResponse.json({ post: updated, pinned: true, tokenLinkedOnly: true });
}
