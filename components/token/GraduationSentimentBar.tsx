"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Zap, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";

interface SentimentData { bullish: number; bearish: number; total: number; bullishPct: number; bearishPct: number; }

export function GraduationSentimentBar({ mint }: { mint: string }) {
  const { publicKey } = useWallet();

  // Graduation
  const [mc, setMc] = useState<number | null>(null);
  const [liquidity, setLiquidity] = useState<number | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [graduated, setGraduated] = useState(false);

  // Sentiment
  const [data, setData] = useState<SentimentData>({ bullish: 0, bearish: 0, total: 0, bullishPct: 0, bearishPct: 0 });
  const [myVote, setMyVote] = useState<"bullish" | "bearish" | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetch(`/api/tokens/${mint}/trades`).then(r => r.json()).then(d => {
      if (d.pair?.marketCap) setMc(d.pair.marketCap);
      if (d.pair?.liquidity?.usd) setLiquidity(d.pair.liquidity.usd);
      if (d.pair?.pairAddress) setPairAddress(d.pair.pairAddress);
      if (d.pair) setGraduated(true);
    });
    fetch(`/api/tokens/${mint}/pool`).then(r => r.json()).then(d => { if (d.graduated) setGraduated(true); });
    loadSentiment();
  }, [mint]);

  const loadSentiment = () =>
    fetch(`/api/tokens/${mint}/sentiment`).then(r => r.json()).then(setData);

  const vote = async (v: "bullish" | "bearish") => {
    if (!publicKey || voting) return;
    setVoting(true);
    try {
      await fetch(`/api/tokens/${mint}/sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({ vote: v }),
      });
      setMyVote(myVote === v ? null : v);
      await loadSentiment();
    } finally { setVoting(false); }
  };

  // Graduation visual signal
  const liquiditySignal = liquidity ?? 0;
  const mcSignal = mc ?? 0;
  const progress = graduated ? 100 : Math.min(
    100,
    (liquiditySignal > 0 ? Math.min(liquiditySignal / 50, 60) : 0) +
    (mcSignal > 0 ? Math.min(mcSignal / 2000, 40) : 0)
  );
  const segments = 12;
  const filled = Math.round((progress / 100) * segments);

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7a55c6]/25 to-transparent" />
      <div className="grid grid-cols-2 divide-x divide-white/8">

        {/* Left — Graduation */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className={graduated ? "text-[#00ff88]" : "text-[#ffb84d]"} />
              <span className="text-white/55 text-[11px] font-fun font-bold uppercase tracking-wider">
                {graduated ? "Graduated" : "Bonding Curve"}
              </span>
            </div>
            {graduated && pairAddress ? (
              <a href={`https://dexscreener.com/solana/${pairAddress}`} target="_blank" rel="noreferrer"
                className="text-[#00ff88]/50 hover:text-[#00ff88] transition-colors">
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="text-white/20 text-[10px] font-mono">DBC phase</span>
            )}
          </div>

          {/* Segmented bar */}
          <div className="flex gap-0.5 mb-2">
            {Array.from({ length: segments }).map((_, i) => (
              <div key={i} className="flex-1 h-2 rounded-sm transition-all duration-500"
                style={{
                  background: i < filled
                    ? `hsl(${150 - (i / segments) * 30}, 100%, 55%)`
                    : "rgba(255,255,255,0.07)",
                  boxShadow: i < filled && i === filled - 1 ? "0 0 6px rgba(0,255,136,0.5)" : "none",
                }}
              />
            ))}
          </div>

          <div className="flex justify-between text-[9px] font-mono text-white/20">
            <span>Launch</span>
            {graduated
              ? <span className="text-[#00ff88]">✓ DAMM V2</span>
              : <span>→ Meteora</span>
            }
          </div>

          {mc && mc > 0 && (
            <p className="text-white/25 text-[10px] font-mono mt-1.5">
              MCap ${mc >= 1000 ? `${(mc/1000).toFixed(1)}K` : mc.toFixed(0)}
              {liquidity && liquidity > 0 ? ` · Liq $${liquidity >= 1000 ? `${(liquidity/1000).toFixed(1)}K` : liquidity.toFixed(0)}` : ""}
            </p>
          )}
        </div>

        {/* Right — Sentiment */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-white/55 text-[11px] font-fun font-bold uppercase tracking-wider">Sentiment</span>
            <span className="text-white/20 text-[10px] font-fun">{data.total} votes</span>
          </div>

          {/* Bar */}
          <div className="flex h-2 rounded-full overflow-hidden mb-2 bg-white/8">
            <div className="transition-all duration-700" style={{ width: `${data.bullishPct}%`, background: "linear-gradient(90deg,#26aa68,#69d99a)" }} />
            <div className="transition-all duration-700" style={{ width: `${data.bearishPct}%`, background: "linear-gradient(90deg,#ff624e,#ff9a87)" }} />
          </div>

          <div className="flex gap-1.5">
            <button onClick={() => vote("bullish")} disabled={voting || !publicKey}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-fun font-bold transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: myVote === "bullish" ? "rgba(38,170,104,0.2)" : "rgba(38,170,104,0.07)",
                border: `1px solid ${myVote === "bullish" ? "rgba(38,170,104,0.5)" : "rgba(38,170,104,0.15)"}`,
                color: "#69d99a",
              }}>
              <TrendingUp size={11} /> {data.bullishPct > 0 ? `${data.bullishPct}%` : "Bull"}
            </button>
            <button onClick={() => vote("bearish")} disabled={voting || !publicKey}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-fun font-bold transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: myVote === "bearish" ? "rgba(255,98,78,0.2)" : "rgba(255,98,78,0.07)",
                border: `1px solid ${myVote === "bearish" ? "rgba(255,98,78,0.5)" : "rgba(255,98,78,0.15)"}`,
                color: "#ff9a87",
              }}>
              <TrendingDown size={11} /> {data.bearishPct > 0 ? `${data.bearishPct}%` : "Bear"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
