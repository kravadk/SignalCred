"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Users, Zap, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenAnalysis } from "@/lib/ai-types";

interface TradeSignalResult {
  signal: "BUY" | "SELL" | "HOLD" | "DEGEN";
  confidence: number;
  reasoning: string;
  bullish: string[];
  bearish: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  priceTarget: string;
}

const SIGNAL_CONFIG: Record<TradeSignalResult["signal"], { color: string; bg: string; border: string; glow: string }> = {
  BUY:   { color: "text-[#69d99a]", bg: "bg-[#26aa68]/20", border: "border-[#26aa68]/40", glow: "rgba(38,170,104,0.3)" },
  SELL:  { color: "text-[#ff624e]", bg: "bg-[#ff624e]/20", border: "border-[#ff624e]/40", glow: "rgba(255,98,78,0.3)" },
  HOLD:  { color: "text-[#ffb84d]", bg: "bg-[#ffb84d]/20", border: "border-[#ffb84d]/40", glow: "rgba(255,184,77,0.3)" },
  DEGEN: { color: "text-[#b48dff]", bg: "bg-[#7a55c6]/20", border: "border-[#7a55c6]/40", glow: "rgba(122,85,198,0.3)" },
};

const RISK_CONFIG: Record<TradeSignalResult["riskLevel"], { color: string; bg: string }> = {
  LOW:     { color: "text-[#69d99a]", bg: "bg-[#26aa68]/15" },
  MEDIUM:  { color: "text-[#ffb84d]", bg: "bg-[#ffb84d]/15" },
  HIGH:    { color: "text-[#ff624e]", bg: "bg-[#ff624e]/15" },
  EXTREME: { color: "text-[#ff6a84]", bg: "bg-[#ff6a84]/15" },
};

const SENTIMENT_CONFIG = {
  bullish: { icon: TrendingUp, color: "text-[#69d99a]", bg: "bg-[#26aa68]/15 border-[#26aa68]/30", label: "Bullish" },
  neutral: { icon: Minus, color: "text-white/60", bg: "bg-white/10 border-white/20", label: "Neutral" },
  bearish: { icon: TrendingDown, color: "text-[#ff624e]", bg: "bg-[#ff624e]/15 border-[#ff624e]/30", label: "Bearish" },
};

const HEALTH_CONFIG = {
  active: { color: "text-[#69d99a]", label: "🔥 Active Community" },
  growing: { color: "text-[#7a55c6]", label: "📈 Growing" },
  quiet: { color: "text-white/50", label: "😴 Quiet" },
  dead: { color: "text-[#ff624e]", label: "💀 Inactive" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#26aa68" : score >= 40 ? "#ff8b3f" : "#ff624e";

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-black leading-none tabular-nums text-white">{score}</span>
        <span className="text-white/40 text-xs font-fun">/100</span>
      </div>
    </div>
  );
}

