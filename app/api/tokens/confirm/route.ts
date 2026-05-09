import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, tokens, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyLaunchTransaction } from "@/lib/launch-verification";

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mint, txSignature, launchPost } = await req.json();
  if (!mint || !txSignature) {
    return NextResponse.json({ error: "mint and txSignature required" }, { status: 400 });
  }

  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  if (!token) return NextResponse.json({ error: "Token draft not found" }, { status: 404 });
  if (token.creatorWallet !== wallet) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (token.launchStatus === "live") {
    return NextResponse.json({ error: "Token already confirmed live" }, { status: 409 });
  }

  let verified;
  try {
    verified = await verifyLaunchTransaction({ signature: txSignature, mint, creatorWallet: wallet });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 240) }, { status: 400 });
  }

  await db
    .update(tokens)
    .set({
      launchStatus: "live",
      launchedAt: new Date(),
      metadata: {
        ...(typeof token.metadata === "object" && token.metadata !== null ? token.metadata : {}),
        launchSignature: verified.signature,
        launchVerifiedAt: new Date().toISOString(),
        launchSlot: verified.slot,
        launchFinality: verified.confirmationStatus,
      },
    })
    .where(eq(tokens.mint, mint));

  await db.insert(users).values({ wallet }).onConflictDoNothing();

  const launchProofMarker = `Launch tx: ${verified.signature}`;
  const content = [
    launchPost || `Official launch proof: $${token.symbol} is live through Bags.`,
    "",
    `Verified Bags launch for mint ${mint}.`,
    launchProofMarker,
  ].join("\n").trim();

  const existingOfficialPosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.tokenMint, mint), eq(posts.postType, "official")))
    .limit(20);
  const existingLaunchPost = existingOfficialPosts.find((row) => row.content.includes(launchProofMarker));
  const [post] = existingLaunchPost
    ? [existingLaunchPost]
    : await db
      .insert(posts)
      .values({ authorWallet: wallet, tokenMint: mint, postType: "official", content })
      .returning();

  console.log(`[confirm] verified mint=${mint.slice(0, 12)} sig=${verified.signature.slice(0, 12)} post=${post.id}`);
  return NextResponse.json({
    ok: true,
    post,
    verified,
    officialFirstPost: {
      status: existingLaunchPost ? "already_published" : "published",
      postType: "official",
      tokenMint: mint,
      source: "onchain_launch_verification",
      idempotency: "mint + verified launch signature",
      squareHref: `/square?token=${mint}`,
      tokenHref: `/token/${mint}`,
    },
  });
}
