"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Database, Loader2, Radio, ShieldCheck } from "lucide-react";

type StatusResponse = {
  generatedAt: string;
  bagsApi: { reachable: boolean; feedCount: number; migratedPoolCount: number };
  index: { indexedTokenCount: number; recentProofCount: number; recentRowsSampled: number };
  market: { source: string; sampled: number; marketCoverage: number };
  fees: { snapshotFreshness: string | null; snapshotAgeMinutes: number | null; latestSnapshotTokenCount: number };
  social: { socialProofEndpoint: string; campaigns: number; noFakeDataPolicy: boolean };
  trustLayerPolicies?: {
    noFakeData: boolean;
    tokenLinkedSocialOnly: boolean;
    walletSignatureAuth: boolean;
    serverOnlyKeys: boolean;
    rateLimits: boolean;
    offTrackRoutesExcludedFromPrimaryFlow: boolean;
    restreamWorkerReadiness: string;
  };
  restream: { status: string; endpoint: string; event: string; beta: boolean; note: string };
  restreamWorker?: { status: string; externalRuntime: string; envReady: boolean; nextStep: string };
  liveFeed?: {
    endpoint: string;
    sseEndpoint: string;
    mode: string;
    lastEventAt: string | null;
    lastEventAgeSeconds: number | null;
    recentLaunches: Array<{ mint: string; symbol: string; status: string }>;
  };
  trustSignals?: {
    endpoint: string;
    sseEndpoint: string;
    mode: string;
    noFakeData: boolean;
    coverage: { signals: number; verified: number; warming: number; risk: number; campaigns: number };
    recentSignals: Array<{ mint: string; label: string; status: string; category: string; href: string; passportHref: string }>;
  };
};

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4">
      <p className="text-[10px] font-fun font-black uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-2 truncate font-mono text-3xl font-black tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1 text-xs font-fun text-white/40">{sub}</p>}
    </div>
  );
}

