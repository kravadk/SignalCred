"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  DatabaseZap,
  ExternalLink,
  FileCheck2,
  GitBranch,
  Link2,
  LockKeyhole,
  Megaphone,
  Radio,
  Rocket,
  ScanLine,
  ShieldCheck,
  Sparkles,
  SquareActivity,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { HeroTrustScene } from "./HeroTrustScene";

const sources = [
  ["Bags API", "source"],
  ["Solscan", "receipts"],
  ["DexScreener", "market"],
  ["Meteora", "pool"],
  ["USDT", "stable value"],
  ["Snapshots", "fee velocity"],
] as const;

const particles = ["BAGS", "SOLSCAN", "USDT", "CLAIM", "POOL", "CREATOR", "FEES", "SOCIAL", "8zAe...BAGS", "proof://mint"];

const proofNodes = [
  ["Bags", "source verified"],
  ["Pool", "Meteora linked"],
  ["Creator", "admin matched"],
  ["Fees", "lifetime indexed"],
  ["Claims", "receipt-ready"],
  ["Social", "token-linked"],
  ["USDT", "campaign proof"],
] as const;

const terminalRows = [
  ["source", "Bags feed verified", "ok"],
  ["creator", "admin wallet matched", "ok"],
  ["fee loop", "24h baseline warming", "warm"],
  ["risk", "no critical flags", "ok"],
  ["passport", "shareable proof page ready", "ok"],
] as const;

const beforeRows = [
  ["Creator", "unknown wallet", AlertTriangle],
  ["Fees", "no claim evidence", AlertTriangle],
  ["Social", "generic hype", AlertTriangle],
  ["Links", "scattered explorers", AlertTriangle],
] as const;

const afterRows = [
  ["Creator", "Bags admin proof", CheckCircle2],
  ["Fees", "fee loop evidence", CheckCircle2],
  ["Social", "token-linked proof", CheckCircle2],
  ["Links", "passport + explorers", CheckCircle2],
] as const;

const pipeline = [
  ["01", "Launch detected", "New Bags mint enters the trust stream.", Rocket],
  ["02", "Bags source verified", "Launch source and mint evidence attach to the profile.", BadgeCheck],
  ["03", "Pool + market linked", "DEX, pool, liquidity, and explorer links become inspectable.", Link2],
  ["04", "Fee loop indexed", "Lifetime fees, 24h baseline, claims, and receipts are tracked.", CircleDollarSign],
  ["05", "Social proof attached", "Official updates, campaigns, milestones, and posts stay token-linked.", Megaphone],
  ["06", "USDT proof ready", "Creator economics become stable, explainable, and campaign-ready.", WalletCards],
] as const;

const demos = {
  "Scan Token": {
    title: "Scanner turns a mint into a proof map.",
    accent: "#31d99b",
    rows: [
      ["mint", "8zAe...BAGS"],
      ["source", "Bags launch feed"],
      ["pool", "Meteora pair linked"],
      ["market", "DexScreener attached"],
      ["result", "passport ready"],
    ],
  },
  Passport: {
    title: "A shareable page for every Bags token.",
    accent: "#55d6ff",
    rows: [
      ["score", "74 / 100"],
      ["proof", "4 / 4 verified"],
      ["risk", "1 review"],
      ["explorers", "Bags + Solscan + DEX"],
      ["embed", "public trust widget"],
    ],
  },
  "Creator Graph": {
    title: "Creator history becomes visible.",
    accent: "#a78bfa",
    rows: [
      ["creator", "wallet reliability"],
      ["tokens", "known launch graph"],
      ["fees", "total generated"],
      ["claims", "receipt timeline"],
      ["patterns", "risk labels"],
    ],
  },
  "Fee Loop": {
    title: "Generated fees become evidence.",
    accent: "#ffcf7a",
    rows: [
      ["lifetime", "indexed from Bags"],
      ["24h", "snapshot baseline"],
      ["claim", "Solscan receipt"],
      ["campaign", "USDT funding proof"],
      ["policy", "no fake amounts"],
    ],
  },
  "Social Proof": {
    title: "Square becomes token validation.",
    accent: "#ff5c7a",
    rows: [
      ["official", "creator-signed update"],
      ["community", "token-linked posts"],
      ["milestones", "proof timeline"],
      ["spam", "penalized in score"],
      ["ranking", "proof-ranked feed"],
    ],
  },
} as const;

