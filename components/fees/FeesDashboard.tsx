"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
  Loader2, CheckCircle2, TrendingUp, Coins, Award,
  Zap, ExternalLink, Trophy, RefreshCw, Info,
} from "lucide-react";
import { lamportsToSol } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import Link from "next/link";
import { solToUsdt } from "@/lib/usdt";

interface Position {
  baseMint?: string | null;
  virtualPool?: string | null;
  claimableDisplayAmount?: number;
  totalClaimableLamportsUserShare?: number;
  isCustomFeeVault?: boolean;
}

interface PartnerStats {
  claimedFees: string;
  unclaimedFees: string;
}

interface PartnerConfig {
  exists: boolean;
  wallet?: string;
}

export function FeesDashboard() {
  const { publicKey, sendTransaction, signMessage } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [positions, setPositions] = useState<Position[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerStats | null>(null);
  const [partnerConfig, setPartnerConfig] = useState<PartnerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState(150);

  const loadFees = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fees/partner", {
        headers: { "x-wallet": publicKey.toBase58() },
      });
      const data = await res.json();
      setPositions(data.positions ?? []);
      setPartnerStats(data.partnerStats ?? null);
      setPartnerConfig(data.partnerConfig ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { loadFees(); }, [loadFees]);

  useEffect(() => {
    fetch("/api/usdt/price").then((r) => r.json()).then((d) => {
      if (d.solPriceUsdt) setSolPrice(d.solPriceUsdt);
    }).catch(() => {});
  }, []);

  const claim = async (mint: string) => {
    if (!publicKey) { setVisible(true); return; }
    if (!signMessage) {
      setError("Your wallet does not support message signing.");
      return;
    }
    setClaiming(mint);
    setError(null);
    try {
      const wallet = publicKey.toBase58();
      const message = [
        "SignalCred wallet verification",
        `wallet:${wallet}`,
        "action:claim-fees",
        `mint:${mint}`,
        `timestamp:${Date.now()}`,
      ].join("|");
      const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));
      const res = await fetch(`/api/fees/token/${mint}/claim`, {
        method: "POST",
        headers: {
          "x-wallet": wallet,
          "x-message": message,
          "x-signature": signature,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      for (const txB64 of data.txs as string[]) {
        const tx = Transaction.from(Buffer.from(txB64, "base64"));
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }
      setClaimed((s) => new Set(Array.from(s).concat(mint)));
      await loadFees();
    } catch (e) {
      setError(String(e));
    } finally {
      setClaiming(null);
    }
  };

  const totalClaimable = positions.reduce(
    (s, p) => s + (p.totalClaimableLamportsUserShare ?? 0), 0
  );
  const totalSol = lamportsToSol(totalClaimable);

  const partnerClaimed = lamportsToSol(Number(partnerStats?.claimedFees ?? 0));
  const partnerUnclaimed = lamportsToSol(Number(partnerStats?.unclaimedFees ?? 0));

  const STATS = [
    {
      icon: Coins, label: "Creator Claimable",
      value: publicKey ? totalSol : null,
      suffix: " SOL",
      sub: publicKey ? `≈ ${solToUsdt(totalSol, solPrice).toFixed(2)} USDT` : undefined,
      gradient: "from-[#26aa68] to-[#69d99a]",
      glow: "rgba(38,170,104,0.3)",
      bg: "from-[#26aa68]/15 to-[#69d99a]/5",
    },
    {
      icon: Trophy, label: "Platform Earned",
      value: publicKey && partnerStats ? partnerClaimed + partnerUnclaimed : null,
      suffix: " SOL",
      sub: partnerStats ? `${partnerUnclaimed.toFixed(4)} unclaimed` : undefined,
      gradient: "from-[#ffb84d] to-[#ff624e]",
      glow: "rgba(255,184,77,0.3)",
      bg: "from-[#ffb84d]/15 to-[#ff624e]/5",
    },
    {
      icon: Award, label: "Fee Config",
      value: null,
      text: "75 / 25",
      sub: "Creator / Platform BPS",
      gradient: "from-[#7a55c6] to-[#ff6a84]",
      glow: "rgba(122,85,198,0.3)",
      bg: "from-[#7a55c6]/15 to-[#ff6a84]/5",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="relative mb-8">
        <div className="absolute -top-6 -left-4 w-96 h-32 bg-gradient-to-r from-[#26aa68]/25 via-[#69d99a]/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-green/30 bg-green/15 text-[#69d99a] text-xs font-fun font-black uppercase tracking-wider mb-4">
              <Zap size={11} /> Fee Sharing Track
            </span>
            <h1 className="font-display text-5xl text-white mb-2">Fees Dashboard</h1>
            <p className="text-white/45 font-fun text-sm">
              Creator royalties + platform partner fees · all via Bags SDK
            </p>
            {/* Fee mechanics explanation */}
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { icon: "⚡", label: "Per-swap accrual", desc: "Bags swap fees accrue into claimable vaults" },
                { icon: "🏦", label: "No expiry", desc: "SOL waits in vault until you claim" },
                { icon: "✂️", label: "75 / 25 split", desc: "Creator 7,500 bps - Platform 2,500 bps" },
                { icon: "🔗", label: "On-chain proof", desc: "sdk.fee.getAllClaimablePositions()" },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-white/70 text-xs font-fun font-bold leading-none">{label}</p>
                    <p className="text-white/30 text-[10px] font-mono mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {publicKey && (
            <button
              onClick={loadFees}
              disabled={loading}
              className="btn-ghost h-10 px-4 flex items-center gap-2 text-sm font-fun font-bold"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Partner config setup */}
      {publicKey && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-fun font-bold text-sm">Platform Partner Config</p>
              <p className="text-white/40 text-xs font-fun">Required for fee sharing on Bags</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-xs font-fun font-bold bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30">
              ✅ Active
            </span>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map(({ icon: Icon, label, value, suffix, text, sub, gradient, glow, bg }) => (
          <div key={label} className={`card p-5 relative overflow-hidden bg-gradient-to-br ${bg}`}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: `inset 0 0 30px ${glow}` }} />
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}
              style={{ boxShadow: `0 4px 16px ${glow}` }}>
              <Icon size={16} className="text-white" />
            </div>
            {value !== null && value !== undefined ? (
              <p className="font-display text-xl text-white leading-tight">
                <AnimatedCounter value={value} decimals={4} suffix={suffix} />
              </p>
            ) : (
              <p className="font-display text-xl text-white leading-tight">{text ?? "—"}</p>
            )}
            {sub && <p className="text-white/35 text-xs font-fun mt-0.5">{sub}</p>}
            <p className="text-white/40 text-xs font-fun mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* Partner config status */}
      {publicKey && partnerConfig && (
        <div className={`card p-4 mb-5 border ${partnerConfig.exists
          ? "border-[#26aa68]/25 bg-[#26aa68]/5"
          : "border-[#ffb84d]/25 bg-[#ffb84d]/5"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${partnerConfig.exists
              ? "bg-[#26aa68]/20"
              : "bg-[#ffb84d]/20"}`}>
              <Info size={14} className={partnerConfig.exists ? "text-[#69d99a]" : "text-[#ffb84d]"} />
            </div>
            <div>
              <p className={`text-sm font-fun font-bold ${partnerConfig.exists ? "text-[#69d99a]" : "text-[#ffb84d]"}`}>
                {partnerConfig.exists
                  ? "✅ Partner config active — sdk.partner.getPartnerConfig() ✓"
                  : "⚠️ No partner config found for this wallet"}
              </p>
              <p className="text-white/35 text-xs font-fun mt-0.5">
                {partnerConfig.exists
                  ? "Your wallet is registered as a Bags partner. Platform fees are being collected."
                  : "Create a partner key at dev.bags.fm to earn platform fees"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partner stats from SDK */}
      {publicKey && partnerStats && (partnerClaimed > 0 || partnerUnclaimed > 0) && (
        <div className="card p-5 mb-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ffb84d]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffb84d]/6 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-[#ffb84d]" />
              <h3 className="font-display text-lg text-white">Platform Partner Stats</h3>
              <span className="ml-auto text-white/25 text-xs font-fun">sdk.partner.getPartnerConfigClaimStats()</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3 bg-[#26aa68]/10 border border-[#26aa68]/20 text-center">
                <p className="text-white/40 text-xs font-fun mb-1">Total Claimed</p>
                <p className="font-display text-xl text-[#69d99a]">
                  <AnimatedCounter value={partnerClaimed} decimals={4} suffix=" SOL" />
                </p>
              </div>
              <div className="rounded-2xl p-3 bg-[#ffb84d]/10 border border-[#ffb84d]/20 text-center">
                <p className="text-white/40 text-xs font-fun mb-1">Unclaimed</p>
                <p className="font-display text-xl text-[#ffb84d]">
                  <AnimatedCounter value={partnerUnclaimed} decimals={4} suffix=" SOL" />
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee explanation */}
      <div className="card p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7a55c6]/8 to-transparent pointer-events-none" />
        <h3 className="font-display text-xl text-white mb-3">How Fee Sharing Works</h3>
        <div className="space-y-2.5">
          {[
            {
              gradient: "from-[#26aa68] to-[#69d99a]",
              title: "Creator fee (75% — 7,500 bps)",
              desc: "You earn on every trade of your token. Configured at launch via Bags SDK createBagsFeeShareConfig().",
            },
            {
              gradient: "from-[#7a55c6] to-[#9977e0]",
              title: "Platform fee (25% — 2,500 bps)",
              desc: "SignalCred earns as Bags partner key holder. Tracked via sdk.partner.getPartnerConfigClaimStats().",
            },
            {
              gradient: "from-[#ff624e] to-[#ffb84d]",
              title: "Claim anytime",
              desc: "No expiry. Use sdk.fee.getClaimTransactions() to build claim tx — just sign in Phantom.",
            },
          ].map(({ gradient, title, desc }) => (
            <div key={title}
              className="flex items-start gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-white font-fun font-bold text-sm">{title}</p>
                <p className="text-white/45 text-xs font-fun mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect prompt */}
      {!publicKey ? (
        <div className="card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#26aa68]/8 via-transparent to-[#7a55c6]/8 pointer-events-none" />
          <div className="relative">
            <div className="text-5xl mb-4 animate-float-slow inline-block">💰</div>
            <h3 className="font-display text-2xl text-white mb-2">Connect to See Your Fees</h3>
            <p className="text-white/40 font-fun text-sm mb-6">
              Connect Phantom to view creator positions and partner earnings
            </p>
            <button onClick={() => setVisible(true)}
              className="btn-primary h-11 px-8 font-fun font-black text-sm inline-flex items-center gap-2 shine">
              Connect Wallet
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-white/30">
          <Loader2 size={18} className="animate-spin" />
          <span className="font-fun text-sm">Loading positions via Bags SDK…</span>
        </div>
      ) : error ? (
        <div className="card p-6 border border-[#ff6a84]/20 bg-[#ff6a84]/5 text-center">
          <p className="text-[#ff9aad] font-fun text-sm mb-3">{error}</p>
          <button onClick={loadFees} className="btn-ghost h-9 px-4 text-xs font-fun font-bold">
            <RefreshCw size={12} className="inline mr-1.5" /> Retry
          </button>
        </div>
      ) : positions.length === 0 ? (
        <div className="card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7a55c6]/6 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="text-5xl mb-4 animate-float-slow inline-block">🌱</div>
            <h3 className="font-display text-2xl text-white mb-2">No Claimable Fees Yet</h3>
            <p className="text-white/40 font-fun text-sm mb-6 max-w-xs mx-auto">
              Launch a token and start trading to accumulate creator fees
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/launch"
                className="btn-primary h-10 px-5 inline-flex items-center gap-2 text-sm font-fun font-black shine">
                🚀 Launch Token
              </Link>
              <Link href="/fees"
                className="btn-ghost h-10 px-5 inline-flex items-center gap-2 text-sm font-fun font-bold">
                🏆 View Reputation
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-xl text-white">
              Claimable Positions
              <span className="text-white/30 text-sm font-fun ml-2">sdk.fee.getAllClaimablePositions()</span>
            </h3>
          </div>
          {error && (
            <p className="text-[#ff6a84] text-xs font-fun flex items-center gap-1.5">
              <span>⚠️</span> {error}
            </p>
          )}
          {positions.map((pos, i) => {
            const mint = pos.baseMint ?? `pos-${i}`;
            const displayMint = mint.length > 20 ? `${mint.slice(0, 8)}…${mint.slice(-6)}` : mint;
            const amount = pos.totalClaimableLamportsUserShare ?? 0;
            const sol = lamportsToSol(amount);
            const isClaiming = claiming === mint;
            const isClaimed = claimed.has(mint);

            return (
              <div key={`${mint}-${i}`}
                className="card p-4 flex items-center gap-4 relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#26aa68]/5 to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-4 w-full">
                  {/* Token icon */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-display font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg, #26aa68, #7a55c6)", boxShadow: "0 4px 12px rgba(38,170,104,0.3)" }}
                  >
                    {mint.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-fun font-bold text-sm truncate">{displayMint}</p>
                    <p className="text-white/35 text-xs font-fun">
                      {pos.isCustomFeeVault ? "custom vault" : "fee position"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display text-lg text-[#69d99a]">
                      <AnimatedCounter value={sol} decimals={4} suffix=" SOL" />
                    </p>
                    <p className="text-white/25 text-xs font-fun">
                      {amount.toLocaleString()} lamports
                    </p>
                  </div>

                  <button
                    onClick={() => claim(mint)}
                    disabled={!!claiming || amount === 0 || isClaimed}
                    className="shrink-0 h-10 px-4 rounded-2xl text-sm font-fun font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={isClaimed
                      ? { background: "rgba(38,170,104,0.2)", color: "#69d99a", border: "1px solid rgba(38,170,104,0.3)" }
                      : { background: "linear-gradient(135deg, #26aa68, #69d99a)", boxShadow: "0 4px 16px rgba(38,170,104,0.35)" }
                    }
                  >
                    {isClaiming
                      ? <><Loader2 size={13} className="animate-spin" /> Claiming…</>
                      : isClaimed
                      ? <><CheckCircle2 size={13} /> Claimed!</>
                      : <><Zap size={13} /> Claim</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
