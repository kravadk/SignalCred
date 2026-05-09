"use client";
import { ExternalLink, Copy, Users } from "lucide-react";
import type { Token } from "@/db/schema";
import { shortWallet } from "@/lib/utils";
import Link from "next/link";

export function TokenEconomics({ token }: { token: Token | null }) {
  if (!token) return null;

  const totalSupplyDisplay = "1,000,000,000"; // Bags fixed supply
  const copyMint = () => navigator.clipboard.writeText(token.mint);

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-display text-lg text-white flex items-center gap-2">
        📊 Token Economics
      </h3>

      {/* Supply info */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total Supply", value: totalSupplyDisplay, color: "text-[#b48dff]" },
          { label: "Decimals", value: "6", color: "text-white/70" },
          { label: "Network", value: "Solana Mainnet", color: "text-[#00ff88]" },
          { label: "Protocol", value: "Bags DBC", color: "text-[#ffb84d]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/5 rounded-xl p-2.5 border border-white/8">
            <p className="text-white/30 text-[10px] font-mono uppercase mb-0.5">{label}</p>
            <p className={`text-xs font-mono font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mint address */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/8">
        <span className="text-white/30 text-xs font-mono shrink-0">Mint:</span>
        <span className="text-white/70 text-xs font-mono flex-1 truncate">{token.mint}</span>
        <button onClick={copyMint} className="text-white/30 hover:text-[#00ff88] transition-colors shrink-0">
          <Copy size={11} />
        </button>
        <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer"
          className="text-white/30 hover:text-[#00ff88] transition-colors shrink-0">
          <ExternalLink size={11} />
        </a>
      </div>

      {/* Fee split */}
      <div className="p-3 rounded-xl bg-[#00ff88]/8 border border-[#00ff88]/15">
        <p className="text-[#00ff88] text-xs font-fun font-bold mb-2">💰 Revenue Split</p>
        <div className="flex gap-2">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00ff88] to-[#7c3aed]" style={{ width: "75%" }} />
          </div>
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] font-mono">
          <span className="text-[#00ff88]">75% Creator</span>
          <span className="text-[#7c3aed]">25% Platform</span>
        </div>
      </div>

      {/* Team */}
      {token.teamWallets && token.teamWallets.length > 0 && (
        <div>
          <p className="text-white/40 text-xs font-fun font-bold uppercase mb-2 flex items-center gap-1.5">
            <Users size={11} /> Team
          </p>
          <div className="space-y-1.5">
            {token.teamWallets.map((w, i) => (
              <Link key={i} href={`/profile/${w}`}
                className="flex items-center gap-2 hover:bg-white/5 rounded-xl p-1.5 transition-all">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ff3366] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                  {i + 1}
                </div>
                <span className="text-white/60 text-xs font-mono hover:text-white transition-colors">{shortWallet(w)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
