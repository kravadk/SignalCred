"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradePanel } from "@/components/token/TradePanel";

interface TokenItem { mint: string; name: string; symbol: string; price: number | null; socialScore: number; }
interface PairData { priceUsd: string; priceNative: string; volume24h: number; txns24h: number; buys24h: number; sells24h: number; liquidity: number; fdv: number; marketCap: number; }
interface TradeItem { signature: string; blockTime: number | null; type: string; }
type TF = "5m" | "15m" | "1H" | "4H" | "1D";

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-r border-white/8 last:border-r-0">
      <span className="text-white/30 text-[10px] font-mono uppercase tracking-widest">{label}</span>
      <span className={cn("text-white font-mono font-bold text-sm tabular-nums", color)}>{value}</span>
      {sub && <span className="text-white/25 text-[10px] font-mono">{sub}</span>}
    </div>
  );
}

function TradeHistory({ trades, loading }: { trades: TradeItem[]; loading: boolean }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider">Recent Trades</span>
        {loading && <Loader2 size={10} className="animate-spin text-white/30" />}
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-32 text-white/20 text-xs font-mono">
            No trades yet
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-[#0d0a1a]">
              <tr className="text-white/25 text-[10px] uppercase">
                <th className="text-left px-3 py-1.5">Time</th>
                <th className="text-left px-3 py-1.5">Type</th>
                <th className="text-right px-3 py-1.5">Tx</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={t.signature} className={cn("hover:bg-white/3 transition-colors border-b border-white/5", i % 2 === 0 ? "" : "bg-white/2")}>
                  <td className="px-3 py-1.5 text-white/40">
                    {t.blockTime ? new Date(t.blockTime * 1000).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-[#00ff88]">swap</span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <a href={`https://solscan.io/tx/${t.signature}`} target="_blank" rel="noreferrer"
                      className="text-[#7c3aed] hover:text-[#9977e0] transition-colors">
                      {t.signature.slice(0, 6)}…
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TerminalChart({ mint, tf, onTfChange }: { mint: string; tf: TF; onTfChange: (t: TF) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState<{ unixTime: number; open: number; high: number; low: number; close: number; volume: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Map terminal TFs to API TFs
  const apiTf = tf === "5m" ? "15m" : tf === "4H" ? "1H" : tf;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tokens/${mint}/chart?tf=${apiTf}`)
      .then(r => r.json())
      .then(d => setBars(d.bars ?? []))
      .catch(() => setBars([]))
      .finally(() => setLoading(false));
  }, [mint, apiTf]);

  useEffect(() => {
    if (!bars.length || !ref.current) return;
    let cleanup: (() => void) | undefined;

    import("lightweight-charts").then((lc) => {
      const el = ref.current;
      if (!el) return;
      el.innerHTML = "";

      const chart = lc.createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight || 500,
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "rgba(255,255,255,0.4)",
          fontSize: 11,
          fontFamily: "'Courier New', monospace",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: { mode: 1 },
        timeScale: {
          borderColor: "rgba(255,255,255,0.08)",
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      });

      const candles = chart.addCandlestickSeries({
        upColor: "#00ff88",
        downColor: "#ff3366",
        borderUpColor: "#00ff88",
        borderDownColor: "#ff3366",
        wickUpColor: "#00ff88",
        wickDownColor: "#ff3366",
      });

      candles.setData(
        bars.map(b => ({
          time: b.unixTime as unknown as import("lightweight-charts").Time,
          open: b.open, high: b.high, low: b.low, close: b.close,
        }))
      );

      // Volume histogram
      const vol = chart.addHistogramSeries({
        color: "rgba(124,58,237,0.3)",
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vol.setData(bars.map(b => ({
        time: b.unixTime as unknown as import("lightweight-charts").Time,
        value: b.volume,
        color: b.close >= b.open ? "rgba(0,255,136,0.25)" : "rgba(255,51,102,0.25)",
      })));

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el.clientWidth > 0) chart.applyOptions({ width: el.clientWidth, height: el.clientHeight || 500 });
      });
      ro.observe(el);
      cleanup = () => { ro.disconnect(); chart.remove(); };
    });
    return () => cleanup?.();
  }, [bars]);

  const TFS: TF[] = ["5m", "15m", "1H", "4H", "1D"];

  return (
    <div className="flex flex-col h-full">
      {/* TF selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/8">
        {TFS.map(t => (
          <button key={t} onClick={() => onTfChange(t)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-mono font-bold transition-all",
              tf === t ? "bg-[#7c3aed]/40 text-[#b48dff]" : "text-white/30 hover:text-white/70"
            )}
          >{t}</button>
        ))}
        <div className="flex-1" />
        {loading && <Loader2 size={11} className="animate-spin text-white/30" />}
      </div>
      {/* Chart */}
      <div ref={ref} className="flex-1 min-h-0" />
    </div>
  );
}

export function TerminalView() {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [selected, setSelected] = useState<TokenItem | null>(null);
  const [search, setSearch] = useState("");
  const [tf, setTf] = useState<TF>("1H");
  const [pair, setPair] = useState<PairData | null>(null);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [showTokenList, setShowTokenList] = useState(false);

  // Load token list
  useEffect(() => {
    fetch("/api/trending/tokens")
      .then(r => r.json())
      .then(d => {
        const list = d.tokens ?? [];
        setTokens(list);
        if (list.length > 0 && !selected) setSelected(list[0]);
      });
  }, []);

  // Load pair data & trades when token changes
  useEffect(() => {
    if (!selected) return;
    setTradesLoading(true);
    fetch(`/api/tokens/${selected.mint}/trades`)
      .then(r => r.json())
      .then(d => {
        setPair(d.pair ?? null);
        setTrades(d.trades ?? []);
      })
      .catch(() => {})
      .finally(() => setTradesLoading(false));
  }, [selected]);

  const filtered = tokens.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  if (tokens.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-white/30 font-mono">
        <div className="text-center">
          <p className="text-2xl mb-2">📉</p>
          <p>No tokens launched yet</p>
          <Link href="/launch" className="text-[#7c3aed] hover:underline mt-2 block">Launch first token →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] bg-[#08080f] border-t border-white/8 font-mono overflow-hidden">

      {/* ── Top bar: token selector + stats ── */}
      <div className="flex items-stretch border-b border-white/8 shrink-0 overflow-x-auto">
        {/* Token selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowTokenList(!showTokenList)}
            className="flex items-center gap-2 px-4 h-full border-r border-white/8 hover:bg-white/5 transition-colors min-w-[160px]"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#7c3aed] to-[#ff3366] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {selected?.symbol[0] ?? "?"}
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">${selected?.symbol ?? "—"}</p>
              <p className="text-white/30 text-[10px]">{selected?.name ?? ""}</p>
            </div>
            <span className="text-white/30 text-xs ml-1">▾</span>
          </button>

          {showTokenList && (
            <div className="absolute top-full left-0 z-50 w-64 bg-[#0d0a1a] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-2 border-b border-white/8">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search token…"
                  className="w-full bg-white/8 rounded-lg px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/25 border border-white/10"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.map(t => (
                  <button key={t.mint} onClick={() => { setSelected(t); setShowTokenList(false); setSearch(""); }}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/8 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-[#7c3aed] to-[#ff3366] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {t.symbol[0]}
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">${t.symbol}</p>
                      <p className="text-white/30 text-[10px]">{t.name}</p>
                    </div>
                    {t.price != null && t.price > 0 && (
                      <span className="ml-auto text-[#00ff88] text-xs">
                        ${t.price < 0.001 ? t.price.toExponential(2) : t.price.toFixed(4)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-stretch overflow-x-auto">
          {pair ? (
            <>
              <StatBox label="Price USD" value={pair.priceUsd ? `$${parseFloat(pair.priceUsd) < 0.001 ? parseFloat(pair.priceUsd).toExponential(3) : parseFloat(pair.priceUsd).toFixed(6)}` : "—"} />
              <StatBox label="Vol 24h" value={pair.volume24h ? `$${(pair.volume24h / 1000).toFixed(1)}K` : "—"} />
              <StatBox label="Buys" value={pair.buys24h?.toString() ?? "—"} color="text-[#00ff88]" />
              <StatBox label="Sells" value={pair.sells24h?.toString() ?? "—"} color="text-[#ff3366]" />
              <StatBox label="Liquidity" value={pair.liquidity ? `$${(pair.liquidity / 1000).toFixed(1)}K` : "—"} />
              <StatBox label="Mkt Cap" value={pair.marketCap ? `$${(pair.marketCap / 1000).toFixed(1)}K` : "—"} />
            </>
          ) : (
            <div className="flex items-center px-4 text-white/20 text-xs">
              {tradesLoading ? <Loader2 size={12} className="animate-spin" /> : "No pair data yet"}
            </div>
          )}
        </div>

        {/* External link */}
        {selected && (
          <div className="ml-auto flex items-center gap-2 px-3 shrink-0">
            <a href={`https://solscan.io/token/${selected.mint}`} target="_blank" rel="noreferrer"
              className="text-white/25 hover:text-white/70 transition-colors p-2">
              <ExternalLink size={13} />
            </a>
            <a href={`https://dexscreener.com/solana/${selected.mint}`} target="_blank" rel="noreferrer"
              className="text-white/25 hover:text-white/70 transition-colors text-[10px] px-2 py-1 rounded border border-white/10 hover:border-white/25">
              DexScreener
            </a>
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0">
        {/* Chart (left 60%) */}
        <div className="flex-1 min-w-0 border-r border-white/8">
          {selected ? (
            <TerminalChart key={selected.mint} mint={selected.mint} tf={tf} onTfChange={setTf} />
          ) : (
            <div className="flex items-center justify-center h-full text-white/20 font-mono">Select a token</div>
          )}
        </div>

        {/* Right panel (40%) */}
        <div className="w-[360px] xl:w-[420px] shrink-0 flex flex-col">
          {/* Trade panel top half */}
          <div className="flex-1 min-h-0 border-b border-white/8 overflow-y-auto p-3">
            {selected && <TradePanel mint={selected.mint} symbol={selected.symbol} />}
          </div>

          {/* Trade history bottom half */}
          <div className="h-[280px] shrink-0 overflow-hidden">
            <TradeHistory trades={trades} loading={tradesLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
