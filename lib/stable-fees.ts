import { getSolUsdtPrice } from "@/lib/usdt";

export type UsdtPricing = {
  solPriceUsdt: number;
  usdtSource: "dexscreener_sol_usdt";
  usdtApproximate: true;
};

export function lamportsToSolAmount(lamports: number | null | undefined) {
  const value = Number(lamports ?? 0);
  return Number.isFinite(value) ? value / 1e9 : 0;
}

export function lamportsToUsdt(lamports: number | null | undefined, solPriceUsdt: number) {
  return lamportsToSolAmount(lamports) * solPriceUsdt;
}

export async function getUsdtPricing(): Promise<UsdtPricing> {
  const solPriceUsdt = await getSolUsdtPrice();
  return {
    solPriceUsdt,
    usdtSource: "dexscreener_sol_usdt",
    usdtApproximate: true,
  };
}

export function buildStableFeeFields(input: {
  solPriceUsdt: number;
  lifetimeFeesLamports?: number | null;
  feeVelocity24hLamports?: number | null;
  claimedFees24hLamports?: number | null;
  creatorFeeLamports?: number | null;
  platformFeeLamports?: number | null;
}) {
  return {
    lifetimeFeesUsdt: lamportsToUsdt(input.lifetimeFeesLamports, input.solPriceUsdt),
    feeVelocity24hUsdt:
      input.feeVelocity24hLamports == null
        ? null
        : lamportsToUsdt(input.feeVelocity24hLamports, input.solPriceUsdt),
    claimedFees24hUsdt: lamportsToUsdt(input.claimedFees24hLamports, input.solPriceUsdt),
    creatorFeeUsdt: lamportsToUsdt(input.creatorFeeLamports, input.solPriceUsdt),
    platformFeeUsdt: lamportsToUsdt(input.platformFeeLamports, input.solPriceUsdt),
  };
}
