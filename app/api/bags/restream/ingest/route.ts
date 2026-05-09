import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tokens, users } from "@/db/schema";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function authorized(req: NextRequest) {
  const secret = process.env.RESTREAM_INGEST_SECRET || process.env.AUTOMATION_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-automation-secret") || req.headers.get("x-restream-secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret || bearer === secret;
}

function safeString(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : fallback;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized ReStream ingest" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mint = typeof body.mint === "string" ? body.mint : typeof body.tokenMint === "string" ? body.tokenMint : "";
  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const creatorWallet = typeof body.creatorWallet === "string" && BASE58.test(body.creatorWallet)
    ? body.creatorWallet
    : null;
  if (creatorWallet) {
    await db.insert(users).values({ wallet: creatorWallet }).onConflictDoNothing();
  }

  const now = new Date();
  const symbol = safeString(body.symbol, "BAGS", 12).toUpperCase();
  const name = safeString(body.name, symbol, 100);
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
  const metadata = {
    bags: {
      restream: true,
      source: "restream",
      event: "launchpad_launch:BAGS",
      status: safeString(body.status, "live", 32),
      launchId: typeof body.launchId === "string" ? body.launchId : null,
      rawEventReceivedAt: now.toISOString(),
    },
  };

  await db
    .insert(tokens)
    .values({
      mint,
      creatorWallet,
      name,
      symbol,
      imageUrl,
      launchStatus: "live",
      launchedAt: now,
      metadata,
    })
    .onConflictDoUpdate({
      target: tokens.mint,
      set: {
        creatorWallet,
        name,
        symbol,
        imageUrl,
        launchStatus: "live",
        launchedAt: now,
        metadata,
      },
    });

  return NextResponse.json({
    ok: true,
    persisted: true,
    mint,
    source: "bags_restream_ingest",
    generatedAt: now.toISOString(),
  });
}
