"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Droplets, ExternalLink, Loader2, Plus, Minus,
  RefreshCw, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExplorerLink, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";

interface PoolData {
  pairAddress: string;
  dexId: string;
  priceUsd: string;
  liquidity: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  apr: number;
  fdv: number;
  url: string;
}

type LiqTab = "info" | "add" | "remove";

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function LiquidityPanel({ mint, symbol }: { mint: string; symbol: string }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [pool, setPool] = useState<PoolData | null>(null);
  const [graduated, setGraduated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LiqTab>("info");
  const [solAmount, setSolAmount] = useState("0.1");
  const [tokenAmount, setTokenAmount] = useState("0");
  const [txLoading, setTxLoading] = useState(false);
  const [txMsg, setTxMsg] = useState<string | null>(null);

  const fetchPool = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tokens/${mint}/pool`);
      const d = await res.json();
      setGraduated(d.graduated);
      setPool(d.pool ?? null);
    } finally {
      setLoading(false);
    }
  }, [mint]);

  useEffect(() => { fetchPool(); }, [fetchPool]);

  // Estimate token amount from SOL input (rough price estimate from pool)
  useEffect(() => {
    if (!pool?.priceUsd || !solAmount) return;
    const solVal = parseFloat(solAmount) || 0;
    setTokenAmount((solVal / parseFloat(pool.priceUsd || "1") * 100).toFixed(0));
  }, [solAmount, pool]);

  // --- Not graduated state ---
  if (loading) {
    return (
      <div className="card p-5 flex items-center justify-center h-32">
        <Loader2 size={18} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (!graduated || !pool) {
    return (
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Droplets size={15} className="text-[#7c3aed]" />
            <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">Liquidity</span>
          </div>
          <div className="flex flex-col items-center py-4 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/15 flex items-center justify-center">
              <Droplets size={20} className="text-[#7c3aed]" />
            </div>
            <div>
              <p className="text-white/70 font-fun font-bold text-sm">Bonding Curve Active</p>
              <p className="text-white/30 text-xs font-fun mt-1">
                Liquidity unlocks after graduation to Meteora pool (~$69K mcap)
              </p>
            </div>
            <div className="w-full bg-white/5 rounded-xl p-3 border border-white/8 text-xs font-fun text-white/40 text-left space-y-1">
              <p>📈 Buy on bonding curve → price rises automatically</p>
              <p>🎓 Graduates at ~$69K market cap</p>
              <p>💧 Full DEX pool opens after graduation</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Graduated: full LP panel ---
  const meteoraPoolUrl = `https://app.meteora.ag/pools/${pool.pairAddress}`;

  const handleAddLiquidity = async () => {
    if (!publicKey) { setVisible(true); return; }
    setTxLoading(true);
    setTxMsg(null);
    try {
      // Dynamic import to avoid SSR issues
      const { AmmImpl } = await import("@meteora-ag/dynamic-amm-sdk");
      const { PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const { default: BN } = await import("bn.js");

      const poolPubkey = new PublicKey(pool.pairAddress);
      // @ts-ignore — connection type mismatch between adapter versions
      const amm = await AmmImpl.create(connection, poolPubkey);

      const solIn = parseFloat(solAmount) * LAMPORTS_PER_SOL;
      const solBN = new BN(Math.floor(solIn));

      // Get deposit quote (balanced deposit — tokenBInAmount is derived from solBN)
      const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } =
        amm.getDepositQuote(solBN, new BN(0), true, 1);

      setTxMsg(`Adding ${solAmount} SOL + ~${tokenBInAmount.toString()} ${symbol}...`);

      const depositTx = await amm.deposit(
        publicKey,
        tokenAInAmount,
        tokenBInAmount,
        poolTokenAmountOut.muln(99).divn(100) // 1% slippage on LP tokens
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = await sendTransaction(depositTx as any, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxMsg(`✅ Liquidity added! Tx: ${sig.slice(0, 12)}…`);
      fetchPool();
    } catch (e) {
      const msg = String(e);
      if (msg.includes("User rejected")) {
        setTxMsg("Transaction rejected in wallet. Nothing was changed.");
      } else {
        setTxMsg(`Error: ${msg.slice(0, 120)}`);
      }
    } finally {
      setTxLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!publicKey) { setVisible(true); return; }
    setTxLoading(true);
    setTxMsg(null);
    try {
      const { AmmImpl } = await import("@meteora-ag/dynamic-amm-sdk");
      const { PublicKey } = await import("@solana/web3.js");
      const { default: BN } = await import("bn.js");

      const poolPubkey = new PublicKey(pool.pairAddress);
      // @ts-ignore — connection type mismatch between adapter versions
      const amm = await AmmImpl.create(connection, poolPubkey);

      // Get LP token balance
      const lpMint = amm.poolState.lpMint;
      const tokenAccs = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: lpMint });
      const lpBalance = tokenAccs.value[0]?.account.data.parsed.info.tokenAmount.amount ?? "0";
      const lpBN = new BN(lpBalance);

      if (lpBN.isZero()) {
        setTxMsg("You have no LP tokens in this pool.");
        return;
      }

      // Withdraw 100% of position — slippage baked in via minTokenAOutAmount/minTokenBOutAmount
      const { minTokenAOutAmount, minTokenBOutAmount } = amm.getWithdrawQuote(lpBN, 1);
      setTxMsg(`Removing liquidity…`);

      const withdrawTx = await amm.withdraw(
        publicKey,
        lpBN,
        minTokenAOutAmount,
        minTokenBOutAmount
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = await sendTransaction(withdrawTx as any, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxMsg(`✅ Liquidity removed! Tx: ${sig.slice(0, 12)}…`);
      fetchPool();
    } catch (e) {
      const msg = String(e);
      if (msg.includes("User rejected")) setTxMsg("Transaction rejected in wallet. Nothing was changed.");
      else setTxMsg(`Error: ${msg.slice(0, 120)}`);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/4 to-transparent pointer-events-none" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets size={15} className="text-[#00ff88]" />
            <span className="text-white/70 text-xs font-fun font-bold uppercase tracking-wider">Liquidity Pool</span>
            <span className="px-2 py-0.5 rounded-lg bg-[#00ff88]/15 text-[#00ff88] text-[10px] font-mono font-bold border border-[#00ff88]/25">
              LIVE
            </span>
          </div>
          <button onClick={fetchPool} className="text-white/25 hover:text-white/60 transition-colors p-1">
            <RefreshCw size={12} />
          </button>
        </div>

        {/* TVL / APR / Volume row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "TVL", value: formatUsd(pool.liquidity), color: "text-[#00ff88]", sub: "Total liquidity" },
            { label: "APR", value: `${pool.apr}%`, color: "text-[#ffb84d]", sub: "Est. annual yield" },
            { label: "Vol 24h", value: formatUsd(pool.volume24h), color: "text-[#b48dff]", sub: "Trading volume" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-white/5 rounded-xl p-2.5 border border-white/8 text-center">
              <p className="text-white/30 text-[9px] font-mono uppercase mb-0.5">{label}</p>
              <p className={`text-sm font-mono font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-white/20 text-[9px] font-fun">{sub}</p>
            </div>
          ))}
        </div>

        {/* Buy/Sell pressure */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono">
            <span className="text-[#00ff88]">Buys {pool.buys24h}</span>
            <span className="text-white/30">24h pressure</span>
            <span className="text-[#ff3366]">Sells {pool.sells24h}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            {(() => {
              const total = pool.buys24h + pool.sells24h;
              const buyPct = total > 0 ? (pool.buys24h / total) * 100 : 50;
              return (
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${buyPct}%`,
                    background: "linear-gradient(90deg, #00ff88, #00cc66)",
                  }}
                />
              );
            })()}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/6 border border-white/8 mb-4">
          {([
            { id: "info" as LiqTab, label: "ℹ️ Info" },
            { id: "add"  as LiqTab, label: "＋ Add" },
            { id: "remove" as LiqTab, label: "－ Remove" },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => { setTab(id); setTxMsg(null); }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-fun font-bold transition-all",
                tab === id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "info" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-fun p-2.5 rounded-xl bg-white/5">
              <span className="text-white/40">Pool address</span>
              <ExplorerLink
                href={solscanUrl(pool.pairAddress, "account")}
                label={shortAddress(pool.pairAddress)}
                className="text-white/70 font-mono"
              />
            </div>
            <div className="flex items-center justify-between text-xs font-fun p-2.5 rounded-xl bg-white/5">
              <span className="text-white/40">Protocol</span>
              <span className="text-white/70">Meteora DAMM</span>
            </div>
            <div className="flex items-center justify-between text-xs font-fun p-2.5 rounded-xl bg-white/5">
              <span className="text-white/40">Fee tier</span>
              <span className="text-white/70">0.25%</span>
            </div>
            <a href={meteoraPoolUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-fun font-bold text-sm transition-all hover:scale-[1.02] mt-1"
              style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,204,102,0.1))", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}>
              <ExternalLink size={13} /> Open on Meteora
            </a>
          </div>
        )}

        {tab === "add" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#00ff88]/8 border border-[#00ff88]/15 text-xs font-fun text-white/50">
              <Info size={11} className="inline mr-1.5 text-[#00ff88]" />
              Provide equal value of SOL + ${symbol}. You earn 0.25% of all swaps.
            </div>
            <div>
              <span className="text-white/40 text-xs font-fun block mb-1.5">SOL amount</span>
              <div className="relative">
                <input
                  type="number" value={solAmount}
                  onChange={e => setSolAmount(e.target.value)}
                  className="input pr-14 text-sm"
                  min="0" step="0.01"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9977e0] font-fun font-black text-sm">SOL</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {["0.1", "0.5", "1", "2"].map(v => (
                <button key={v} onClick={() => setSolAmount(v)}
                  className={cn("flex-1 py-1.5 rounded-xl text-xs font-fun font-bold transition-all",
                    solAmount === v ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30" : "bg-white/8 text-white/40 hover:bg-white/15"
                  )}>{v}</button>
              ))}
            </div>
            <p className="text-white/25 text-xs font-fun text-center">
              + ~{tokenAmount} ${symbol} (auto-balanced)
            </p>
            <button
              onClick={handleAddLiquidity}
              disabled={txLoading || !solAmount || parseFloat(solAmount) <= 0}
              className="w-full py-3 rounded-xl font-fun font-bold text-sm text-[#08080f] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: txLoading ? "#4a7a5a" : "linear-gradient(135deg, #00ff88, #00cc66)" }}>
              {txLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {txLoading ? "Processing…" : publicKey ? "Add Liquidity" : "Connect Wallet"}
            </button>
          </div>
        )}

        {tab === "remove" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#ff3366]/8 border border-[#ff3366]/15 text-xs font-fun text-white/50">
              <Info size={11} className="inline mr-1.5 text-[#ff3366]" />
              Removes your full LP position. You receive SOL + ${symbol} back.
            </div>
            <button
              onClick={handleRemoveLiquidity}
              disabled={txLoading}
              className="w-full py-3 rounded-xl font-fun font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: txLoading ? "#4a1a2a" : "linear-gradient(135deg, #ff3366, #cc0033)" }}>
              {txLoading ? <Loader2 size={14} className="animate-spin" /> : <Minus size={14} />}
              {txLoading ? "Processing…" : publicKey ? "Remove My Liquidity" : "Connect Wallet"}
            </button>
            <p className="text-white/25 text-xs font-fun text-center">
              Removes 100% of your position in this pool
            </p>
          </div>
        )}

        {/* TX status message */}
        {txMsg && (
          <div className={cn(
            "mt-3 p-3 rounded-xl text-xs font-fun border",
            txMsg.startsWith("✅")
              ? "bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]"
              : txMsg.startsWith("Error") || txMsg.startsWith("Transaction cancelled")
              ? "bg-[#ff3366]/10 border-[#ff3366]/20 text-[#ff3366]"
              : "bg-white/8 border-white/15 text-white/60"
          )}>
            {txMsg}
          </div>
        )}
      </div>
    </div>
  );
}
