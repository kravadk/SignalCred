"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ExternalLink, Radio } from "lucide-react";

type LiveLaunch = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  status: string;
  poolVerified: boolean;
  bagsTokenUrl?: string | null;
};

type LiveSnapshot = {
  launches: LiveLaunch[];
  count: number;
  feedCount: number;
  poolCount: number;
  generatedAt: string;
  restream: { status: string; sseFallback?: string; note: string };
};

function shortMint(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function LiveBagsFeed() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "fallback" | "delayed">("connecting");

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    const loadSnapshot = async () => {
      try {
        const res = await fetch("/api/bags/live?limit=8", { cache: "no-store" });
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
      source = new EventSource("/api/bags/live?stream=1&limit=8");
      source.addEventListener("bags-live", (event) => {
        if (cancelled) return;
        setSnapshot(JSON.parse((event as MessageEvent).data));
        setStatus("live");
      });
      source.addEventListener("bags-live-error", () => {
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

  const launches = snapshot?.launches ?? [];

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#101018]/65 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${
            status === "live" ? "border-[#00ff88]/25 bg-[#00ff88]/10 text-[#00ff88]" : "border-[#ffb84d]/25 bg-[#ffb84d]/10 text-[#ffcc7a]"
          }`}>
            {status === "delayed" ? <AlertTriangle size={15} /> : <Radio size={15} />}
          </span>
          <div>
            <p className="text-sm font-fun font-black text-white">Live Bags launches</p>
            <p className="text-xs font-fun text-white/38">
              {status === "live" ? "SSE polling fallback connected" : status === "delayed" ? "Live feed delayed - using cache when available" : "Connecting to Bags feed"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-fun">
          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/42">
            Feed {snapshot?.feedCount ?? "-"}
          </span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/42">
            Pools {snapshot?.poolCount ?? "-"}
          </span>
          <Link href="/hackathon/status" className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/10 px-2.5 py-1 text-[#00ff88]">
            Status
          </Link>
        </div>
      </div>

      {launches.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
          {launches.slice(0, 6).map((launch) => (
          <Link
            key={launch.mint}
            href={`/token/${launch.mint}`}
            className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 transition-colors hover:border-white/18 hover:bg-white/[0.065]"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#26aa68] to-[#7a55c6] text-xs font-display text-white">
                {launch.imageUrl ? <img src={launch.imageUrl} alt="" className="h-full w-full object-cover" /> : launch.symbol.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-fun font-black text-white">{launch.symbol}</p>
                <p className="truncate text-[11px] font-mono text-white/35">{shortMint(launch.mint)}</p>
              </div>
              <ExternalLink size={12} className="text-white/25" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="rounded-md border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-0.5 text-[10px] font-fun font-black uppercase text-[#00ff88]">
                new
              </span>
              <span className="flex items-center gap-1 text-[10px] font-fun text-white/35">
                <Activity size={11} />
                {launch.poolVerified ? "pool" : launch.status}
              </span>
            </div>
          </Link>
          ))}
        </div>
      )}
    </div>
  );
}
