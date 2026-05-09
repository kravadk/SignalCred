"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { ArrowDownUp, Loader2, CheckCircle2, Zap, AlertTriangle, ExternalLink } from "lucide-react";
import { cn, solToLamports } from "@/lib/utils";
import { SOL_MINT } from "@/lib/constants";
import { USDT_MINT, usdtToNative, nativeToUsdt } from "@/lib/usdt";

interface TradePanelProps { mint: string; symbol: string; }

type Currency = "SOL" | "USDT";
type WalletBalancesResponse = {
  tokenDecimals?: number;
  solBalance?: number | null;
  tokenBalance?: number | null;
  usdtBalance?: number | null;
  error?: string;
};
type QuoteResponse = {
  quoteResponse?: Record<string, unknown> | null;
  unavailable?: boolean;
  error?: string;
};

const QUICK_SOL = ["0.1", "0.5", "1", "2"];
const QUICK_USDT = ["5", "10", "50", "100"];

export function TradePanel({ mint, symbol }: TradePanelProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [currency, setCurrency] = useState<Currency>("SOL");
  const [amount, setAmount] = useState("0.1");
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [done, setDone] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(6);

  // Reset amount when side or currency switches
  useEffect(() => {
    if (side !== "sell") {
      setAmount(currency === "USDT" ? "10" : "0.1");
    }
    setQuote(null);
  }, [side, currency]);

  // Wallet balances and mint decimals are read server-side so RPC credentials never reach the browser.
  useEffect(() => {
    if (!mint) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ tokenMint: mint });
    const wallet = publicKey?.toBase58();
    if (wallet) params.set("wallet", wallet);

    fetch(`/api/wallet/balances?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json() as WalletBalancesResponse;
        if (!r.ok) throw new Error(data.error || "Failed to load balances");
        return data;
      })
      .then((data) => {
        if (typeof data.tokenDecimals === "number") setTokenDecimals(data.tokenDecimals);
        setSolBalance(currency === "SOL" ? data.solBalance ?? null : null);
        setUsdtBalance(currency === "USDT" ? data.usdtBalance ?? null : null);
        setTokenBalance(side === "sell" ? data.tokenBalance ?? 0 : null);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setSolBalance(null);
        setUsdtBalance(null);
        setTokenBalance(side === "sell" ? 0 : null);
      });

    return () => controller.abort();
  }, [mint, publicKey, currency, side]);

  // When token balance loads on sell side, default to 25%
  useEffect(() => {
    if (side === "sell" && tokenBalance != null && tokenBalance > 0) {
      // Round to token's decimals to avoid floating-point dust
      const v = tokenBalance * 0.25;
      setAmount(v.toFixed(Math.min(tokenDecimals, 6)));
    } else if (side === "sell" && tokenBalance === 0) {
      setAmount("0");
    }
  }, [tokenBalance, side, tokenDecimals]);

  const SELL_PCTS = [
    { label: "25%", pct: 0.25 },
    { label: "50%", pct: 0.5 },
    { label: "75%", pct: 0.75 },
    { label: "MAX", pct: 1 },
  ];
  const quickAmounts = currency === "USDT" ? QUICK_USDT : QUICK_SOL;

  const fetchQuote = useCallback(async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || !mint) return;
    setQuoteLoading(true);
    setError(null);
    try {
      let inputMint: string;
      let outputMint: string;
      let nativeAmount: number;

      if (side === "buy") {
        inputMint = currency === "USDT" ? USDT_MINT : SOL_MINT;
        outputMint = mint;
        nativeAmount = currency === "USDT" ? usdtToNative(val) : solToLamports(val);
      } else {
        inputMint = mint;
        outputMint = currency === "USDT" ? USDT_MINT : SOL_MINT;
        nativeAmount = Math.floor(val * Math.pow(10, tokenDecimals));
      }

      const res = await fetch(
        `/api/trade/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${nativeAmount}`
      );
      const data = await res.json() as QuoteResponse;
      if (!res.ok) throw new Error(data.error);
      if (data.unavailable || !data.quoteResponse) {
        setError(data.error || "Quote unavailable for this pair right now");
        setQuote(null);
        return;
      }
      setQuote(data.quoteResponse);
    } catch (e) {
      setError(String(e));
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, side, currency, mint, tokenDecimals]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 700);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const handleSwap = async () => {
    if (!publicKey) { setVisible(true); return; }
    if (!quote) return;
    setSwapping(true);
    setError(null);
    try {
      const outputMint = side === "buy" ? mint
        : currency === "USDT" ? USDT_MINT : SOL_MINT;

      const res = await fetch("/api/trade/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({ quoteResponse: quote, outputMint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const tx = VersionedTransaction.deserialize(Buffer.from(data.tx, "base64"));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      const raw = String(e);
      // Friendlier message for the most common wallet errors
      let msg = raw;
      if (/AccountNotFound|TokenAccountNotFound|InsufficientFunds.*account/i.test(raw)) {
        msg = "Looks like you don't have a token account yet. Make sure your wallet has at least 0.01 SOL to cover ATA rent, then retry.";
      } else if (/User rejected|Transaction was rejected/i.test(raw)) {
        msg = "Transaction rejected in wallet. Nothing was changed.";
      } else if (/blockhash not found|TransactionExpired/i.test(raw)) {
        msg = "Network was slow - refresh the quote and try again";
      } else if (/SlippageToleranceExceeded|0x1771/i.test(raw)) {
        msg = "Price moved beyond your slippage. Increase slippage or refresh quote.";
      } else if (/unsupported mint pair|No route|Could not re-quote/i.test(raw)) {
        msg = "No route found for this pair right now. Refresh the quote or try SOL mode.";
      }
      setError(msg.slice(0, 200));
    } finally {
      setSwapping(false);
    }
  };

  const outAmount = Number(quote?.outAmount ?? 0);
  const priceImpact = Number(quote?.priceImpactPct ?? 0);
  const highImpact = priceImpact > 5;
  const routePlan = Array.isArray(quote?.routePlan) ? quote.routePlan : [];
  const routeLabel = routePlan.length > 0
    ? `${routePlan.length} hop${routePlan.length === 1 ? "" : "s"} via Bags/Jupiter`
    : currency === "USDT"
      ? "USDT route via Bags/Jupiter"
      : "Bags route";

  const formatOut = () => {
    if (side === "buy") {
      return `${(outAmount / Math.pow(10, tokenDecimals)).toFixed(2)} $${symbol}`;
    }
    if (currency === "USDT") return `${nativeToUsdt(outAmount).toFixed(2)} USDT`;
    return `${(outAmount / 1e9).toFixed(5)} SOL`;
  };

  const buyGradient = "linear-gradient(135deg, #26aa68, #69d99a)";
  const sellGradient = "linear-gradient(135deg, #ff624e, #ff6a84)";
  const usdtGradient = "linear-gradient(135deg, #26a17b, #50d8a4)"; // Tether green

  return (
    <div className="card p-5 relative overflow-hidden">
      {/* Color top strip */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: side === "buy"
            ? currency === "USDT" ? "linear-gradient(90deg, #26a17b, #50d8a4)" : "linear-gradient(90deg, #26aa68, #69d99a)"
            : "linear-gradient(90deg, #ff624e, #ff6a84)",
          boxShadow: side === "buy"
            ? currency === "USDT" ? "0 0 12px rgba(38,161,123,0.7)" : "0 0 12px rgba(38,170,104,0.6)"
            : "0 0 12px rgba(255,98,78,0.6)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: side === "buy"
            ? currency === "USDT" ? "radial-gradient(ellipse at top, rgba(38,161,123,0.06), transparent 60%)" : "radial-gradient(ellipse at top, rgba(38,170,104,0.06), transparent 60%)"
            : "radial-gradient(ellipse at top, rgba(255,98,78,0.06), transparent 60%)",
        }}
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1">
            <h3 className="font-display text-xl text-white leading-none">Trade</h3>
            <p className="mt-1 text-[11px] font-body font-semibold text-white/48">
              {currency === "USDT" && side === "buy" ? "Buy with USDT on Solana" : "Bags-native quote and swap"}
            </p>
          </div>

          {/* Buy / Sell */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
            {(["buy", "sell"] as const).map((s) => (
              <button key={s} onClick={() => setSide(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-body font-black capitalize transition-all"
                style={side === s ? {
                  background: s === "buy" ? buyGradient : sellGradient,
                  color: "white",
                  boxShadow: s === "buy" ? "0 4px 12px rgba(38,170,104,0.4)" : "0 4px 12px rgba(255,98,78,0.4)",
                } : { color: "rgba(255,255,255,0.35)" }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Currency selector for buy side */}
        {side === "buy" && (
          <div className="flex gap-1.5 mb-3">
            {(["SOL", "USDT"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-black transition-all"
                style={currency === c ? {
                  background: c === "USDT" ? usdtGradient : "linear-gradient(135deg, rgba(122,85,198,0.4), rgba(255,106,132,0.2))",
                  color: "white",
                  border: c === "USDT" ? "1px solid rgba(38,161,123,0.5)" : "1px solid rgba(122,85,198,0.4)",
                  boxShadow: c === "USDT" ? "0 4px 12px rgba(38,161,123,0.3)" : "0 4px 12px rgba(122,85,198,0.25)",
                } : {
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {c === "USDT" && <span className="text-[10px]">₮</span>}
                {c}
              </button>
            ))}
            {currency === "USDT" && usdtBalance !== null && (
              <span className="text-[#50d8a4] text-xs font-body font-bold ml-2">
                {usdtBalance.toFixed(2)} USDT
              </span>
            )}
            {currency === "SOL" && solBalance !== null && (
              <span className="text-[#9977e0] text-xs font-body font-bold ml-2">
                {solBalance.toFixed(4)} SOL
              </span>
            )}
            {currency === "USDT" && usdtBalance === null && (
              <span className="ml-auto text-[#50d8a4] text-xs font-body font-semibold flex items-center gap-1">
                <span style={{ fontSize: 10 }}>₮</span> Tether on Solana
              </span>
            )}
          </div>
        )}

        {/* Amount input */}
        <label className="block mb-3">
          <span className="text-white/48 text-xs font-body font-black uppercase tracking-[0.12em] block mb-1.5">
            {side === "buy"
              ? `Pay (${currency})`
              : `Sell ($${symbol})`}
          </span>
          <div className="relative">
            <input
              type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0" step={currency === "USDT" ? "1" : "0.01"}
              className="input pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body font-black text-sm"
              style={{ color: currency === "USDT" ? "#50d8a4" : "#9977e0" }}>
              {side === "buy" ? currency : symbol}
            </span>
          </div>
        </label>

        {/* Quick amounts */}
        {side === "sell" ? (
          <div className="mb-4">
            {tokenBalance !== null && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/48 text-xs font-body font-semibold">Balance</span>
                <span className="text-[#ff6a84] text-xs font-body font-bold">
                  {tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}
                </span>
              </div>
            )}
            <div className="flex gap-1.5">
              {SELL_PCTS.map(({ label, pct }) => {
                const val = tokenBalance != null
                  ? (tokenBalance * pct).toFixed(Math.min(tokenDecimals, 6))
                  : null;
                const isActive = val !== null && amount === val;
                return (
                  <button key={label}
                    onClick={() => { if (val !== null) setAmount(val); }}
                    disabled={tokenBalance === null || tokenBalance === 0}
                    className="flex-1 py-1.5 rounded-xl text-xs font-body font-bold transition-all"
                    style={isActive ? {
                      background: sellGradient,
                      color: "white",
                      boxShadow: "0 4px 12px rgba(255,98,78,0.3)",
                    } : {
                      background: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.4)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex gap-1.5 mb-4">
            {quickAmounts.map((v) => (
              <button key={v} onClick={() => setAmount(v)}
                className="flex-1 py-1.5 rounded-xl text-xs font-body font-bold transition-all"
                style={amount === v ? {
                  background: currency === "USDT" ? usdtGradient : buyGradient,
                  color: "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                } : {
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {currency === "USDT" ? `$${v}` : v}
              </button>
            ))}
          </div>
        )}

        {/* Arrow */}
        <div className="flex justify-center mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <ArrowDownUp size={13} className="text-white/40" />
          </div>
        </div>

        {/* Quote panel */}
        <div className="rounded-2xl p-3.5 mb-4 min-h-[88px] flex flex-col justify-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {quoteLoading ? (
            <div className="flex items-center justify-center gap-2 text-white/30">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs font-body font-semibold">Getting best price...</span>
            </div>
          ) : quote ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/48 text-xs font-body font-semibold">You receive</span>
                <span className="font-mono text-base font-black tabular-nums text-white">{formatOut()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/48 text-xs font-body font-semibold">Price impact</span>
                <span className={cn("font-body font-bold text-xs flex items-center gap-1",
                  highImpact ? "text-[#ff624e]" : "text-[#69d99a]"
                )}>
                  {highImpact && <AlertTriangle size={11} />}
                  {priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/48 text-xs font-body font-semibold">Slippage</span>
                <span className="text-white/62 text-xs font-body font-semibold">
                  {((quote.slippageBps as number) ?? 100) / 100}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/48 text-xs font-body font-semibold">Route</span>
                <span className="max-w-[160px] truncate text-right text-white/62 text-xs font-body font-semibold">
                  {routeLabel}
                </span>
              </div>
              {currency === "USDT" && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/8">
                  <span className="text-[10px]" style={{ color: "#50d8a4" }}>₮</span>
                  <span className="text-xs font-body font-semibold" style={{ color: "#50d8a4" }}>
                    Paying with Tether USDT (SPL) on Solana
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/34 text-xs font-body font-semibold text-center">Enter amount to get a quote</p>
          )}
        </div>

        {error && (
          <p className="text-[#ff6a84] text-xs font-body font-semibold text-center mb-3 flex items-center justify-center gap-1">
            <AlertTriangle size={11} /> {error.slice(0, 100)}
          </p>
        )}

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={swapping || !quote || quoteLoading}
          className="w-full h-12 rounded-2xl font-body font-black text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          style={done ? {
            background: "linear-gradient(135deg, #26aa68, #69d99a)",
            boxShadow: "0 8px 24px rgba(38,170,104,0.4)",
          } : side === "buy" ? {
            background: currency === "USDT" ? usdtGradient : buyGradient,
            boxShadow: swapping ? "none"
              : currency === "USDT" ? "0 8px 24px rgba(38,161,123,0.4)"
              : "0 8px 24px rgba(38,170,104,0.35)",
          } : {
            background: sellGradient,
            boxShadow: swapping ? "none" : "0 8px 24px rgba(255,98,78,0.35)",
          }}
        >
          {done ? (
            <><CheckCircle2 size={16} /> Swap Complete!</>
          ) : swapping ? (
            <><Loader2 size={16} className="animate-spin" /> Swapping...</>
          ) : !connected ? (
            "Connect Wallet to Trade"
          ) : side === "buy" ? (
            <><Zap size={14} />
              {currency === "USDT" ? <>Buy ${symbol} with USDT</> : `Buy $${symbol}`}
            </>
          ) : (
            <><Zap size={14} /> Sell ${symbol}</>
          )}
        </button>

        {connected && publicKey && (
          <p className="text-center text-white/24 text-xs font-body font-semibold mt-2">
            {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}
          </p>
        )}
        {txSig && (
          <a
            href={`https://solscan.io/tx/${txSig}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 py-2 text-xs font-body font-black text-[#69d99a] hover:bg-[#00ff88]/12"
          >
            View transaction <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
