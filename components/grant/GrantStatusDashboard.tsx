"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  DatabaseZap,
  ExternalLink,
  FileCheck2,
  Link2,
  Loader2,
  Radio,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { getQvacHealth, type QvacHealth } from "@/lib/qvac-client";

type GrantStatus = {
  generatedAt: string;
  bags: {
    indexedTokens: number;
    feedCount: number;
    poolCount: number;
    poolCoveragePercent: number;
    creatorProofCoveragePercent: number;
    source: string;
    freshness: string;
  };
  fees: {
    latestSnapshotAt: string | null;
    snapshotAgeMinutes: number | null;
    feeVelocityActiveCount: number;
    baselineWarmingCount: number;
    source: string;
    freshness: string;
  };
  live: {
    restreamConfigured: boolean;
    restreamConnected: boolean;
    restreamStatus: string;
    lastEventAt: string | null;
    lastEventAgeSeconds: number | null;
    persistedLiveLaunches: number;
    websocket: string;
    event: string;
    source: string;
  };
  social: {
    tokenLinkedPosts: number;
    officialUpdates: number;
    socialProofTokens: number;
    source: string;
    freshness: string;
  };
  campaigns: {
    planned: number;
    funded: number;
    plannedBudgetUsdt: number;
    fundedBudgetUsdt: number;
    source: string;
    noAutomaticPayouts: boolean;
  };
  publicApi: {
    tokenTrustEndpoint: "available" | "unavailable";
    creatorTrustEndpoint: "available" | "unavailable";
    embedEndpoint: "available" | "unavailable";
    tokenTrustHref: string;
    creatorTrustHref: string;
    embedHref: string;
    cacheSeconds: number;
    readOnly: boolean;
  };
  qvac: {
    enabled: boolean;
    serviceStatus: string;
    publicGateway: string;
    privateReview: boolean;
    cloudFallback: boolean;
    runtime: string;
    capabilities: string[];
    productSurfaces: string[];
    privacyPolicy: string;
    source: string;
  };
  builderResources: {
    source: string;
    categories: Array<{
      category: string;
      thesis: string;
      status: string;
      items: string[];
      resources: Array<{
        label: string;
        href: string;
        fit: string;
        signalCredUse: string;
        status: string;
      }>;
    }>;
    comparison: Array<{
      takeaway: string;
      why: string;
      action: string;
    }>;
  };
  passports: {
    availableCount: number;
    endpoint: string;
    generatedOnDemand: boolean;
    source: string;
  };
  policies: {
    noFakeData: true;
    serverOnlyKeys: true;
    signatureAuthForWrites: true;
    rateLimits: true;
    tokenLinkedSocialOnly: true;
    publicApiReadOnly: true;
  };
  links: Record<string, string>;
  noFakeData: true;
};

function formatUsd(value: number) {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

function statusTone(ok: boolean) {
  return ok ? "border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00ff88]" : "border-[#ffb84d]/20 bg-[#ffb84d]/10 text-[#ffcc7a]";
}

function MetricTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: "default" | "green" | "amber" | "blue";
}) {
  const toneClass = tone === "green"
    ? "from-[#00ff88]/14 to-transparent"
    : tone === "amber"
      ? "from-[#ffb84d]/14 to-transparent"
      : tone === "blue"
        ? "from-[#5bc4ff]/14 to-transparent"
        : "from-white/[0.07] to-transparent";

  return (
    <div className={`rounded-lg border border-white/8 bg-gradient-to-br ${toneClass} bg-[#11101b]/88 p-3`}>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-white/35">{label}</p>
      <p className="mt-1 truncate font-mono text-lg font-black leading-none text-white">{value}</p>
      <p className="mt-1 min-h-[28px] text-[11px] font-body leading-4 text-white/42">{sub}</p>
    </div>
  );
}

function PolicyPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-md border px-2 text-[11px] font-mono font-bold ${statusTone(ok)}`}>
      <ShieldCheck size={13} />
      {label}
    </div>
  );
}

function SourceLine({ source, freshness }: { source: string; freshness: string }) {
  return (
    <div className="mt-3 rounded-lg border border-white/8 bg-black/18 px-3 py-2">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-white/28">Source / freshness</p>
      <p className="mt-1 text-xs font-body leading-5 text-white/45">{source} / {freshness}</p>
    </div>
  );
}

export function GrantStatusDashboard() {
  const [data, setData] = useState<GrantStatus | null>(null);
  const [qvacHealth, setQvacHealth] = useState<QvacHealth | null>(null);
  const [lastQvacAnalysis, setLastQvacAnalysis] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/grant/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setData(body))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getQvacHealth(controller.signal).then(setQvacHealth);
    try {
      const raw = window.localStorage.getItem("signalcred.qvac.lastAnalysis");
      setLastQvacAnalysis(raw ? JSON.parse(raw) : null);
    } catch {
      setLastQvacAnalysis(null);
    }
    return () => controller.abort();
  }, []);

  const readiness = useMemo(() => {
    if (!data) return 0;
    const checks = [
      data.noFakeData,
      data.policies.serverOnlyKeys,
      data.policies.signatureAuthForWrites,
      data.policies.rateLimits,
      data.publicApi.readOnly,
      data.bags.indexedTokens > 0,
      data.passports.availableCount > 0,
      data.social.socialProofTokens >= 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [data]);

  return (
    <main className="focus-shell text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0f1118]/95 px-3 py-2">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-md border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.1em] text-[#00ff88]">
            <BadgeCheck size={14} />
            Grant operations dashboard
          </div>
          <h1 className="font-mono text-lg font-black leading-tight md:text-xl">SignalCred Grant Status</h1>
          <p className="mt-1 max-w-3xl text-xs font-body leading-5 text-white/52">
            One screen for reviewers: Bags coverage, trust passports, fee snapshots, social proof, USDT campaigns, public API readiness, and no-fake-data policy.
          </p>
        </div>
        <Link href="/docs" className="inline-flex min-h-[34px] items-center gap-2 rounded-md border border-white/10 bg-white/8 px-3 text-xs font-mono font-bold text-white/70 hover:text-white">
          Docs <ArrowRight size={15} />
        </Link>
      </div>

      {loading ? (
        <div className="card flex min-h-[320px] items-center justify-center">
          <Loader2 size={30} className="animate-spin text-white/35" />
        </div>
      ) : !data ? (
        <div className="card p-8 text-center text-sm font-fun text-white/42">Grant status unavailable.</div>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-[#00ff88]/14 bg-[radial-gradient(circle_at_15%_0%,rgba(0,255,136,0.10),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[#69d99a]">Operational readiness</p>
                  <p className="mt-1 font-mono text-4xl font-black leading-none text-white">{readiness}%</p>
                  <p className="mt-2 max-w-xl text-xs font-body leading-5 text-white/50">
                    This score is computed from real operational checks: no-fake-data policy, server-only keys, signature writes, rate limits, public API readiness, indexed tokens, and passport availability.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PolicyPill label="no fake data" ok={data.policies.noFakeData} />
                  <PolicyPill label="server-only keys" ok={data.policies.serverOnlyKeys} />
                  <PolicyPill label="signed writes" ok={data.policies.signatureAuthForWrites} />
                  <PolicyPill label="rate limits" ok={data.policies.rateLimits} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Trust passports" value={data.passports.availableCount} sub={`${data.passports.endpoint} / generated on demand`} tone="green" />
              <MetricTile label="Public API" value={data.publicApi.tokenTrustEndpoint} sub={`${data.publicApi.cacheSeconds}s cache / read-only`} tone="blue" />
              <MetricTile label="ReStream" value={data.live.restreamConfigured ? "configured" : "fallback"} sub={`${data.live.event} / ${data.live.persistedLiveLaunches} persisted`} tone="amber" />
              <MetricTile label="No fake data" value={data.noFakeData ? "enabled" : "pending"} sub="missing data becomes pending/unavailable" tone="green" />
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Indexed Bags tokens" value={data.bags.indexedTokens} sub={`${data.bags.feedCount} feed rows / ${data.bags.poolCount} pools`} tone="green" />
            <MetricTile label="Pool coverage" value={`${data.bags.poolCoveragePercent}%`} sub={`${data.bags.creatorProofCoveragePercent}% creator proof coverage`} />
            <MetricTile label="Fee velocity active" value={data.fees.feeVelocityActiveCount} sub={`${data.fees.baselineWarmingCount} baselines warming`} tone="amber" />
            <MetricTile label="Token social proof" value={data.social.socialProofTokens} sub={`${data.social.tokenLinkedPosts} token-linked posts`} tone="blue" />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <DatabaseZap size={17} className="text-[#00ff88]" />
                <h2 className="font-display text-2xl text-white">Bags Coverage</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Indexed" value={data.bags.indexedTokens} sub="DB token rows" />
                <MetricTile label="Pools" value={data.bags.poolCount} sub="Bags migrated pools" />
              </div>
              <SourceLine source={data.bags.source} freshness={data.bags.freshness} />
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity size={17} className="text-[#ffcc7a]" />
                <h2 className="font-display text-2xl text-white">Fee Freshness</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Snapshot age" value={data.fees.snapshotAgeMinutes == null ? "pending" : `${data.fees.snapshotAgeMinutes}m`} sub={data.fees.latestSnapshotAt ?? "No snapshot yet"} />
                <MetricTile label="Warming" value={data.fees.baselineWarmingCount} sub="needs 24h baseline" />
              </div>
              <SourceLine source={data.fees.source} freshness={data.fees.freshness} />
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <WalletCards size={17} className="text-[#b48dff]" />
                <h2 className="font-display text-2xl text-white">USDT Campaigns</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Planned" value={data.campaigns.planned} sub={formatUsd(data.campaigns.plannedBudgetUsdt)} />
                <MetricTile label="Funded proof" value={data.campaigns.funded} sub={formatUsd(data.campaigns.fundedBudgetUsdt)} />
              </div>
              <SourceLine source={data.campaigns.source} freshness={data.campaigns.noAutomaticPayouts ? "proof only / no automatic payouts" : "unknown"} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Radio size={17} className="text-[#ffcc7a]" />
                <h2 className="font-display text-2xl text-white">Live Layer</h2>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <MetricTile label="Worker state" value={data.live.restreamStatus} sub={data.live.restreamConfigured ? "RESTREAM_INGEST_URL configured" : "polling/SSE fallback"} tone="amber" />
                <MetricTile label="Last event age" value={data.live.lastEventAgeSeconds == null ? "unknown" : `${data.live.lastEventAgeSeconds}s`} sub={data.live.lastEventAt ?? "No feed event timestamp"} />
              </div>
              <p className="mt-3 break-all rounded-2xl border border-white/8 bg-black/18 px-3 py-2 font-mono text-[11px] leading-5 text-white/38">
                {data.live.websocket} / {data.live.event}
              </p>
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Link2 size={17} className="text-[#69d99a]" />
                <h2 className="font-display text-2xl text-white">Public Trust API</h2>
              </div>
              <div className="grid gap-2">
                {[
                  ["Token trust", data.publicApi.tokenTrustHref, data.publicApi.tokenTrustEndpoint],
                  ["Creator trust", data.publicApi.creatorTrustHref, data.publicApi.creatorTrustEndpoint],
                  ["Embed", data.publicApi.embedHref, data.publicApi.embedEndpoint],
                ].map(([label, href, status]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-fun font-black text-white">{label}</p>
                      <p className="truncate font-mono text-[11px] text-white/35">{href}</p>
                    </div>
                    <span className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-[10px] font-fun font-black text-[#00ff88]">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#62d9ff]/20 bg-[#62d9ff]/10 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-[#8fd8ff]">
                  <BrainCircuit size={13} />
                  Tether QVAC track
                </div>
                <h2 className="font-display text-2xl text-white">QVAC Trust Review</h2>
                <p className="mt-1 max-w-3xl text-xs font-body leading-5 text-white/45">
                  SignalCred uses QVAC to explain passport evidence, risk labels, fee loops, creator graphs, and social proof through a private review gateway. QVAC explains evidence; it never creates proof or signs transactions.
                </p>
              </div>
              <span className={`rounded-lg border px-3 py-2 font-mono text-[10px] font-bold uppercase ${qvacHealth?.ready ? "border-[#00ff88]/18 bg-[#00ff88]/10 text-[#69d99a]" : "border-[#ffb84d]/18 bg-[#ffb84d]/10 text-[#ffcc7a]"}`}>
                {qvacHealth?.ready ? `${qvacHealth.mode} ready` : "QVAC unavailable"}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="QVAC config" value={data.qvac.enabled ? "enabled" : "optional"} sub={data.qvac.publicGateway} tone="blue" />
              <MetricTile label="Review service" value={qvacHealth?.ready ? "ready" : data.qvac.serviceStatus} sub={qvacHealth?.device ?? data.qvac.runtime} tone={qvacHealth?.ready ? "green" : "amber"} />
              <MetricTile label="Cloud fallback" value={data.qvac.cloudFallback ? "enabled" : "disabled"} sub={data.qvac.privateReview ? "private evidence review" : "review config"} tone="green" />
              <MetricTile label="Capabilities" value={data.qvac.capabilities.length} sub={data.qvac.capabilities.slice(0, 2).join(" / ")} tone="blue" />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-white/8 bg-black/18 p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-white/30">Product surfaces</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.qvac.productSurfaces.map((surface) => (
                    <span key={surface} className="rounded-md border border-[#62d9ff]/12 bg-[#62d9ff]/8 px-2 py-1 font-mono text-[10px] text-[#8fd8ff]">
                      {surface}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-[#00ff88]/10 bg-[#00ff88]/[0.035] p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[#69d99a]">Privacy policy</p>
                <p className="mt-2 text-xs font-body leading-5 text-white/46">{data.qvac.privacyPolicy}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/8 bg-black/18 p-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-white/30">Last QVAC analysis</p>
              {lastQvacAnalysis ? (
                <div className="mt-2 grid gap-2 md:grid-cols-[180px_1fr]">
                  <p className="font-mono text-xs text-[#8fd8ff]">{String(lastQvacAnalysis.at ?? "unknown")}</p>
                  <p className="text-xs font-body leading-5 text-white/50">{String(lastQvacAnalysis.summary ?? "QVAC review completed.")}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs font-body leading-5 text-white/38">
                  No QVAC review generated in this browser yet. Open a passport and run QVAC Trust Review to populate this field.
                </p>
              )}
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#5bc4ff]/20 bg-[#5bc4ff]/10 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-[#8fd8ff]">
                  <DatabaseZap size={13} />
                  Builder readiness
                </div>
                <h2 className="font-display text-2xl text-white">Dev3pack Resource Fit</h2>
                <p className="mt-1 max-w-3xl text-xs font-body leading-5 text-white/45">
                  SignalCred maps the resource-page logic into the product: vibe-coded Solana flow, clear product thesis, developer stack, and bounded AI/agent usage.
                </p>
              </div>
              <span className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2 font-mono text-[10px] text-white/35">
                {data.builderResources.source}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.builderResources.categories.map((group) => (
                <div key={group.category} className="rounded-xl border border-white/8 bg-black/18 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-mono font-black text-white">{group.category}</p>
                    <span className="rounded-md border border-[#00ff88]/18 bg-[#00ff88]/8 px-2 py-1 text-[10px] font-mono font-bold text-[#69d99a]">
                      {group.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item} className="flex gap-2 text-[11px] font-body leading-4 text-white/48">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5bc4ff]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {group.resources.slice(0, 3).map((resource) => (
                      <a
                        key={resource.href}
                        href={resource.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-white/[0.03] px-2 py-1.5 text-[10px] font-mono text-white/40 hover:border-[#69d99a]/20 hover:text-[#69d99a]"
                      >
                        <span className="truncate">{resource.label}</span>
                        <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {data.builderResources.comparison.map((row) => (
                <div key={row.takeaway} className="rounded-xl border border-[#69d99a]/10 bg-[#69d99a]/[0.04] p-3">
                  <p className="text-xs font-mono font-black text-white">{row.takeaway}</p>
                  <p className="mt-1 text-[11px] font-body leading-4 text-white/42">{row.why}</p>
                  <p className="mt-2 text-[11px] font-body font-bold leading-4 text-[#69d99a]/70">{row.action}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileCheck2 size={17} className="text-[#69d99a]" />
              <h2 className="font-display text-2xl text-white">Reviewer Shortcuts</h2>
            </div>
            <div className="grid gap-2 md:grid-cols-5">
              {[
                ["Token Index", "/token"],
                ["Fees", "/fees"],
                ["Square", "/square"],
                ["Docs", "/docs"],
                ["Passport pattern", "/passport/[mint]"],
              ].map(([label, href]) => (
                <Link key={label} href={href === "/passport/[mint]" ? "/token" : href} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm font-fun font-black text-white/62 hover:border-white/16 hover:text-white">
                  {label}
                  <span className="mt-1 block truncate font-mono text-[10px] font-normal text-white/28">{href}</span>
                </Link>
              ))}
            </div>
          </section>

          <p className="text-xs font-fun text-white/28">Generated {data.generatedAt}</p>
        </div>
      )}
    </main>
  );
}
