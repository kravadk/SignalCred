import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        db: "missing_database_url",
        error: "DATABASE_URL is not configured. Add it in Vercel Project Settings -> Environment Variables.",
      },
      { status: 503 },
    );
  }

  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: "connected", ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
