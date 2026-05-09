"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type SocialProofResponse = {
  socialScore: number;
  scoreBreakdown: Record<string, number | string>;
  officialUpdatesCount: number;
  communityPostsCount: number;
  uniqueWallets: number;
  reactionsTotal: number;
  holderAlignment: number;
  feeVelocityAlignment: number;
  spamRisk: number;
  sourceLabels: Record<string, string>;
};

function scoreTone(score: number) {
  if (score >= 70) return "text-[#00ff88]";
  if (score >= 35) return "text-[#ffcc7a]";
  return "text-[#ff8a78]";
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-fun text-white/42">
        <span>{label}</span>
        <span className="font-mono">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7a55c6] to-[#00ff88]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function SocialProofCard({ mint }: { mint: string }) {
  const [data, setData] = useState<SocialProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tokens/${mint}/social-proof`, { signal: controller.signal, cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Social proof unavailable");
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Social proof unavailable");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [mint]);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-white/42">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs font-fun">Loading token social proof...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 rounded-xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-3 py-3 text-xs font-fun text-[#ffcc7a]">
          <AlertTriangle size={14} />
          Social proof delayed. Token market and fee panels remain usable.
        </div>
      </div>
    );
  }

  const breakdown = data.scoreBreakdown;
  const bars = [
    ["Official", Number(breakdown.officialUpdates ?? 0)],
    ["Wallets", Number(breakdown.uniqueWallets ?? 0)],
    ["Fees", Number(breakdown.feeVelocityAlignment ?? 0)],
    ["Holders", Number(breakdown.holderAlignment ?? 0)],
    ["Milestones", Number(breakdown.milestones ?? 0)],
  ] as const;

  return (
    <div className="card relative overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b48dff]/40 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-fun font-black text-white">Social Proof</p>
          <p className="text-xs font-fun text-white/38">Verified token context, not generic likes.</p>
        </div>
        <div className="text-right">
          <p className={cn("font-mono text-3xl font-black leading-none tabular-nums", scoreTone(data.socialScore))}>{data.socialScore}</p>
          <p className="text-[10px] font-fun font-black uppercase text-white/32">score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-white/8 bg-white/[0.045] p-2">
          <p className="font-mono text-sm font-black text-white">{data.officialUpdatesCount}</p>
          <p className="text-[10px] font-fun text-white/35">official</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.045] p-2">
          <p className="font-mono text-sm font-black text-white">{data.uniqueWallets}</p>
          <p className="text-[10px] font-fun text-white/35">wallets</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.045] p-2">
          <p className="font-mono text-sm font-black text-white">{data.communityPostsCount}</p>
          <p className="text-[10px] font-fun text-white/35">community</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.045] p-2">
          <p className={cn("font-mono text-sm font-black", data.spamRisk > 50 ? "text-[#ff8a78]" : "text-[#69d99a]")}>{data.spamRisk}</p>
          <p className="text-[10px] font-fun text-white/35">spam risk</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {bars.map(([label, value]) => <Bar key={label} label={label} value={value} />)}
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-black/15 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-fun font-black text-[#69d99a]">
          <ShieldCheck size={13} />
          Source labels
        </div>
        <p className="text-[11px] font-fun leading-5 text-white/36">
          {Object.values(data.sourceLabels).filter(Boolean).join(" / ")}
        </p>
      </div>

      {data.spamRisk > 50 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-3 py-2 text-[11px] font-fun text-[#ffcc7a]">
          <Users size={13} />
          Social activity needs review because repeated wallets/text dominate the sample.
        </div>
      )}
    </div>
  );
}
