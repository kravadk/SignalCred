"use client";

import { useEffect, useState } from "react";
import { lamportsToSol } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface FeeSplit {
  totalFeeLamports: number;
  creatorFeeLamports: number;
  platformFeeLamports: number;
}

export function FeeSplitChart({ mint }: { mint: string }) {
  const [split, setSplit] = useState<FeeSplit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tokens/${mint}/fees`)
      .then((r) => r.json())
      .then((d) => setSplit(d.split ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mint]);

  // Show static config split if no fees yet
  const creatorLamports = split?.creatorFeeLamports ?? 0;
  const platformLamports = split?.platformFeeLamports ?? 0;
  const total = split?.totalFeeLamports ?? 0;

  // BPS-based split (always 75/25 regardless of earnings)
  const creatorPct = 75;
  const platformPct = 25;

  const r = 50;
  const circ = 2 * Math.PI * r;
  const gap = 3;
  const creatorArc = (creatorPct / 100) * circ;
  const platformArc = (platformPct / 100) * circ;

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#26aa68]/40 to-transparent" />

      <h3 className="font-display text-xl text-white mb-4">Fee Split</h3>

      {loading ? (
        <div className="flex items-center justify-center h-24 text-white/30">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* SVG donut */}
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
              <circle cx="60" cy="60" r={r} fill="none" stroke="#26aa68" strokeWidth="16"
                strokeDasharray={`${creatorArc - gap} ${circ - creatorArc + gap}`}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(38,170,104,0.6))" }}
              />
              <circle cx="60" cy="60" r={r} fill="none" stroke="#7a55c6" strokeWidth="16"
                strokeDasharray={`${platformArc - gap} ${circ - platformArc + gap}`}
                strokeDashoffset={-(creatorArc + gap / 2)}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(122,85,198,0.6))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {total > 0 ? (
                <>
                  <span className="text-white/35 text-xs font-fun">earned</span>
                  <span className="font-display text-sm text-white leading-tight">
                    {lamportsToSol(total).toFixed(3)}
                  </span>
                  <span className="text-white/35 text-xs font-fun">SOL</span>
                </>
              ) : (
                <>
                  <span className="text-white/25 text-xs font-fun text-center leading-tight">no fees<br />yet</span>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {[
              {
                label: "Creator",
                pct: creatorPct,
                sol: lamportsToSol(creatorLamports),
                color: "bg-[#26aa68]",
                textColor: "text-[#69d99a]",
                bps: "7,500 bps",
              },
              {
                label: "Platform",
                pct: platformPct,
                sol: lamportsToSol(platformLamports),
                color: "bg-[#7a55c6]",
                textColor: "text-[#b48dff]",
                bps: "2,500 bps",
              },
            ].map(({ label, pct, sol, color, textColor, bps }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`}
                      style={{ boxShadow: `0 0 6px currentColor` }} />
                    <div>
                      <span className="text-white/60 text-xs font-fun">{label}</span>
                      <span className="text-white/20 text-xs font-fun ml-1.5">({bps})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-fun font-black ${textColor}`}>{pct}%</span>
                    {sol > 0 && (
                      <span className="text-white/30 text-xs font-fun ml-1.5">
                        {sol.toFixed(4)} SOL
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
            {total === 0 && (
              <p className="text-white/25 text-xs font-fun text-center pt-1">
                Fees accumulate as trades happen
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-white/20 text-xs font-fun mt-4 text-center">
        1% trade fee · configured via Bags SDK · BPS total = 10,000 ✓
      </p>
    </div>
  );
}
