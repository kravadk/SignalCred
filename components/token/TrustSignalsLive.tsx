"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, ExternalLink, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { normalizeImageUrl, proxiedImageUrl } from "@/lib/image-url";

type TrustSignalStatus = "verified" | "warming" | "pending" | "risk";

type TrustSignal = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  imageUrl?: string | null;
  category: string;
  status: TrustSignalStatus;
  label: string;
  description: string;
  source: string;
  href: string;
  passportHref: string;
  externalHref?: string | null;
  timestamp: string;
};

type TrustSignalSnapshot = {
  title: string;
  positioning: string;
  signals: TrustSignal[];
  coverage: { signals: number; verified: number; warming: number; risk: number; campaigns: number };
  restream: { status: string; sseFallback?: string; note: string };
  noFakeData: true;
  generatedAt: string;
};

const STATUS_STYLE: Record<TrustSignalStatus, { text: string; bg: string; border: string; icon: "check" | "warn" | "spark" }> = {
  verified: { text: "text-[#00ff88]", bg: "bg-[#00ff88]/10", border: "border-[#00ff88]/20", icon: "check" },
  warming: { text: "text-[#ffcc7a]", bg: "bg-[#ffb84d]/10", border: "border-[#ffb84d]/20", icon: "spark" },
  pending: { text: "text-white/48", bg: "bg-white/6", border: "border-white/10", icon: "spark" },
  risk: { text: "text-[#ff8a78]", bg: "bg-[#ff624e]/10", border: "border-[#ff624e]/20", icon: "warn" },
};

function shortMint(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function statusIcon(status: TrustSignalStatus) {
  const style = STATUS_STYLE[status];
  if (style.icon === "warn") return <AlertTriangle size={13} />;
  if (style.icon === "check") return <ShieldCheck size={13} />;
  return <Sparkles size={13} />;
}

function statusPriority(status: TrustSignalStatus) {
  if (status === "risk") return 4;
  if (status === "verified") return 3;
  if (status === "warming") return 2;
  return 1;
}

function groupSignalsByToken(signals: TrustSignal[]) {
  const groups = new Map<string, TrustSignal & { signals: TrustSignal[] }>();

  for (const signal of signals) {
    const existing = groups.get(signal.mint);
    if (!existing) {
      groups.set(signal.mint, { ...signal, signals: [signal] });
      continue;
    }

    existing.signals.push(signal);
    if (statusPriority(signal.status) > statusPriority(existing.status)) {
      groups.set(signal.mint, { ...signal, signals: existing.signals });
    }
  }

  return Array.from(groups.values());
}

function SignalImage({ signal }: { signal: TrustSignal }) {
  const [mode, setMode] = useState<"direct" | "proxy" | "failed">("direct");
  const directSrc = normalizeImageUrl(signal.imageUrl);
  const proxySrc = proxiedImageUrl(signal.imageUrl);
  const imageSrc = mode === "direct" ? directSrc : mode === "proxy" ? proxySrc : null;

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-[#26aa68] via-[#7a55c6] to-[#ff624e] text-xs font-mono font-black text-white">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setMode(mode === "direct" && proxySrc && proxySrc !== directSrc ? "proxy" : "failed")}
        />
      ) : (
        signal.symbol.slice(0, 1)
      )}
    </div>
  );
}

