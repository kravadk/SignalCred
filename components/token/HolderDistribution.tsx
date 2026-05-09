"use client";
import { useState, useEffect } from "react";
import { Users } from "lucide-react";

interface Holder { rank: number; address: string; amount: number; pct: number; label: string; }
interface Distribution { whales: number; mid: number; retail: number; }

function shortAddr(addr: string) { return addr.slice(0, 4) + "…" + addr.slice(-4); }

export function HolderDistribution({ mint }: { mint: string }) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [dist, setDist] = useState<Distribution | null>(null);
  const [totalHolders, setTotalHolders] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/tokens/${mint}/holders`)
      .then(r => r.json())
      .then(d => { setHolders(d.holders ?? []); setDist(d.distribution); setTotalHolders(d.totalHolders ?? 0); });
  }, [mint]);

  if (!holders.length && !dist) return null;

  const visible = expanded ? holders : holders.slice(0, 5);

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffb84d]/4 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#ffb84d]" />
            <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">Holder Distribution</span>
            {totalHolders > 0 && <span className="text-white/25 text-xs font-mono">{totalHolders} total</span>}
          </div>
        </div>

        {dist && (
          <div className="mb-4">
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-[#ff3366] transition-all" style={{ width: `${dist.whales}%` }} title={`Whales: ${dist.whales.toFixed(1)}%`} />
              <div className="h-full bg-[#ffb84d]" style={{ width: `${dist.mid}%` }} title={`Mid: ${dist.mid.toFixed(1)}%`} />
              <div className="h-full bg-[#00ff88]" style={{ width: `${dist.retail}%` }} title={`Retail: ${dist.retail.toFixed(1)}%`} />
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ff3366] inline-block" />Whales {dist.whales.toFixed(1)}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ffb84d] inline-block" />Mid {dist.mid.toFixed(1)}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#00ff88] inline-block" />Retail {dist.retail.toFixed(1)}%</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {visible.map(h => (
            <div key={h.address} className="flex items-center gap-2 text-xs">
              <span className="text-white/20 font-mono w-4 shrink-0">#{h.rank}</span>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ff3366]"
                    style={{ width: `${Math.min(h.pct, 100)}%` }} />
                </div>
              </div>
              <span className="text-white/60 font-mono w-12 text-right tabular-nums">{h.pct.toFixed(1)}%</span>
              <a href={`https://solscan.io/account/${h.address}`} target="_blank" rel="noreferrer"
                className="text-white/20 hover:text-white/60 font-mono transition-colors">
                {shortAddr(h.address)}
              </a>
            </div>
          ))}
        </div>

        {holders.length > 5 && (
          <button onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full text-center text-xs font-fun text-[#7c3aed] hover:text-[#9977e0] transition-colors">
            {expanded ? "Show less" : `Show all ${holders.length} holders`}
          </button>
        )}
      </div>
    </div>
  );
}
