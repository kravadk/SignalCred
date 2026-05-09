type RunwayEstimatorProps = {
  runwayDays: number | null;
  rewardBudgetUsdt: number;
  dailyCampaignBurnUsdt: number | null;
};

function usd(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "$0.00";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function RunwayEstimator({ runwayDays, rewardBudgetUsdt, dailyCampaignBurnUsdt }: RunwayEstimatorProps) {
  const strength = runwayDays == null ? 0 : Math.min(100, Math.max(6, runwayDays * 3));

  return (
    <div className="rounded-2xl border border-[#26a17b]/18 bg-[#26a17b]/8 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-fun font-black text-white">Creator runway</p>
          <p className="text-xs font-fun text-white/38">Stable reward capacity from estimated creator share.</p>
        </div>
        <span className="rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-3 py-1 text-sm font-fun font-black text-[#50d8a4]">
          {runwayDays == null ? "pending" : `${runwayDays}d`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-[#26a17b] to-[#9df2d1]" style={{ width: `${strength}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/[0.045] px-3 py-2">
          <p className="font-fun text-white/35">Reward budget</p>
          <p className="mt-1 font-mono text-[#50d8a4]">{usd(rewardBudgetUsdt)} USDT</p>
        </div>
        <div className="rounded-xl bg-white/[0.045] px-3 py-2">
          <p className="font-fun text-white/35">Daily plan</p>
          <p className="mt-1 font-mono text-white">{dailyCampaignBurnUsdt == null ? "No campaign" : `${usd(dailyCampaignBurnUsdt)} / day`}</p>
        </div>
      </div>
    </div>
  );
}
