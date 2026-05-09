import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type ScoreBreakdown = {
  creatorProof: number;
  poolSurvival: number;
  feeGeneration: number;
  claims: number;
  socialQuality: number;
  campaignReliability: number;
  riskPenalty: number;
};

const LABELS: Record<keyof ScoreBreakdown, string> = {
  creatorProof: "Creator proof",
  poolSurvival: "Pool survival",
  feeGeneration: "Fee generation",
  claims: "Claims",
  socialQuality: "Social quality",
  campaignReliability: "Campaigns",
  riskPenalty: "Risk penalty",
};

function scoreTone(score: number) {
  if (score >= 75) return "text-[#00ff88]";
  if (score >= 45) return "text-[#ffcc7a]";
  return "text-[#ff8a78]";
}

export function CreatorReliabilityScore({ score, breakdown }: { score: number; breakdown: ScoreBreakdown }) {
  return (
    <section className="card relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/42 to-[#ffb84d]/26" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 py-1 text-[11px] font-fun font-black uppercase text-[#69d99a]">
            <ShieldCheck size={13} />
            Creator Trust Graph
          </div>
          <h2 className="font-display text-3xl leading-none text-white">Creator Reliability Score</h2>
          <p className="mt-2 text-xs font-fun leading-5 text-white/40">
            Rule-based score from creator proof, pool survival, fees, claims, social quality, campaigns, and risk penalties.
          </p>
        </div>
        <div className="shrink-0 rounded-3xl border border-white/10 bg-black/24 px-5 py-4 text-center">
          <p className={cn("font-mono text-5xl font-black leading-none tabular-nums", scoreTone(score))}>{score}</p>
          <p className="mt-1 text-[10px] font-fun font-black uppercase tracking-wide text-white/32">reliability</p>
        </div>
      </div>

      <div className="space-y-3">
        {(Object.entries(breakdown) as Array<[keyof ScoreBreakdown, number]>).map(([key, value]) => {
          const isPenalty = key === "riskPenalty";
          const width = Math.min(100, Math.max(0, isPenalty ? value * 4 : value * 5));
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-fun">
                <span className="text-white/45">{LABELS[key]}</span>
                <span className={cn("font-mono font-black", isPenalty ? "text-[#ff9a87]" : "text-white")}>{isPenalty ? `-${value}` : value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className={cn("h-full rounded-full", isPenalty ? "bg-[#ff624e]" : "bg-gradient-to-r from-[#00ff88] via-[#b48dff] to-[#ffcc7a]")}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
