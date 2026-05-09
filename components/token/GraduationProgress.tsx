"use client";
import { useState, useEffect } from "react";
import { Zap, ExternalLink } from "lucide-react";

interface TradeData {
  pair?: {
    marketCap?: number;
    liquidity?: { usd?: number };
    volume?: { h24?: number };
    pairAddress?: string;
  };
}

interface Props { mint: string; marketCap?: number | null; }

export function GraduationProgress({ mint, marketCap }: Props) {
  const [mc, setMc] = useState<number | null>(marketCap ?? null);
  const [liquidity, setLiquidity] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [graduated, setGraduated] = useState(false);

  useEffect(() => {
    fetch(`/api/tokens/${mint}/trades`)
      .then(r => r.json())
      .then((d: TradeData) => {
        if (d.pair?.marketCap) setMc(d.pair.marketCap);
        if (d.pair?.liquidity?.usd) setLiquidity(d.pair.liquidity.usd);
        if (d.pair?.volume?.h24) setVolume24h(d.pair.volume.h24);
        if (d.pair?.pairAddress) setPairAddress(d.pair.pairAddress);
      });
    // Check graduation via pool endpoint
    fetch(`/api/tokens/${mint}/pool`)
      .then(r => r.json())
      .then(d => { if (d.graduated) setGraduated(true); });
  }, [mint]);

  // Bonding curve phase: show liquidity-based progress
  // Bags graduation threshold is server-determined — we show relative signals, not a hardcoded number
  const hasMarketData = mc !== null || liquidity !== null;

  // Derive a rough progress signal from liquidity depth (not hardcoded graduation amount)
  // Small cap signal tiers based on typical DBC behavior
  const liquiditySignal = liquidity ?? 0;
  const mcSignal = mc ?? 0;
  const activityScore = Math.min(
    100,
    (liquiditySignal > 0 ? Math.min(liquiditySignal / 50, 60) : 0) +
    (mcSignal > 0 ? Math.min(mcSignal / 2000, 40) : 0)
  );
  const progress = graduated ? 100 : Math.max(activityScore, hasMarketData ? 5 : 0);

  const segments = 20;
  const filledSegments = Math.round((progress / 100) * segments);

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={14} className={graduated ? "text-[#00ff88]" : "text-[#ffb84d]"} />
            <span className="text-white/70 text-xs font-fun font-bold uppercase tracking-wider">
              {graduated ? "Graduated 🎓" : "Bonding Curve"}
            </span>
            {graduated && pairAddress && (
              <a href={`https://dexscreener.com/solana/${pairAddress}`} target="_blank" rel="noreferrer"
                className="text-[#00ff88]/60 hover:text-[#00ff88] transition-colors">
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          <div className="text-right">
            {graduated ? (
              <span className="text-[#00ff88] font-mono font-bold text-sm">DAMM V2 ✓</span>
            ) : (
              <span className="text-white/40 font-mono text-xs">DBC phase</span>
            )}
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="flex gap-0.5 mb-2">
          {Array.from({ length: segments }).map((_, i) => (
            <div key={i} className="flex-1 h-2.5 rounded-sm transition-all duration-500"
              style={{
                background: i < filledSegments
                  ? `hsl(${150 - (i / segments) * 30}, 100%, ${50 + (i / segments) * 10}%)`
                  : "rgba(255,255,255,0.06)",
                boxShadow: i < filledSegments && i === filledSegments - 1
                  ? "0 0 8px rgba(0,255,136,0.6)" : "none",
              }}
            />
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-[10px] font-mono text-white/25 mb-2">
          <span>Launch</span>
          <span>Growing</span>
          <span className={graduated ? "text-[#00ff88]" : ""}>🎓 Meteora DAMM V2</span>
        </div>

        {/* Market data pills */}
        {hasMarketData && (
          <div className="flex gap-2 flex-wrap mt-1">
            {mc && mc > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-mono">
                MCap ${mc >= 1000 ? `${(mc/1000).toFixed(1)}K` : mc.toFixed(0)}
              </span>
            )}
            {liquidity && liquidity > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-mono">
                Liq ${liquidity >= 1000 ? `${(liquidity/1000).toFixed(1)}K` : liquidity.toFixed(0)}
              </span>
            )}
            {volume24h && volume24h > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-mono">
                Vol ${volume24h >= 1000 ? `${(volume24h/1000).toFixed(1)}K` : volume24h.toFixed(0)}
              </span>
            )}
          </div>
        )}

        {!graduated && !hasMarketData && (
          <p className="text-white/25 text-[10px] font-fun mt-2 text-center">
            No trades yet · bonding curve active · price data appears after first swap
          </p>
        )}
        {graduated && (
          <p className="text-[#00ff88] text-xs font-fun mt-2 text-center font-bold">
            ✅ Migrated to Meteora DAMM V2 — full DEX liquidity pool active
          </p>
        )}
        {!graduated && hasMarketData && (
          <p className="text-white/25 text-[10px] font-fun mt-2 text-center">
            Trading on Bags bonding curve · graduates to Meteora DAMM V2 automatically
          </p>
        )}
      </div>
    </div>
  );
}
