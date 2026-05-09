import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens, users } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { logAction } from "@/lib/action-log";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const creator = searchParams.get("creator");
  const search = searchParams.get("search")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 20 : limitRaw, 1), 100);

  const searchFilter = search
    ? or(
        ilike(tokens.symbol, search.replace(/^\$/, "")),
        ilike(tokens.symbol, `%${search.replace(/^\$/, "")}%`),
        ilike(tokens.name, `%${search}%`),
        ilike(tokens.mint, `%${search}%`),
      )
    : undefined;

  const whereFilter = creator
    ? searchFilter
      ? and(eq(tokens.creatorWallet, creator), searchFilter)
      : eq(tokens.creatorWallet, creator)
    : searchFilter;

  const rows = whereFilter
    ? await db.select().from(tokens).where(whereFilter).orderBy(desc(tokens.createdAt)).limit(limit)
    : await db.select().from(tokens).orderBy(desc(tokens.createdAt)).limit(limit);

  return NextResponse.json({ tokens: rows, filter: { creator: creator ?? null, search: search || null }, count: rows.length });
}

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) {
    logAction({ action: "token.create", type: "auth", status: "error", errorType: "unauthorized", message: "Missing x-wallet" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { mint, name, symbol, description, imageUrl, websiteUrl, twitterUrl, telegramUrl, bagsLaunchId, partnerConfig, initialBuyLamports, metadata } = body;

  if (!mint || !name || !symbol) {
    logAction({ action: "token.create", type: "validation", status: "error", wallet, errorType: "missing_fields", message: "mint, name, symbol required" });
    return NextResponse.json({ error: "mint, name, symbol required" }, { status: 400 });
  }

  await db.insert(users).values({ wallet }).onConflictDoNothing();

  const [token] = await db
    .insert(tokens)
    .values({
      mint,
      creatorWallet: wallet,
      name,
      symbol,
      description,
      imageUrl,
      websiteUrl,
      twitterUrl,
      telegramUrl,
      bagsLaunchId,
      partnerConfig,
      launchStatus: "draft",
      initialBuyLamports,
      metadata,
    })
    .onConflictDoNothing()
    .returning();

  logAction({ action: "token.create", type: "token", status: "success", wallet, tokenMint: mint, message: token ? "Token row created" : "Token row already existed" });
  return NextResponse.json({ token });
}