export function TokenAnalysis({ mint }: { mint: string }) {
  const [analysis, setAnalysis] = useState<TokenAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeSignal, setTradeSignal] = useState<TradeSignalResult | null>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [streamedAnalysis, setStreamedAnalysis] = useState("");
  const [streaming, setStreaming] = useState(false);

  const fetchStreamingAnalysis = async () => {
    setStreaming(true);
    setStreamedAnalysis("");
    try {
      const res = await fetch("/api/ai/token-analysis/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint, symbol: "TKN", marketData: {} }),
      });
      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setStreamedAnalysis(prev => prev + decoder.decode(value));
      }
    } finally { setStreaming(false); }
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/token-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeSignal = async () => {
    setSignalLoading(true);
    setSignalError(null);
    try {
      const res = await fetch("/api/ai/trade-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTradeSignal(data.signal);
    } catch (e) {
      setSignalError(String(e));
    } finally {
      setSignalLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <div className="card p-5 text-center">
        <Sparkles size={24} className="text-[#7a55c6] mx-auto mb-3" />
        <h3 className="font-display text-xl text-white mb-1">AI Token Analysis</h3>
        <p className="text-white/40 text-xs font-fun mb-4">
          Claude analyses price, volume, holders, and community activity to give you a signal
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={analyze}
            className="btn-primary h-10 px-6 text-sm font-fun font-black flex items-center gap-2"
          >
            <Sparkles size={14} /> Analyze with Claude
          </button>
          <button
            onClick={fetchStreamingAnalysis}
            disabled={streaming}
            className="h-10 px-4 text-sm font-fun font-black flex items-center gap-2 rounded-xl bg-[#7a55c6]/20 text-[#b48dff] hover:bg-[#7a55c6]/30 transition-all disabled:opacity-50"
          >
            {streaming ? <Loader2 size={14} className="animate-spin" /> : <span>🌊</span>} Stream Analysis
          </button>
        </div>
        {error && <p className="text-[#ff6a84] text-xs font-fun mt-3">{error}</p>}
        {(streaming || streamedAnalysis) && (
          <div className="mt-4 card p-4 text-left bg-[#0d0d18]/60">
            <p className="text-white/40 text-[10px] font-fun uppercase tracking-wider mb-2">🌊 Streaming Analysis</p>
            <p className="text-white/80 text-xs font-body leading-relaxed whitespace-pre-wrap">
              {streamedAnalysis}
              {streaming && <span className="animate-pulse">|</span>}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-8 flex flex-col items-center gap-3">
        <Loader2 size={24} className="text-[#7a55c6] animate-spin" />
        <p className="text-white/50 font-fun text-sm">Claude is analyzing…</p>
      </div>
    );
  }

  if (!analysis) return null;

  const sentiment = SENTIMENT_CONFIG[analysis.sentiment];
  const SentimentIcon = sentiment.icon;
  const health = HEALTH_CONFIG[analysis.communityHealth];

  return (
    <div className={cn("card p-5 border animate-pop", sentiment.bg)}>
      <div className="flex items-start gap-4 mb-4">
        <ScoreRing score={analysis.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SentimentIcon size={16} className={sentiment.color} />
            <span className={cn("font-fun font-black text-sm", sentiment.color)}>{sentiment.label}</span>
            <span className={cn("text-xs font-fun ml-auto", health.color)}>{health.label}</span>
          </div>
          <p className="text-white/80 text-sm font-body leading-relaxed">{analysis.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {analysis.positiveSignals.length > 0 && (
          <div className="rounded-2xl bg-[#26aa68]/10 p-3">
            <p className="text-[#69d99a] text-xs font-fun font-black uppercase tracking-wider mb-2">Positive Signals</p>
            <ul className="space-y-1">
              {analysis.positiveSignals.map((s) => (
                <li key={s} className="flex items-start gap-1.5 text-xs font-fun text-white/70">
                  <CheckCircle2 size={11} className="text-[#69d99a] shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.redFlags.length > 0 && (
          <div className="rounded-2xl bg-[#ff624e]/10 p-3">
            <p className="text-[#ff624e] text-xs font-fun font-black uppercase tracking-wider mb-2">Red Flags</p>
            <ul className="space-y-1">
              {analysis.redFlags.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs font-fun text-white/70">
                  <AlertTriangle size={11} className="text-[#ff624e] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-white/60 text-xs font-fun italic">"{analysis.recommendation}"</p>
        <button
          onClick={analyze}
          className="text-white/30 hover:text-white/60 transition-colors text-xs font-fun flex items-center gap-1"
        >
          <Sparkles size={10} /> Refresh
        </button>
      </div>
      <p className="text-white/20 text-xs font-fun mt-2">Powered by Claude · Not financial advice</p>

      {/* Trade Signal section */}
      {!tradeSignal && !signalLoading && (
        <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between gap-3">
          <p className="text-white/40 text-xs font-fun">Want a trading signal?</p>
          <button
            onClick={fetchTradeSignal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-fun font-black text-white transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #7a55c6, #ff6a84)", boxShadow: "0 4px 12px rgba(122,85,198,0.35)" }}
          >
            <Zap size={11} /> Get Trade Signal
          </button>
          {signalError && <p className="text-[#ff6a84] text-xs font-fun">{signalError.slice(0, 60)}</p>}
        </div>
      )}

      {signalLoading && (
        <div className="mt-4 pt-4 border-t border-white/8 flex items-center gap-2 text-white/40">
          <Loader2 size={13} className="animate-spin" />
          <span className="text-xs font-fun">Generating trade signal…</span>
        </div>
      )}

      {tradeSignal && (() => {
        const sc = SIGNAL_CONFIG[tradeSignal.signal];
        const rc = RISK_CONFIG[tradeSignal.riskLevel];
        return (
          <div className={cn("mt-4 rounded-2xl p-4 border", sc.bg, sc.border)} style={{ boxShadow: `0 0 20px ${sc.glow}` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("px-3 py-1.5 rounded-xl font-fun font-black text-lg", sc.color)} style={{ background: "rgba(255,255,255,0.08)" }}>
                {tradeSignal.signal}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs font-fun">Confidence</span>
                  <span className={cn("font-fun font-black text-sm", sc.color)}>{tradeSignal.confidence}%</span>
                  <span className={cn("ml-auto px-2 py-0.5 rounded-lg text-xs font-fun font-bold", rc.color, rc.bg)}>
                    <ShieldAlert size={10} className="inline mr-1" />{tradeSignal.riskLevel} RISK
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mt-1.5">
                  <div className={cn("h-1.5 rounded-full", sc.bg)} style={{ width: `${tradeSignal.confidence}%`, background: sc.glow }} />
                </div>
              </div>
            </div>
            <p className="text-white/70 text-xs font-fun leading-relaxed mb-3">{tradeSignal.reasoning}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {tradeSignal.bullish.length > 0 && (
                <div className="rounded-xl bg-[#26aa68]/10 p-2.5">
                  <p className="text-[#69d99a] text-[10px] font-fun font-black uppercase tracking-wider mb-1.5">Bullish</p>
                  <ul className="space-y-1">
                    {tradeSignal.bullish.map((b, i) => (
                      <li key={i} className="flex items-start gap-1 text-[11px] font-fun text-white/60">
                        <CheckCircle2 size={9} className="text-[#69d99a] shrink-0 mt-0.5" />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tradeSignal.bearish.length > 0 && (
                <div className="rounded-xl bg-[#ff624e]/10 p-2.5">
                  <p className="text-[#ff624e] text-[10px] font-fun font-black uppercase tracking-wider mb-1.5">Bearish</p>
                  <ul className="space-y-1">
                    {tradeSignal.bearish.map((b, i) => (
                      <li key={i} className="flex items-start gap-1 text-[11px] font-fun text-white/60">
                        <AlertTriangle size={9} className="text-[#ff624e] shrink-0 mt-0.5" />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-white/40 text-[10px] font-fun">Target: {tradeSignal.priceTarget}</p>
              <button onClick={fetchTradeSignal} className="text-white/25 hover:text-white/50 text-[10px] font-fun flex items-center gap-1">
                <Zap size={9} /> Refresh signal
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
