export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tokens } from "@/db/schema";
import { getBagsLifetimeFees } from "@/lib/bags-index";
import { recordFeeSnapshot } from "@/lib/fee-velocity";

function authorized(req: NextRequest) {
  const configured = process.env.AUTOMATION_SECRET;
  return Boolean(configured && req.headers.get("x-automation-secret") === configured);
}

function readBagsMeta(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const root = metadata as Record<string, unknown>;
  const bags = root.bags;
  return bags && typeof bags === "object" && !Array.isArray(bags)
    ? bags as Record<string, unknown>
    : {};
}

function hasBagsProof(metadata: unknown) {
  const bags = readBagsMeta(metadata);
  return Boolean(
    bags.importedFromBags ||
    bags.poolVerified ||
    bags.dbcPoolKey ||
    bags.dbcConfigKey ||
    bags.dammV2PoolKey
  );
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 120);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 120, 1), 300);
  const rows = await db
    .select()
    .from(tokens)
    .where(eq(tokens.launchStatus, "live"))
    .orderBy(desc(tokens.launchedAt))
    .limit(limit);

  const bagsRows = rows.filter((row) => hasBagsProof(row.metadata));
  let written = 0;
  let failed = 0;
  let lastSnapshotHour: string | null = null;

  for (const row of bagsRows) {
    try {
      const lifetimeFees = Number(await getBagsLifetimeFees(row.mint));
      if (!Number.isFinite(lifetimeFees) || lifetimeFees < 0) {
        failed++;
        continue;
      }
      const snapshotHour = await recordFeeSnapshot(row.mint, lifetimeFees, "bags_api");
      if (snapshotHour) {
        written++;
        lastSnapshotHour = snapshotHour.toISOString();
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: bagsRows.length,
    written,
    failed,
    lastSnapshotHour,
    source: "bags_api",
  });
}
