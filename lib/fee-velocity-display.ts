import { formatLamports } from "@/lib/utils";

export type FeeVelocityStatus = "active" | "pending" | "unavailable" | string | null | undefined;

export function feeVelocityValue(status: FeeVelocityStatus, lamports?: number | null) {
  if (status === "active" && lamports != null) return formatLamports(lamports);
  if (status === "unavailable") return "Unavailable";
  return "Baseline warming";
}

export function feeVelocitySubtitle(status: FeeVelocityStatus, hasUsdtValue?: boolean) {
  if (status === "active") return hasUsdtValue ? "24h generated fees" : "Active from hourly snapshots";
  if (status === "unavailable") return "Snapshot unavailable";
  return "First snapshot collected";
}

export function feeVelocityLongHint(status: FeeVelocityStatus) {
  if (status === "active") return "Generated fees over the last 24h from hourly lifetime-fee snapshots.";
  if (status === "unavailable") return "Snapshot write or query failed, so velocity is not calculated.";
  return "Waiting for a snapshot at least 24h old. No generated fees are fabricated.";
}