export function TrustSignalsLive() {
  const [snapshot, setSnapshot] = useState<TrustSignalSnapshot | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "fallback" | "delayed">("connecting");

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    const loadSnapshot = async () => {
      try {
        const res = await fetch("/api/trust-signals/live?limit=10", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setSnapshot(json);
          setStatus("fallback");
        }
      } catch {
        if (!cancelled) setStatus("delayed");
      }
    };

    try {
      source = new EventSource("/api/trust-signals/live?stream=1&limit=10");
      source.addEventListener("trust-signals-live", (event) => {
        if (cancelled) return;
        setSnapshot(JSON.parse((event as MessageEvent).data));
        setStatus("live");
      });
      source.addEventListener("trust-signals-error", () => {
        if (!cancelled) setStatus("delayed");
      });
      source.onerror = () => {
        source?.close();
        loadSnapshot();
      };
    } catch {
      loadSnapshot();
    }

    return () => {
      cancelled = true;
      source?.close();
    };
  }, []);

  const signals = snapshot?.signals ?? [];
  const visibleSignals = useMemo(() => groupSignalsByToken(signals).slice(0, 10), [signals]);

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#2c7257]/40 bg-[#08131b]/92 shadow-[0_18px_56px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(105,217,154,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/42 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-[#00ff88]/24 via-transparent to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2c7257]/22 bg-black/12 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
            status === "live" ? "border-[#00ff88]/25 bg-[#00ff88]/10 text-[#00ff88]" : "border-[#ffb84d]/25 bg-[#ffb84d]/10 text-[#ffcc7a]"
          }`}>
            {status === "delayed" ? <AlertTriangle size={15} /> : <Radio size={15} />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-body font-black text-white">Trust Signals Live</p>
            <p className="text-xs font-semibold leading-5 text-white/52">
              Verified Bags changes across launches, pools, fees, campaigns, and creator proof.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-body font-black">
          <span className="rounded-md border border-[#00ff88]/15 bg-[#00ff88]/8 px-2 py-1 text-[#69d99a]">
            {snapshot?.coverage.verified ?? "-"} verified
          </span>
          <span className="rounded-md border border-[#ffb84d]/15 bg-[#ffb84d]/8 px-2 py-1 text-[#ffcc7a]">
            {snapshot?.coverage.warming ?? "-"} warming
          </span>
          <span className="rounded-md border border-[#ff624e]/15 bg-[#ff624e]/8 px-2 py-1 text-[#ff8a78]">
            {snapshot?.coverage.risk ?? "-"} risk
          </span>
          <Link href="/hackathon/status" className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-white/56 hover:text-white">
            Data Status
          </Link>
        </div>
      </div>

      {visibleSignals.length === 0 ? (
        <div className="px-3 py-3 text-sm font-body text-white/38">
          {status === "delayed" ? "Trust signals delayed. Check judge status for data-source health." : "Collecting live proof signals..."}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-3 py-3">
          {visibleSignals.map((signal) => {
            const style = STATUS_STYLE[signal.status] ?? STATUS_STYLE.pending;
            const labels = Array.from(new Map(signal.signals.map((item) => [item.label, item])).values()).slice(0, 3);
            const hiddenCount = Math.max(signal.signals.length - labels.length, 0);
            return (
              <div key={signal.mint} className="flex min-w-[420px] items-center gap-3 rounded-xl border border-[#314066]/50 bg-[#0a0d19]/82 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-[#00ff88]/22 hover:bg-white/[0.045]">
                <SignalImage signal={signal} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Link
                      href={signal.href}
                      className="truncate text-sm font-body font-black text-white transition-colors hover:text-[#69d99a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#69d99a]/60"
                      title={`Open ${signal.name || signal.symbol}`}
                    >
                      {signal.name || signal.symbol}
                    </Link>
                    <span className="shrink-0 text-[11px] font-mono text-white/28">/ {shortMint(signal.mint)}</span>
                  </div>
                  <div className="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
                    {labels.map((item) => {
                      const itemStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
                      return (
                        <span key={`${item.category}:${item.label}`} className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-body font-black uppercase ${itemStyle.bg} ${itemStyle.border} ${itemStyle.text}`}>
                          {statusIcon(item.status)}
                          {item.label}
                        </span>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <span className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-body font-black ${style.bg} ${style.border} ${style.text}`}>
                        +{hiddenCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={signal.href} className="rounded-md border border-white/8 px-2 py-1 text-[10px] font-body font-bold text-white/42 hover:text-white">
                    Token
                  </Link>
                  <Link href={signal.passportHref} className="rounded-md border border-[#00ff88]/15 bg-[#00ff88]/8 px-2 py-1 text-[10px] font-body font-bold text-[#69d99a]">
                    Proof
                  </Link>
                  {signal.externalHref?.startsWith("https://") && (
                    <a href={signal.externalHref} target="_blank" rel="noreferrer" className="rounded-md border border-white/8 px-2 py-1 text-white/35 hover:text-white">
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="border-t border-[#2c7257]/18 bg-black/10 px-3 py-1.5 text-[11px] font-body text-white/30">
        No fake data. Missing proof stays warming or risk until Bags, fee snapshots, Square, or campaign records confirm it.
      </p>
    </section>
  );
}
