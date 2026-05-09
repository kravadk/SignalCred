/**
 * Reconcile pending token launches: if a `tokens` row sits at status="pending"
 * for >5 minutes, check on-chain whether the mint exists and switch to "live"
 * or mark "failed". Solves the "user refreshed page during launch" stuck state.
 *
 * Protected by AUTOMATION_SECRET (same as defi automation).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { connection, sdk } from "@/lib/bags";
import { PublicKey } from "@solana/web3.js";
import { unstable_noStore as noStore } from "next/cache";

function authorized(req: NextRequest) {
  const configured = process.env.AUTOMATION_SECRET;
  if (!configured) return false;
  return req.headers.get("x-automation-secret") === configured;
}

export async function POST(req: NextRequest) {
  noStore();
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pending for more than 5 minutes
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const stuck = await db
    .select()
    .from(tokens)
    .where(and(eq(tokens.launchStatus, "pending"), lt(tokens.createdAt, cutoff)))
    .limit(50);

  let liveCount = 0;
  let failedCount = 0;
  let migratedCount = 0;

  // Detect graduations on tokens we marked live but haven't yet flagged isMigrated.
  // Bags SDK exposes claimable-positions; each position carries `isMigrated: boolean`.
  // We treat that as the on-chain truth for the migration state.
  const liveTokens = await db
    .select()
    .from(tokens)
    .where(eq(tokens.launchStatus, "live"))
    .limit(100);

  for (const t of liveTokens) {
    try {
      const meta = (t.metadata && typeof t.metadata === "object" ? t.metadata : {}) as Record<string, unknown>;
      if (meta.isMigrated === true) continue;
      if (!t.creatorWallet) continue;
      const positions = await sdk.fee.getAllClaimablePositions(new PublicKey(t.creatorWallet));
      const isMigrated = (positions as Array<{ baseMint?: string; mint?: string; isMigrated?: boolean }>).some(
        (p) => (p.baseMint === t.mint || p.mint === t.mint) && p.isMigrated === true
      );
      if (isMigrated) {
        await db.update(tokens)
          .set({ metadata: { ...meta, isMigrated: true, migratedAt: new Date().toISOString() } })
          .where(eq(tokens.mint, t.mint));
        migratedCount++;
      }
    } catch { /* RPC/SDK error — try next tick */ }
  }

  for (const t of stuck) {
    try {
      const acc = await connection.getAccountInfo(new PublicKey(t.mint), "confirmed");
      if (acc && acc.data.length > 0) {
        await db.update(tokens)
          .set({ launchStatus: "live", launchedAt: t.launchedAt ?? new Date() })
          .where(eq(tokens.mint, t.mint));
        liveCount++;
      } else {
        // Mint never created — mark failed but keep the row for the user
        await db.update(tokens)
          .set({ launchStatus: "failed" })
          .where(eq(tokens.mint, t.mint));
        failedCount++;
      }
    } catch {
      // RPC error — leave for next tick
    }
  }

  return NextResponse.json({ ok: true, liveCount, failedCount, migratedCount, scanned: stuck.length });
}