const tracks = [
  ["Bags API", "index, launch source, evidence links", DatabaseZap],
  ["Fee Sharing", "velocity, claims, creator reputation", FileCheck2],
  ["Social Finance", "proof-ranked token timelines", Radio],
  ["Tether / USDT", "stable creator economics", WalletCards],
] as const;

type DemoKey = keyof typeof demos;

export function LandingPage() {
  const [activeDemo, setActiveDemo] = useState<DemoKey>("Scan Token");
  const demo = demos[activeDemo];
  const marqueeItems = useMemo(() => [...sources, ...sources], []);

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden bg-[#07070c] text-white">
      <div className="sr-only">
        <h1>Launch Bags tokens people can actually trust</h1>
        <p>Fee Loop Evidence</p>
        <p>Token Social Proof</p>
        <a href="/launch">Launch Token</a>
        <a href="/token">Explore Trust Index</a>
        <a href="/fees">Creator Reputation</a>
        <a href="/square">Social Proof</a>
        <a href="/hackathon/status">View Hackathon Status</a>
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-[linear-gradient(90deg,#ff5c7a,#ffb84d,#31d99b,#55d6ff,#a78bfa)] bg-[length:240%_100%] opacity-90 landing-gradient-run" />

      <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden border-b border-white/10 bg-[#080912]">
        <HeroTrustScene />
        <div className="absolute inset-0 pointer-events-none landing-aurora" />
        <div className="absolute inset-0 pointer-events-none landing-scan-grid opacity-55" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#07070c] to-transparent" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="landing-proof-particle font-mono text-xs font-black uppercase tracking-[0.18em] text-white/18"
              style={{
                left: `${7 + (index * 9) % 86}%`,
                animationDelay: `${index * 0.82}s`,
                animationDuration: `${7 + (index % 5)}s`,
              }}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-64px)] max-w-[1520px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.68fr_1.32fr] lg:px-10">
          <div className="landing-rise max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#31d99b]/35 bg-[#0d1c19]/82 px-4 py-2 text-sm font-black text-[#69f0bd] shadow-[0_14px_50px_rgba(49,217,155,0.18)] backdrop-blur-xl">
              <ScanLine size={16} />
              Trust Passport Scanner
            </div>
            <h1 className="max-w-4xl font-display text-6xl leading-[0.88] tracking-normal text-white sm:text-7xl lg:text-8xl">
              Trust before the trade
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-black leading-8 text-white/66 sm:text-xl">
              SignalCred turns every Bags token into a verifiable trust passport with source proof, fee evidence, creator reputation, and token-linked social validation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/launch"
                className="group landing-magnetic inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[linear-gradient(135deg,#ff4f6d,#ff8b45)] px-6 text-base font-black leading-none text-white shadow-[0_22px_54px_rgba(255,79,109,0.28)] transition hover:translate-y-[-2px] hover:shadow-[0_28px_72px_rgba(255,92,122,0.36)]"
              >
                <span className="leading-none">Launch verified token</span>
                <ArrowRight size={18} className="shrink-0 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/token"
                className="landing-magnetic inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-6 text-base font-black text-white shadow-[0_16px_44px_rgba(49,217,155,0.12)] backdrop-blur-xl transition hover:border-[#31d99b]/50 hover:bg-white/[0.12]"
              >
                Open Trust Index
              </Link>
              <Link
                href="/hackathon/status"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-base font-black text-white/58 backdrop-blur-xl transition hover:text-white"
              >
                View Grant Status
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              {["No fake data", "Explorer-linked", "Token social only"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-black text-white/72 backdrop-blur-xl">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#31d99b]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[640px] overflow-visible">
            <div className="landing-scanner-shell absolute left-[44%] top-1/2 h-[470px] w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#31d99b]/20 bg-[#31d99b]/[0.025] shadow-[0_0_140px_rgba(49,217,155,0.16)]">
              <div className="landing-scanner-orbit landing-orbit-a" />
              <div className="landing-scanner-orbit landing-orbit-b" />
              <div className="landing-scan-beam" />
              {proofNodes.map(([label, detail], index) => (
                <div key={label} className={`landing-orbit-node landing-node-${index}`}>
                  <span className="text-sm font-black text-white">{label}</span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] text-white/38">{detail}</span>
                </div>
              ))}
              <div className="absolute left-1/2 top-1/2 w-[285px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] border border-white/14 bg-[#101524]/88 p-5 shadow-[0_38px_120px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
                <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#31d99b,transparent)]" />
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#31d99b]/14 px-3 py-1 text-xs font-black text-[#69f0bd]">SCANNING</span>
                  <span className="font-mono text-xs text-white/38">8zAe...BAGS</span>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-[#07070c] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff5c7a,#ffb84d)] text-xl font-black">S</div>
                    <div>
                      <p className="font-display text-2xl leading-none">Signal Mint</p>
                      <p className="mt-1 font-mono text-xs text-white/40">$SIGNAL / SOL</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {["Bags source", "Creator proof", "Fee loop", "Social proof"].map((item, index) => (
                      <div key={item} className="flex items-center justify-between rounded-xl bg-white/[0.055] px-3 py-2">
                        <span className="text-xs font-black text-white/58">{item}</span>
                        <span className={index === 2 ? "text-xs font-black text-[#ffcf7a]" : "text-xs font-black text-[#69f0bd]"}>
                          {index === 2 ? "warming" : "verified"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-float-panel absolute right-0 top-12 hidden w-[300px] rounded-[28px] border border-white/10 bg-[#101524]/78 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl xl:block">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/42">Live terminal</p>
                <span className="rounded-full bg-[#31d99b]/14 px-3 py-1 text-xs font-black text-[#69f0bd]">proof</span>
              </div>
              <div className="mt-5 space-y-3">
                {terminalRows.map(([label, value, status]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
                      <p className="mt-1 text-sm font-black text-white">{value}</p>
                    </div>
                    <span className={status === "ok" ? "rounded-full bg-[#31d99b]/14 px-2.5 py-1 text-xs font-black text-[#69f0bd]" : "rounded-full bg-[#ffb84d]/18 px-2.5 py-1 text-xs font-black text-[#ffcf7a]"}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-float-panel landing-float-delay absolute bottom-10 left-2 hidden w-[260px] rounded-[28px] border border-white/10 bg-[#0b0a12]/86 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl xl:block">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white/42">Passport receipt</p>
              <p className="mt-3 text-2xl font-black">source to fee to social</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-[linear-gradient(90deg,#31d99b,#ffb84d,#ff5c7a)] landing-progress" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-b border-white/10 bg-[#090a12] py-4">
        <div className="landing-marquee flex gap-3 whitespace-nowrap">
          {marqueeItems.map(([label, detail], index) => (
            <div key={`${label}-${index}`} className="mx-2 inline-flex min-w-56 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-white">{index % 6 + 1}</span>
              <span>
                <span className="block text-sm font-black text-white">{label}</span>
                <span className="block text-xs font-black text-white/44">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#69f0bd]">Before / After</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-6xl">
              The market does not need more hype. It needs inspectable proof.
            </h2>
          </div>
          <p className="max-w-3xl text-lg font-black leading-8 text-white/60">
            SignalCred makes the difference visible: a token moves from scattered, unverifiable signals into one public passport traders and creators can share.
          </p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="landing-tilt-card landing-before-card rounded-[32px] border border-[#ff5c7a]/45 bg-[#230914]/88 p-5 shadow-[0_24px_90px_rgba(255,92,122,0.16)]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-[#ff8ba0]" />
              <div>
                <p className="font-display text-3xl text-[#ff9aad]">Before SignalCred</p>
                <p className="text-sm font-black text-white/42">One token, too many unknowns.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {beforeRows.map(([label, value, Icon]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-[#ff5c7a]/22 bg-[#ff5c7a]/[0.07] px-4 py-3 shadow-[inset_0_0_32px_rgba(255,92,122,0.035)]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
                    <p className="mt-1 text-base font-black text-[#ffd4dd]">{value}</p>
                  </div>
                  <Icon className="text-[#ff8ba0]" size={20} />
                </div>
              ))}
            </div>
          </div>
          <div className="landing-tilt-card landing-after-card rounded-[32px] border border-[#31d99b]/50 bg-[#061f18]/88 p-5 shadow-[0_24px_90px_rgba(49,217,155,0.14)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#69f0bd]" />
              <div>
                <p className="font-display text-3xl text-[#8dffd0]">After SignalCred</p>
                <p className="text-sm font-black text-white/42">A passport users can verify.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {afterRows.map(([label, value, Icon]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-[#31d99b]/24 bg-[#31d99b]/[0.075] px-4 py-3 shadow-[inset_0_0_32px_rgba(49,217,155,0.04)]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
                    <p className="mt-1 text-base font-black text-white">{value}</p>
                  </div>
                  <Icon className="text-[#69f0bd]" size={20} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-[#101524] text-white">
        <div className="absolute inset-0 landing-dark-grid opacity-60" />
        <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffcf68]">Proof pipeline</p>
              <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
                Every trust signal has a source, a status, and a next proof step.
              </h2>
            </div>
            <Link href="/passport/8zAeGH7GbT7Pvig3n1tWTgmTi5XqYzeWHVUwfKfiBAGS" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.2)] hover:bg-white hover:text-[#101524]">
              View sample passport <ExternalLink size={16} />
            </Link>
          </div>
          <div className="landing-pipeline mt-12 grid gap-4 lg:grid-cols-6">
            {pipeline.map(([num, title, body, Icon], index) => (
              <div key={title} className="landing-pipeline-step relative min-h-64 rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_20px_58px_rgba(0,0,0,0.2)] backdrop-blur-xl" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="landing-pipeline-ping" style={{ animationDelay: `${index * 0.42}s` }} />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-white/34">{num}</span>
                  <Icon size={22} className="text-[#69f0bd]" />
                </div>
                <h3 className="mt-8 text-xl font-black text-white">{title}</h3>
                <p className="mt-4 text-sm font-black leading-6 text-white/54">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1480px] gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-10">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#69f0bd]">Interactive demo</p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-6xl">
            Not a feature list. A token investigation cockpit.
          </h2>
          <p className="mt-5 max-w-2xl text-lg font-black leading-8 text-white/60">
            Switch layers to see what SignalCred adds around a Bags token: scanning, passport proof, creator graph, fee loop, and social validation.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {(Object.keys(demos) as DemoKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDemo(key)}
                className={`min-h-11 rounded-2xl border px-5 text-sm font-black transition ${
                  activeDemo === key
                    ? "border-white/35 bg-white text-[#101524]"
                    : "border-white/14 bg-white/[0.05] text-white/62 hover:text-white"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[34px] border border-white/12 bg-white/[0.08] p-4 shadow-[0_34px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="landing-demo-console relative overflow-hidden rounded-[26px] border border-white/12 bg-[#0b0d18] p-6 text-white">
            <div className="absolute inset-x-0 top-0 h-1 landing-gradient-run" style={{ background: `linear-gradient(90deg, ${demo.accent}, #55d6ff, #ff5c7a)` }} />
            <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: demo.accent }} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-white/36">{activeDemo}</p>
                <h3 className="mt-2 font-display text-4xl leading-tight">{demo.title}</h3>
              </div>
              <div className="landing-demo-pulse flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055]">
                <Activity style={{ color: demo.accent }} />
              </div>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_220px]">
              <div className="grid gap-3">
                {demo.rows.map(([label, value], index) => (
                  <div key={label} className="landing-terminal-line flex items-center justify-between rounded-2xl border border-white/10 bg-[#07070c] px-4 py-4" style={{ animationDelay: `${index * 90}ms` }}>
                    <span className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white/36">{label}</span>
                    <span className="text-sm font-black text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="landing-mini-passport rounded-[24px] border border-white/10 bg-[#07070c]/82 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/34">passport</span>
                  <span className="rounded-full bg-[#31d99b]/14 px-2 py-1 text-[10px] font-black text-[#69f0bd]">live</span>
                </div>
                <div className="mt-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0879ff] shadow-[0_18px_48px_rgba(0,119,255,0.28)]">
                  <img src="/signalcred-logo-256.png" alt="SignalCred" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="mt-5 space-y-2">
                  {["source", "fees", "social"].map((item, index) => (
                    <div key={item} className="flex items-center justify-between text-xs font-black">
                      <span className="text-white/42">{item}</span>
                      <span style={{ color: index === 1 ? "#ffcf7a" : "#69f0bd" }}>{index === 1 ? "warm" : "ok"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-white/42">
                <span>proof sequence</span>
                <span>capability demo</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#31d99b,#55d6ff,#a78bfa)] landing-progress" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090a12]">
        <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffcf7a]">Hackathon tracks</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-6xl">
                One product story, four track angles.
              </h2>
            </div>
            <Link href="/hackathon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.2)] hover:bg-white hover:text-[#101524]">
              Pitch Deck <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tracks.map(([title, body, Icon], index) => (
              <div key={title} className="landing-track-card rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_20px_58px_rgba(0,0,0,0.2)] backdrop-blur-xl" style={{ animationDelay: `${index * 80}ms` }}>
                <Icon size={24} className="text-[#69f0bd]" />
                <h3 className="mt-6 text-xl font-black text-white">{title}</h3>
                <p className="mt-4 text-sm font-black leading-6 text-white/54">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="relative grid gap-8 overflow-hidden rounded-[38px] border border-white/10 bg-[#101524] p-8 text-white shadow-[0_34px_100px_rgba(0,0,0,0.36)] sm:p-12 lg:grid-cols-[1fr_360px] lg:p-16">
          <div className="absolute inset-0 landing-cta-sheen" />
          <div className="relative z-10">
            <LockKeyhole size={32} className="text-[#31d99b]" />
            <h2 className="mt-8 max-w-4xl font-display text-4xl leading-tight sm:text-6xl">
              Launch the token. Ship the passport with it.
            </h2>
            <p className="mt-5 max-w-3xl text-lg font-black leading-8 text-white/64">
              SignalCred keeps the demo path tight: create through Bags, open the Trust Index, prove the fee loop, and publish token-linked social evidence.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/launch" className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-6 text-base font-black leading-none text-[#101524] transition hover:bg-[#d7fff0]">
                <span className="leading-none">Launch verified token</span>
                <ArrowRight size={18} className="shrink-0" />
              </Link>
              <Link href="/token" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/18 px-6 text-base font-black text-white/78 transition hover:text-white">
                Open Trust Index <ExternalLink size={16} />
              </Link>
            </div>
          </div>
          <div className="relative z-10 rounded-[28px] border border-white/12 bg-[#07070c]/70 p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-white/42">receipt policy</p>
            <div className="mt-5 space-y-3">
              {["No fake data", "Explorer-linked", "Token social only", "Preview-only USDT payouts"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.055] px-4 py-3">
                  <CheckCircle2 size={18} className="text-[#69f0bd]" />
                  <span className="text-sm font-black text-white/78">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#07070c]">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="font-display text-2xl text-white">SignalCred</p>
            <p className="mt-2 max-w-xl text-sm font-black leading-6 text-white/46">
              Bags-native trust passport layer. No alpha promises, no generic social feed, no hidden proof.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-black text-white/46">
            <Link href="/token" className="hover:text-white">Trust Index</Link>
            <Link href="/fees" className="hover:text-white">Creator Reputation</Link>
            <Link href="/square" className="hover:text-white">Token Social Proof</Link>
            <Link href="/docs" className="hover:text-white">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
