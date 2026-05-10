import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { posts, tokens, users, follows } from "@/db/schema";
import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { verifyWalletRequest } from "@/lib/wallet-auth";
import { getBagsCreators } from "@/lib/bags-index";
import { rateLimit } from "@/lib/rate-limit";
import { hasRecentDuplicatePost } from "@/lib/token-social-proof";
import { logAction } from "@/lib/action-log";
import { readJson, readWallet } from "@/lib/api-guards";

function isSafeMediaUrl(value: string) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("data:image/")) return trimmed.length <= 100_000;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host)
    ) return false;
    return true;
  } catch {
    return false;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") ?? "new";
  const search = searchParams.get("search")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 20 : limitRaw, 1), 50);
  const tokenMint = searchParams.get("tokenMint");
  if (tokenMint && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint)) {
    return NextResponse.json({ error: "Invalid tokenMint" }, { status: 400 });
  }
  const tokenFilter = tokenMint ? eq(posts.tokenMint, tokenMint) : isNotNull(posts.tokenMint);
  const rankingSource =
    tab === "trending" ? "token_social_proof"
    : tab === "official" ? "creator_official_updates"
    : tab === "signals" ? "token_signal_posts"
    : tab === "launches" ? "bags_launch_posts"
    : tab === "following" ? "followed_token_posts"
    : "token_linked_recent";

  const empty = (warning?: string) => NextResponse.json({
    posts: [],
    empty: true,
    tokenLinkedOnly: true,
    rankingSource,
    filter: { tokenMint: tokenMint ?? null, search: search || null },
    ...(warning ? { degraded: true, warning } : {}),
  });

  if (!isDatabaseConfigured()) {
    return empty("Social proof database is not configured. Token-linked posts are temporarily unavailable.");
  }

  const conditions = [tokenFilter];
  try {
  if (search) {
    const like = `%${search}%`;
    const matchingTokens = await db
      .select({ mint: tokens.mint })
      .from(tokens)
      .where(or(ilike(tokens.symbol, like), ilike(tokens.name, like), ilike(tokens.mint, like)))
      .limit(25);
    const tokenMatches = matchingTokens.map((token) => token.mint);
    const searchCondition = tokenMatches.length > 0
      ? or(ilike(posts.content, like), ilike(posts.authorWallet, like), ilike(posts.tokenMint, like), inArray(posts.tokenMint, tokenMatches))
      : or(ilike(posts.content, like), ilike(posts.authorWallet, like), ilike(posts.tokenMint, like));
    if (searchCondition) conditions.push(searchCondition);
  }
  const whereFilter = and(...conditions);

  let rows;
  if (tab === "launches") {
    rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.postType, "launch"), whereFilter))
      .orderBy(desc(posts.pinnedForToken), desc(posts.createdAt))
      .limit(limit);
  } else if (tab === "official") {
    rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.postType, "official"), whereFilter))
      .orderBy(desc(posts.pinnedForToken), desc(posts.createdAt))
      .limit(limit);
  } else if (tab === "signals") {
    rows = await db
      .select()
      .from(posts)
      .where(and(inArray(posts.postType, ["launch", "official", "quote"]), whereFilter))
      .orderBy(desc(posts.pinnedForToken), desc(posts.createdAt))
      .limit(limit);
  } else if (tab === "trending") {
    rows = await db
      .select()
      .from(posts)
      .where(whereFilter)
      .orderBy(
        desc(posts.pinnedForToken),
        desc(sql<number>`
          (${posts.likesCount} * 2)
          + (${posts.commentsCount} * 4)
          + (${posts.repostsCount} * 5)
          + CASE WHEN ${posts.tokenMint} IS NOT NULL THEN 8 ELSE 0 END
          + CASE WHEN ${posts.postType} = 'launch' THEN 6 ELSE 0 END
          - EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 21600
        `)
      )
      .limit(limit);
  } else if (tab === "following") {
    const wallet = req.headers.get("x-wallet");
    if (!wallet) {
      return empty();
    }
    const followedList = await db.select({ following: follows.following })
      .from(follows).where(eq(follows.follower, wallet));
    const wallets = followedList.map(f => f.following).filter((w): w is string => w !== null);
    if (wallets.length === 0) {
      return empty();
    }
    rows = await db.select().from(posts)
      .where(and(inArray(posts.authorWallet, wallets), whereFilter))
      .orderBy(desc(posts.pinnedForToken), desc(posts.createdAt))
      .limit(limit);
  } else {
    rows = await db
      .select()
      .from(posts)
      .where(whereFilter)
      .orderBy(desc(posts.pinnedForToken), desc(posts.createdAt))
      .limit(limit);
  }

  const authorWallets = Array.from(new Set(rows.map((post) => post.authorWallet).filter((wallet): wallet is string => Boolean(wallet))));
  const tokenMints = Array.from(new Set(rows.map((post) => post.tokenMint).filter((mint): mint is string => Boolean(mint))));
  const [authorRows, tokenRows] = await Promise.all([
    authorWallets.length
      ? db
          .select({ wallet: users.wallet, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.wallet, authorWallets))
      : Promise.resolve([]),
    tokenMints.length
      ? db
          .select({ mint: tokens.mint, name: tokens.name, symbol: tokens.symbol, imageUrl: tokens.imageUrl })
          .from(tokens)
          .where(inArray(tokens.mint, tokenMints))
      : Promise.resolve([]),
  ]);
  const authorMap = new Map(authorRows.map((user) => [user.wallet, user]));
  const tokenMap = new Map(tokenRows.map((token) => [token.mint, token]));

  return NextResponse.json({
    posts: rows.map((post) => {
      const author = post.authorWallet ? authorMap.get(post.authorWallet) : null;
      const token = post.tokenMint ? tokenMap.get(post.tokenMint) : null;
      return {
        ...post,
        authorUsername: author?.username ?? null,
        authorAvatarUrl: author?.avatarUrl ?? null,
        tokenSymbol: token?.symbol ?? null,
        tokenName: token?.name ?? null,
        tokenImageUrl: token?.imageUrl ?? null,
      };
    }),
    tokenLinkedOnly: true,
    rankingSource,
    filter: { tokenMint: tokenMint ?? null, search: search || null },
  });
  } catch (error) {
    console.warn("[api/posts] unavailable", error instanceof Error ? error.message : error);
    return empty("Social proof feed is temporarily unavailable.");
  }
}

