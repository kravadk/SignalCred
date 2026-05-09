"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TF = "15m" | "1H" | "1D";

interface Bar {
  unixTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function PriceChart({ mint }: { mint: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<TF>("1H");
  const [loading, setLoading] = useState(true);
  const [bars, setBars] = useState<Bar[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/tokens/${mint}/chart?tf=${tf}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setBars(Array.isArray(d.bars) ? d.bars : []))
      .catch((err) => {
        if (err?.name !== "AbortError") setBars([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mint, tf]);

  useEffect(() => {
    if (!bars.length || !containerRef.current) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    import("lightweight-charts").then((lc) => {
      if (cancelled) return;
      const el = containerRef.current;
      if (!el) return;
      el.innerHTML = "";

      const chart = lc.createChart(el, {
        width: el.clientWidth,
        height: 280,
        layout: { background: { type: lc.ColorType.Solid, color: "transparent" }, textColor: "rgba(255,255,255,0.5)" },
        grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
        crosshair: { mode: 1 },
        timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      });

      const series = chart.addCandlestickSeries({
        upColor: "#26aa68",
        downColor: "#ff624e",
        borderUpColor: "#26aa68",
        borderDownColor: "#ff624e",
        wickUpColor: "#69d99a",
        wickDownColor: "#ff6a84",
      });

      series.setData(
        bars.map((bar) => ({
          time: bar.unixTime as unknown as import("lightweight-charts").Time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }))
      );

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el.clientWidth > 0) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);

      cleanup = () => {
        ro.disconnect();
        chart.remove();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [bars]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-white">Price Chart</h3>
        <div className="flex gap-1 p-1 rounded-xl bg-white/8">
          {(["15m", "1H", "1D"] as TF[]).map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-body font-black transition-all",
                tf === t ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center text-white/30">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : bars.length === 0 ? (
        <div className="h-[280px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffb84d]/20 bg-[#ffb84d]/10 text-[#ffb84d]">
            <BarChart3 size={22} />
          </div>
          <p className="mb-1 text-base font-body font-black text-white">No DEX chart yet</p>
          <p className="max-w-sm text-sm font-body font-semibold leading-6 text-white/48">
            No verified OHLC candles are available for this token yet. Bags bonding tokens can trade before a public DEX pair has chart history.
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-[#ffb84d] animate-pulse" />
            <span className="text-xs font-body font-semibold text-[#ffcc7a]">Waiting for verified market candles</span>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full" />
      )}
    </div>
  );
}
