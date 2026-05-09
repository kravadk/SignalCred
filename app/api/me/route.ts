import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ user: null });

  const user = await db.query.users.findFirst({
    where: eq(users.wallet, wallet),
  });

  return NextResponse.json({ user: user ?? null });
}

function isSafeImageUrl(v: string): boolean {
  const lower = v.trim().toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) return true;
  if (lower.startsWith("data:image/")) return true;
  return false;
}

export async function PATCH(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const update: Partial<{ username: string; avatarUrl: string; bio: string }> = {};

  if (body.username !== undefined) {
    if (typeof body.username !== "string") {
      return NextResponse.json({ error: "username must be a string" }, { status: 400 });
    }
    const u = body.username.trim();
    if (u.length === 0 || u.length > 30) {
      return NextResponse.json({ error: "username must be 1-30 chars" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(u)) {
      return NextResponse.json({ error: "username: a-z A-Z 0-9 . _ - only" }, { status: 400 });
    }
    update.username = u;
  }

  if (body.avatarUrl !== undefined) {
    if (typeof body.avatarUrl !== "string" || body.avatarUrl.length > 200_000) {
      return NextResponse.json({ error: "avatarUrl invalid" }, { status: 400 });
    }
    if (body.avatarUrl && !isSafeImageUrl(body.avatarUrl)) {
      return NextResponse.json({ error: "avatarUrl must be https or data:image/" }, { status: 400 });
    }
    update.avatarUrl = body.avatarUrl;
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== "string") {
      return NextResponse.json({ error: "bio must be a string" }, { status: 400 });
    }
    if (body.bio.length > 500) {
      return NextResponse.json({ error: "bio must be ≤ 500 chars" }, { status: 400 });
    }
    update.bio = body.bio;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  await db.update(users).set(update).where(eq(users.wallet, wallet));
  const user = await db.query.users.findFirst({ where: eq(users.wallet, wallet) });
  return NextResponse.json({ user });
}