export async function POST(req: NextRequest) {
  const wallet = readWallet(req);
  if (!wallet) {
    logAction({ action: "post.create", type: "auth", status: "error", errorType: "invalid_wallet", message: "Missing or invalid x-wallet" });
    return NextResponse.json({ error: "Valid wallet required", errorType: "invalid_wallet", userMessage: "Connect a valid Solana wallet before posting." }, { status: 401 });
  }
  const rl = rateLimit(`posts:${wallet}`, 10, 60_000);
  if (!rl.allowed) {
    logAction({ action: "post.create", type: "rate_limit", status: "error", wallet, errorType: "rate_limit" });
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }
  let authorWallet = wallet;

  const body = await readJson(req);
  if (!body) {
    logAction({ action: "post.create", type: "validation", status: "error", wallet, errorType: "invalid_json" });
    return NextResponse.json({ error: "Invalid JSON body", errorType: "invalid_json", userMessage: "The post could not be read. Refresh and try again." }, { status: 400 });
  }
  const content = body.content;
  const postType = typeof body.postType === "string" ? body.postType : "";
  const tokenMint = typeof body.tokenMint === "string" ? body.tokenMint : undefined;
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : body.mediaUrl == null ? undefined : body.mediaUrl;
  const gatedMint = typeof body.gatedMint === "string" ? body.gatedMint : undefined;
  const gatedAmount = body.gatedAmount;
  const quotedPostId = typeof body.quotedPostId === "string" ? body.quotedPostId : body.quotedPostId == null ? undefined : body.quotedPostId;
  const fail = (status: number, errorType: string, message: string, extra?: Record<string, unknown>) => {
    logAction({
      action: "post.create",
      type: String(postType ?? "unknown"),
      status: "error",
      wallet,
      tokenMint: typeof tokenMint === "string" ? tokenMint : null,
      errorType,
      message,
      meta: extra,
    });
    return NextResponse.json({ error: message, ...(extra?.reason ? { reason: String(extra.reason) } : {}) }, { status });
  };
  if (!content || !postType) {
    return fail(400, "missing_fields", "content and postType required");
  }
  const trimmedContent = typeof content === "string" ? content.trim() : "";
  if (!trimmedContent || trimmedContent.length > 1000) {
    return fail(400, "invalid_content", "content must be a non-empty string <= 1000 chars");
  }
  if (typeof content !== "string" || content.length > 4000) {
    return fail(400, "invalid_content", "content must be a string <= 4000 chars");
  }
  const allowedTypes = ["text", "analysis", "launch", "official", "update", "quote"];
  if (!allowedTypes.includes(String(postType))) {
    return fail(400, "invalid_post_type", "Invalid postType");
  }
  const gatedAmountNum = gatedAmount ? Number(gatedAmount) : 0;
  if (!Number.isFinite(gatedAmountNum) || gatedAmountNum < 0 || gatedAmountNum > Number.MAX_SAFE_INTEGER) {
    return fail(400, "invalid_gated_amount", "Invalid gatedAmount");
  }
  // mediaUrl: only http(s) or data:image/* allowed (prevent javascript: stored XSS)
  if (mediaUrl !== undefined && mediaUrl !== null && mediaUrl !== "") {
    if (typeof mediaUrl !== "string" || mediaUrl.length > 100_000) {
      return fail(400, "invalid_media_url", "mediaUrl invalid");
    }
    if (!isSafeMediaUrl(mediaUrl)) {
      return fail(400, "unsafe_media_url", "mediaUrl must be a safe public http(s) URL or data:image/");
    }
  }
  // gatedMint shape
  if (gatedMint && (typeof gatedMint !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(gatedMint))) {
    return fail(400, "invalid_gated_mint", "Invalid gatedMint");
  }
  // tokenMint shape
  if (tokenMint && (typeof tokenMint !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenMint))) {
    return fail(400, "invalid_token_mint", "Invalid tokenMint");
  }
  let linkedTokenMint = tokenMint;
  if (postType === "quote" && !quotedPostId) {
    return fail(400, "missing_quoted_post", "quotedPostId required for quote posts");
  }
  if (quotedPostId !== undefined && quotedPostId !== null && quotedPostId !== "") {
    if (typeof quotedPostId !== "string" || !UUID.test(quotedPostId)) {
      return fail(400, "invalid_quoted_post", "Invalid quotedPostId");
    }
    const quotedPost = await db.query.posts.findFirst({ where: eq(posts.id, quotedPostId) });
    if (!quotedPost || !quotedPost.tokenMint) {
      return fail(400, "quoted_post_not_token_linked", "Quoted post must exist and be token-linked");
    }
    if (linkedTokenMint && linkedTokenMint !== quotedPost.tokenMint) {
      return fail(400, "quoted_post_token_mismatch", "quotedPostId token mismatch", {
        reason: "Quote proof notes must preserve the quoted token context.",
      });
    }
    linkedTokenMint = quotedPost.tokenMint;
  }

  if (!linkedTokenMint) {
    return fail(400, "token_context_missing", "tokenMint required", {
      reason: "Square is token-linked only. Attach an indexed Bags token or use a cashtag that resolves to one.",
    });
  }

  const linkedToken = await db.query.tokens.findFirst({ where: eq(tokens.mint, linkedTokenMint) });
  if (!linkedToken) {
    return fail(404, "token_not_indexed", "Token not indexed", {
      reason: "Square posts must attach to an indexed Bags token.",
    });
  }

  if (await hasRecentDuplicatePost({ wallet, tokenMint: linkedTokenMint, content: trimmedContent })) {
    return fail(409, "duplicate_post", "Duplicate post blocked. Edit the text or wait a few minutes.");
  }

  // Official updates are creator-only
  if (postType === "official") {
    if (!linkedTokenMint) return NextResponse.json({ error: "tokenMint required for official posts" }, { status: 400 });
    const auth = verifyWalletRequest(req, { action: "official-update", mint: linkedTokenMint });
    if (!auth.ok) {
      logAction({ action: "post.create", type: "official", status: "error", wallet, tokenMint: linkedTokenMint, errorType: "wallet_signature" });
      return auth.response;
    }
    authorWallet = auth.wallet;
    const [bagsCreators] = await Promise.all([
      getBagsCreators(linkedTokenMint),
    ]);
    const creatorWallets = new Set(
      bagsCreators
        .filter((creator) => creator.isCreator || creator.isAdmin || creator.wallet)
        .map((creator) => creator.wallet)
        .filter((candidate): candidate is string => typeof candidate === "string")
    );
    const bagsCreatorVerified = creatorWallets.has(auth.wallet);
    const localCreatorFallback = creatorWallets.size === 0 && linkedToken.creatorWallet === auth.wallet;
    if (!bagsCreatorVerified && !localCreatorFallback) {
      return fail(403, "creator_not_verified", "Only verified Bags creator/admin can post official updates", {
        reason: creatorWallets.size === 0 ? "Bags creators API returned no creator wallets and local fallback did not match" : "Connected wallet is not in Bags creators/admin list",
      });
    }
  }

  logAction({
    action: "post.create",
    type: String(postType),
    status: "attempt",
    wallet,
    tokenMint: linkedTokenMint,
    meta: { length: trimmedContent.length, hasMedia: Boolean(mediaUrl), quotedPostId: quotedPostId || undefined },
  });

  await db.insert(users).values({ wallet: authorWallet }).onConflictDoNothing();

  const [post] = await db
    .insert(posts)
    .values({
      authorWallet,
      content: trimmedContent,
      postType,
      tokenMint: linkedTokenMint,
      mediaUrl,
      quotedPostId: quotedPostId || null,
      visibility: "public",
      gatedMint: gatedMint || null,
      gatedAmount: gatedAmountNum,
    })
    .returning();

  logAction({
    action: "post.create",
    type: String(postType),
    status: "success",
    wallet: authorWallet,
    tokenMint: linkedTokenMint,
    postId: post.id,
  });
  return NextResponse.json({ post });
}
