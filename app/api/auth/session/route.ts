import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { wallet } = await req.json().catch(() => ({}));
  // Solana base58 pubkeys are 32 bytes — base58-encoded length is typically 43-44 chars,
  // but valid edge cases can be as short as 32 chars when leading zero bytes are present.
  if (!wallet || typeof wallet !== "string" || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet (not base58)" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      user: { wallet },
      degraded: true,
      warning: "Database is not configured; wallet session was not persisted.",
    });
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.wallet, wallet),
    });

    if (!existing) {
      await db.insert(users).values({ wallet }).onConflictDoNothing();
    }

    const user = await db.query.users.findFirst({
      where: eq(users.wallet, wallet),
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.warn("[api/auth/session] degraded", error instanceof Error ? error.message : error);
    return NextResponse.json({
      user: { wallet },
      degraded: true,
      warning: "Wallet connected, but session persistence is temporarily unavailable.",
    });
  }
}
