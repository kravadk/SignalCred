"use client";
import { useState, useEffect } from "react";
import { shortWallet } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface Creator { wallet: string; bps: number; vault?: string; }

export function TokenCreators({ mint }: { mint: string }) {
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    fetch(`/api/tokens/${mint}/creators`)
      .then(r => r.json())
      .then(d => setCreators(d.creators ?? []));
  }, [mint]);

  if (!creators.length) return null;

  return (
    <div className="card p-4">
      <h3 className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider mb-3">Fee Claimers</h3>
      <div className="space-y-2">
        {creators.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ff3366] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {i + 1}
            </div>
            <span className="text-white/60 flex-1">{shortWallet(c.wallet)}</span>
            <span className="text-[#00ff88] font-bold">{(c.bps / 100).toFixed(0)}%</span>
            <a href={`https://solscan.io/account/${c.wallet}`} target="_blank" rel="noreferrer"
              className="text-white/20 hover:text-white/60">
              <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
