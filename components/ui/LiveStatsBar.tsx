"use client";

import { useEffect, useState } from "react";
import { AnimatedCounter } from "./AnimatedCounter";

interface Stats {
  liveTokens: number;
  totalPosts: number;
  totalUsers: number;
}

const TICKER_ITEMS = [
  "Bags feed synced",
  "Bags pool proof checked",
  "Lifetime fees from Bags API",
  "Claim events from Bags API",
  "Market data from DexScreener",
  "Creator proof verified",
  "No mock token rows",
  "Evidence-first index",
];

export function LiveStatsBar() {
  const [stats, setStats] = useState<Stats>({ liveTokens: 0, totalPosts: 0, totalUsers: 0 });

  useEffect(() => {
    const load = () =>
      fetch("/api/stats")
        .then((r) => r.ok ? r.json().catch(() => null) : null)
        .then((data) => data && setStats(data))
        .catch(() => {});
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 mb-6"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(38,170,104,0.5), rgba(122,85,198,0.5), transparent)" }}
      />

      <div className="flex items-center gap-0 min-h-[44px]">
        <div className="flex items-center gap-2 px-4 shrink-0 border-r border-white/10 h-full min-h-[44px]">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-green" style={{ boxShadow: "0 0 6px #26aa68" }} />
            <div
              className="absolute inset-0 rounded-full bg-green"
              style={{ animation: "ripple 1.8s ease-out infinite" }}
            />
          </div>
          <span className="text-green font-fun font-black text-xs tracking-widest neon-text-green">LIVE</span>
        </div>

        <div className="flex items-center gap-6 px-5 shrink-0 border-r border-white/10 h-full min-h-[44px]">
          {[
            { label: "Bags tokens", value: stats.liveTokens, color: "#69d99a" },
            { label: "posts", value: stats.totalPosts, color: "#b48dff" },
            { label: "creators", value: stats.totalUsers, color: "#ff9aad" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span className="font-display text-lg" style={{ color }}>
                <AnimatedCounter value={value} />
              </span>
              <span className="text-white/35 text-xs font-fun">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden h-full min-h-[44px] flex items-center relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-8 z-10"
            style={{ background: "linear-gradient(90deg, rgba(41,17,83,0.8), transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-8 z-10"
            style={{ background: "linear-gradient(270deg, rgba(41,17,83,0.8), transparent)" }}
          />

          <div
            className="flex items-center gap-8 whitespace-nowrap"
            style={{ animation: "marquee 28s linear infinite" }}
          >
            {doubled.map((item, i) => (
              <span key={i} className="text-white/40 text-xs font-fun flex-shrink-0">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 shrink-0 border-l border-white/10 h-full min-h-[44px]">
          <span className="text-white/25 text-xs font-fun">Data</span>
          <span className="text-xs font-fun font-black" style={{ color: "#69d99a" }}>Bags API</span>
        </div>
      </div>
    </div>
  );
}