export default function HackathonStatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hackathon/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="focus-shell">
      <Link href="/hackathon" className="btn-ghost mb-5 inline-flex min-h-[40px] items-center gap-2 px-4 text-sm">
        <ArrowLeft size={15} /> Hackathon
      </Link>

      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-fun font-black uppercase text-[#00ff88]">
          <ShieldCheck size={13} /> Judge debug
        </div>
        <h1 className="font-display text-5xl text-white">SignalCred Status</h1>
        <p className="mt-3 max-w-3xl text-sm font-fun leading-6 text-white/48">
          Live-data confidence page for judges: Bags API, trust signals, index coverage, market coverage, fee snapshots, social proof, campaigns, and ReStream readiness.
        </p>
        <Link href="/grant/status" className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-[#69d99a]/20 bg-[#69d99a]/10 px-4 text-sm font-fun font-black text-[#69d99a]">
          Open Grant Status <ArrowLeft size={15} className="rotate-180" />
        </Link>
      </div>

      {loading ? (
        <div className="card flex min-h-[220px] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white/35" />
        </div>
      ) : !data ? (
        <div className="card p-8 text-center text-sm font-fun text-white/40">Status unavailable.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Tile label="Bags API" value={data.bagsApi.reachable ? "Online" : "Delayed"} sub={`${data.bagsApi.feedCount} feed / ${data.bagsApi.migratedPoolCount} pools`} />
            <Tile label="Indexed tokens" value={data.index.indexedTokenCount} sub={`${data.index.recentProofCount}/${data.index.recentRowsSampled} recent proof sample`} />
            <Tile label="Market coverage" value={`${data.market.marketCoverage}/${data.market.sampled}`} sub={data.market.source} />
            <Tile label="Campaigns" value={data.social.campaigns} sub="USDT planned budgets" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Database size={16} className="text-[#00ff88]" />
                <h2 className="font-display text-2xl text-white">Fee Snapshots</h2>
              </div>
              <p className="text-sm font-fun text-white/55">{data.fees.snapshotFreshness ?? "No snapshot yet"}</p>
              <p className="mt-2 text-xs font-fun text-white/35">
                Age: {data.fees.snapshotAgeMinutes == null ? "pending" : `${data.fees.snapshotAgeMinutes} min`} / Tokens in latest hour: {data.fees.latestSnapshotTokenCount}
              </p>
            </section>

            <section className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity size={16} className="text-[#b48dff]" />
                <h2 className="font-display text-2xl text-white">Social Proof</h2>
              </div>
              <p className="text-sm font-fun text-white/55">{data.social.socialProofEndpoint}</p>
              <p className="mt-2 text-xs font-fun text-white/35">
                No fake data policy: {data.social.noFakeDataPolicy ? "enabled" : "unknown"}
              </p>
            </section>

            <section className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Radio size={16} className="text-[#ffcc7a]" />
                <h2 className="font-display text-2xl text-white">ReStream</h2>
              </div>
              <p className="text-sm font-fun text-white/55">{data.restream.status} / beta</p>
              <p className="mt-2 break-all text-xs font-mono text-white/35">{data.restream.event} @ {data.restream.endpoint}</p>
              <p className="mt-2 break-all text-xs font-mono text-[#69d99a]">{data.liveFeed?.sseEndpoint ?? "/api/bags/live?stream=1"}</p>
              <p className="mt-2 text-xs font-fun leading-5 text-white/35">
                Worker: {data.restreamWorker?.status ?? "planned"} / {data.restreamWorker?.externalRuntime ?? "external runtime"}
              </p>
              <p className="mt-1 text-xs font-fun leading-5 text-white/35">
                Last event age: {data.liveFeed?.lastEventAgeSeconds == null ? "unknown" : `${data.liveFeed.lastEventAgeSeconds}s`}
              </p>
              <p className="mt-2 text-xs font-fun leading-5 text-white/35">{data.restreamWorker?.nextStep ?? data.restream.note}</p>
            </section>
          </div>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-[#00ff88]" />
                <h2 className="font-display text-2xl text-white">Trust Signals Live</h2>
              </div>
              <Link href="/token" className="rounded-lg border border-[#00ff88]/15 bg-[#00ff88]/8 px-3 py-1.5 text-xs font-fun font-black text-[#69d99a]">
                Open Index
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <Tile label="Signals" value={data.trustSignals?.coverage.signals ?? 0} sub={data.trustSignals?.mode ?? "pending"} />
              <Tile label="Verified" value={data.trustSignals?.coverage.verified ?? 0} sub="proof confirmed" />
              <Tile label="Warming" value={data.trustSignals?.coverage.warming ?? 0} sub="baseline pending" />
              <Tile label="Risk" value={data.trustSignals?.coverage.risk ?? 0} sub="needs review" />
              <Tile label="Campaigns" value={data.trustSignals?.coverage.campaigns ?? 0} sub="USDT context" />
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(data.trustSignals?.recentSignals ?? []).slice(0, 4).map((signal) => (
                <Link key={`${signal.mint}:${signal.label}`} href={signal.passportHref} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 hover:border-white/16">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-fun font-black text-white">{signal.label}</p>
                    <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-fun text-white/38">{signal.status}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-mono text-white/30">{signal.category} / {signal.mint}</p>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs font-fun text-white/35">
              Endpoint: {data.trustSignals?.endpoint ?? "/api/trust-signals/live"} / SSE: {data.trustSignals?.sseEndpoint ?? "/api/trust-signals/live?stream=1"} / no fake data: {data.trustSignals?.noFakeData ? "enabled" : "pending"}
            </p>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#00ff88]" />
              <h2 className="font-display text-2xl text-white">Trust Layer Policies</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                ["No fake data", data.trustLayerPolicies?.noFakeData],
                ["Token-linked social only", data.trustLayerPolicies?.tokenLinkedSocialOnly],
                ["Wallet signature auth", data.trustLayerPolicies?.walletSignatureAuth],
                ["Server-only keys", data.trustLayerPolicies?.serverOnlyKeys],
                ["Rate limits", data.trustLayerPolicies?.rateLimits],
                ["Off-track routes excluded", data.trustLayerPolicies?.offTrackRoutesExcludedFromPrimaryFlow],
              ].map(([label, ok]) => (
                <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
                  <p className="text-xs font-fun font-black text-white">{String(label)}</p>
                  <p className="mt-1 text-[11px] font-fun text-[#69d99a]">{ok ? "enabled" : "pending"}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-fun text-white/35">
              ReStream worker readiness: {data.trustLayerPolicies?.restreamWorkerReadiness ?? "planned_external_worker"}
            </p>
          </section>

          <p className="text-xs font-fun text-white/28">Generated {data.generatedAt}</p>
        </div>
      )}
    </div>
  );
}
