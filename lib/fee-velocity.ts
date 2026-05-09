import { and, desc, eq, lte } from "drizzle-orm";
import { feeSnapshots } from "@/db/schema";
import { db } from "@/lib/db";

export type FeeVelocity = {
  currentLifetimeFeesLamports: number;
  feeVelocity24hLamports: number | null;
  status: "active" | "pending" | "unavailable";
  snapshotSource: "fee_snapshots";
  currentSnapshotAt: string | null;
  baselineSnapshotAt: string | null;
  baselineLifetimeFeesLamports: number | null;
  message: string;
};

function floorToHour(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

function isFiniteLamports(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export async function recordFeeSnapshot(
  tokenMint: string,
  lifetimeFeesLamports: number,
  source = "bags_api"
) {
  if (!isFiniteLamports(lifetimeFeesLamports)) return null;
  const snapshotHour = floorToHour();
  try {
    await db
      .insert(feeSnapshots)
      .values({
        tokenMint,
        snapshotHour,
        lifetimeFeesLamports: Math.floor(lifetimeFeesLamports),
        source,
      })
      .onConflictDoUpdate({
        target: [feeSnapshots.tokenMint, feeSnapshots.snapshotHour],
        set: {
          lifetimeFeesLamports: Math.floor(lifetimeFeesLamports),
          source,
        },
      });

    return snapshotHour;
  } catch {
    return null;
  }
}

export async function getFeeVelocity24h(
  tokenMint: string,
  currentLifetimeFeesLamports: number
): Promise<FeeVelocity> {
  const currentSnapshot = await recordFeeSnapshot(tokenMint, currentLifetimeFeesLamports);
  const target = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const [baseline] = await db
      .select()
      .from(feeSnapshots)
      .where(and(eq(feeSnapshots.tokenMint, tokenMint), lte(feeSnapshots.snapshotHour, target)))
      .orderBy(desc(feeSnapshots.snapshotHour))
      .limit(1);

    if (!baseline) {
      return {
        currentLifetimeFeesLamports,
        feeVelocity24hLamports: null,
        status: currentSnapshot ? "pending" : "unavailable",
        snapshotSource: "fee_snapshots",
        currentSnapshotAt: currentSnapshot?.toISOString() ?? null,
        baselineSnapshotAt: null,
        baselineLifetimeFeesLamports: null,
        message: currentSnapshot
          ? "Baseline warming: first snapshot collected; waiting for one snapshot at least 24h old before generated fees can be calculated."
          : "Snapshot table unavailable or snapshot write failed.",
      };
    }

    const baselineLifetime = Number(baseline.lifetimeFeesLamports ?? 0);
    const delta = Math.max(Math.floor(currentLifetimeFeesLamports - baselineLifetime), 0);

    return {
      currentLifetimeFeesLamports,
      feeVelocity24hLamports: delta,
      status: "active",
      snapshotSource: "fee_snapshots",
      currentSnapshotAt: currentSnapshot?.toISOString() ?? floorToHour().toISOString(),
      baselineSnapshotAt: baseline.snapshotHour.toISOString(),
      baselineLifetimeFeesLamports: baselineLifetime,
      message: "Generated fees over 24h calculated from lifetime fee snapshots.",
    };
  } catch {
    return {
      currentLifetimeFeesLamports,
      feeVelocity24hLamports: null,
      status: "unavailable",
      snapshotSource: "fee_snapshots",
      currentSnapshotAt: currentSnapshot?.toISOString() ?? null,
      baselineSnapshotAt: null,
      baselineLifetimeFeesLamports: null,
      message: "Snapshot table unavailable or query failed.",
    };
  }
}
