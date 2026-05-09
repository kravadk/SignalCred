"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TrendingUp, TrendingDown, Users } from "lucide-react";

interface SentimentData {
  bullish: number;
  bearish: number;
  total: number;
  bullishPct: number;
  bearishPct: number;
}

export function CommunitySentiment({ mint }: { mint: string }) {
  const { publicKey } = useWallet();
  const [data, setData] = useState<SentimentData>({ bullish: 0, bearish: 0, total: 0, bullishPct: 0, bearishPct: 0 });
  const [myVote, setMyVote] = useState<"bullish" | "bearish" | null>(null);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch(`/api/tokens/${mint}/sentiment`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });

  useEffect(() => { load(); }, [mint]);

  const vote = async (v: "bullish" | "bearish") => {
    if (!publicKey || voting) return;
    if (myVote === v) { setMyVote(null); return; }
    setVoting(true);
    try {
      await fetch(`/api/tokens/${mint}/sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({ vote: v }),
      });
      setMyVote(v);
      await load();
    } finally { setVoting(false); }
  };

  if (loading) return (
    <div className="card p-5">
      <div className="skeleton-wave h-4 w-32 mb-4 rounded-xl" />
      <div className="skeleton-wave h-2.5 w-full mb-4 rounded-full" />
      <div className="flex gap-2">
        <div className="skeleton-wave h-10 flex-1 rounded-xl" />
        <div className="skeleton-wave h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#7a55c6]/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7a55c6]/30 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-white flex items-center gap-2">
            <Users size={16} className="text-[#7a55c6]" /> Community Sentiment
          </h3>
          <span className="text-white/25 text-xs font-fun">{data.total} {data.total === 1 ? "vote" : "votes"}</span>
        </div>

        {/* Bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-1 bg-white/8">
          <div
            className="transition-all duration-700 ease-out"
            style={{ width: `${data.bullishPct}%`, background: "linear-gradient(90deg, #26aa68, #69d99a)" }}
          />
          <div
            className="transition-all duration-700 ease-out"
            style={{ width: `${data.bearishPct}%`, background: "linear-gradient(90deg, #ff624e, #ff9a87)" }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-fun text-white/30 mb-4">
          <span>{data.bullishPct}% bullish</span>
          <span>{data.bearishPct}% bearish</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => vote("bullish")}
            disabled={voting || !publicKey}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-fun font-bold transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{
              background: myVote === "bullish" ? "rgba(38,170,104,0.22)" : "rgba(38,170,104,0.07)",
              border: `1px solid ${myVote === "bullish" ? "rgba(38,170,104,0.55)" : "rgba(38,170,104,0.18)"}`,
              color: "#69d99a",
              boxShadow: myVote === "bullish" ? "0 0 16px rgba(38,170,104,0.25)" : "none",
            }}
          >
            <TrendingUp size={14} />
            Bullish
            {data.bullish > 0 && <span className="opacity-60 text-xs">· {data.bullish}</span>}
          </button>
          <button
            onClick={() => vote("bearish")}
            disabled={voting || !publicKey}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-fun font-bold transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{
              background: myVote === "bearish" ? "rgba(255,98,78,0.22)" : "rgba(255,98,78,0.07)",
              border: `1px solid ${myVote === "bearish" ? "rgba(255,98,78,0.55)" : "rgba(255,98,78,0.18)"}`,
              color: "#ff9a87",
              boxShadow: myVote === "bearish" ? "0 0 16px rgba(255,98,78,0.25)" : "none",
            }}
          >
            <TrendingDown size={14} />
            Bearish
            {data.bearish > 0 && <span className="opacity-60 text-xs">· {data.bearish}</span>}
          </button>
        </div>
        {!publicKey && (
          <p className="text-center text-white/25 text-[10px] font-fun mt-2">Connect wallet to vote</p>
        )}
      </div>
    </div>
  );
}
