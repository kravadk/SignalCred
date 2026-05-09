"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CircleDollarSign,
  DatabaseZap,
  ExternalLink,
  FileCheck2,
  Gauge,
  LockKeyhole,
  Megaphone,
  Radio,
  Rocket,
  ShieldCheck,
  Sparkles,
  SquareActivity,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { HeroTrustScene } from "./HeroTrustScene";

const sources = [
  ["Bags API", "Launch source"],
  ["Solscan", "Receipts"],
  ["DexScreener", "Markets"],
  ["Meteora", "Pools"],
  ["USDT", "Stable budget"],
  ["Fee Snapshots", "Velocity"],
] as const;

const proofNodes = ["Bags API", "Creator Proof", "Fee Loop", "Claim Receipt", "Social Proof", "USDT Campaign"] as const;

const pillars = [
  {
    title: "Bags-native Launch",
    body: "Launch through Bags, then create the token trust profile, proof links, and first creator update from one flow.",
    href: "/launch",
    icon: Rocket,
    tone: "from-[#ff5c7a] to-[#ff9d55]",
  },
  {
    title: "Trust Index",
    body: "Every indexed Bags token gets source labels, market state, risk tags, and transparent explorer links.",
    href: "/token",
    icon: ShieldCheck,
    tone: "from-[#31d99b] to-[#4ec7ff]",
  },
  {
    title: "Fee Loop Evidence",
    body: "Show generated fees, claims, receipts, and USDT campaign funding proof without inventing missing data.",
    href: "/fees",
    icon: CircleDollarSign,
    tone: "from-[#ffbf4d] to-[#ff6a7a]",
  },
  {
    title: "Token Social Proof",
    body: "Official updates, milestones, campaigns, and community posts stay attached to a verified Bags token.",
    href: "/square",
    icon: SquareActivity,
    tone: "from-[#a78bfa] to-[#55d6ff]",
  },
] as const;

const previews = {
  Launch: {
    eyebrow: "Bags-native creation",
    title: "One launch flow, immediate trust profile.",
    body: "Create through Bags, confirm the mint, attach explorer proof, and publish the official first post.",
    bullets: ["Bags SDK/API path", "Partner key server-side", "Creator-verified post"],
    icon: Rocket,
    color: "#ff5c7a",
  },
  Trust: {
    eyebrow: "Before users trade",
    title: "A token page that answers whether it is real.",
    body: "Source badges, creator proof, pool proof, market links, and Evidence 2.0 sit next to the buy panel.",
    bullets: ["Bags feed proof", "Solscan mint link", "Dex/Meteora labels"],
    icon: BadgeCheck,
    color: "#31d99b",
  },
  Fees: {
    eyebrow: "Creator economy",
    title: "Fees become reputation, not hidden backend noise.",
    body: "Lifetime fees, fee velocity, claim events, receipts, and USDT values explain the creator economy clearly.",
    bullets: ["Hourly snapshots", "Claim receipts", "Stable USDT estimates"],
    icon: TrendingUp,
    color: "#ffb84d",
  },
  Social: {
    eyebrow: "Token-linked community",
    title: "Social activity only counts when it has token context.",
    body: "Square ranks official posts, campaigns, milestones, and proof-backed activity instead of generic engagement.",
    bullets: ["Token Social Proof", "USDT campaigns", "Milestone timeline"],
    icon: Megaphone,
    color: "#8b5cf6",
  },
} as const;

const steps = [
  ["01", "Launch through Bags", "A creator starts with a Bags-native launch path instead of a detached token page.", Rocket],
  ["02", "Token page created", "The mint gets identity, market state, Bags proof, and explorer links immediately.", BadgeCheck],
  ["03", "Official post published", "The creator/admin wallet signs the first token-linked Square update.", Megaphone],
  ["04", "Reputation compounds", "Fees, claims, campaigns, milestones, and social proof build the profile over time.", Gauge],
] as const;

const tracks = [
  ["Bags API", "Full token index, proof rows, evidence links, launch confirmation, and ReStream-ready status.", DatabaseZap],
  ["Fee Sharing", "Fee velocity, creator reputation, claim timeline, receipts, and stable USDT equivalents.", FileCheck2],
  ["Social Finance", "Official updates, proof-ranked Square, milestones, campaigns, and anti-spam token context.", Radio],
  ["Tether / USDT", "USDT buy mode, creator economics in stable value, treasury planner, and funding proof.", WalletCards],
] as const;

const signalRows = [
  ["source", "Bags feed verified", "ok"],
  ["creator", "admin wallet matched", "ok"],
  ["fees", "24h baseline warming", "warming"],
  ["receipt", "Solscan link ready", "ok"],
  ["campaign", "USDT budget planned", "preview"],
] as const;

type PreviewKey = keyof typeof previews;

export function LandingPage() {
  const [activePreview, setActivePreview] = useState<PreviewKey>("Trust");
  const preview = previews[activePreview];
  const PreviewIcon = preview.icon;

  const marqueeItems = useMemo(() => [...sources, ...sources], []);

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden bg-[#f5fbff] text-[#111827]">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-[linear-gradient(90deg,#ff5c7a,#ffb84d,#31d99b,#55d6ff,#a78bfa)] bg-[length:240%_100%] opacity-90 landing-gradient-run" />

      <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden border-b border-[#15213a]/10 bg-[#eaf7ff]">
        <HeroTrustScene />
        <div className="absolute inset-0 pointer-events-none landing-aurora" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.42]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(17,24,39,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.045) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#f5fbff] to-transparent" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-64px)] max-w-[1480px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-10">
          <div className="landing-rise max-w-5xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#31d99b]/35 bg-white/72 px-4 py-2 text-sm font-black text-[#07634b] shadow-[0_14px_50px_rgba(49,217,155,0.22)] backdrop-blur-xl">
              <Sparkles size={16} />
              SignalCred Trust Observatory
            </div>
            <h1 className="max-w-5xl font-display text-5xl leading-[0.92] tracking-normal text-[#101524] sm:text-7xl lg:text-8xl">
              Launch Bags tokens people can actually trust
            </h1>
            <p className="mt-7 max-w-3xl text-lg font-black leading-8 text-[#39445c] sm:text-xl">
              Create a Bags-native token, publish verified creator updates, prove fees and claims, and turn community activity into token reputation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/launch"
                className="group landing-magnetic inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#101524] px-6 text-base font-black text-white shadow-[0_22px_54px_rgba(16,21,36,0.28)] transition hover:translate-y-[-2px] hover:shadow-[0_28px_72px_rgba(255,92,122,0.36)]"
              >
                Launch Token
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/token"
                className="landing-magnetic inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#101524]/12 bg-white/78 px-6 text-base font-black text-[#101524] shadow-[0_16px_44px_rgba(49,217,155,0.16)] backdrop-blur-xl transition hover:border-[#31d99b]/50 hover:bg-white"
              >
                Explore Trust Index
              </Link>
              <Link
                href="/hackathon/status"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#101524]/10 bg-white/44 px-6 text-base font-black text-[#4c5870] backdrop-blur-xl transition hover:text-[#101524]"
              >
                View Hackathon Status
              </Link>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
              {proofNodes.map((node, index) => (
                <div
                  key={node}
                  className="landing-proof-chip rounded-2xl border border-white/70 bg-white/74 px-3 py-3 text-sm font-black text-[#172033] shadow-[0_16px_38px_rgba(19,33,58,0.12)] backdrop-blur-xl"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#31d99b] shadow-[0_0_14px_rgba(49,217,155,0.9)]" />
                  {node}
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden min-h-[600px] lg:block">
            <div className="landing-float-panel absolute right-4 top-12 w-80 rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_28px_90px_rgba(33,51,89,0.18)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#667085]">Live proof rail</p>
                <span className="rounded-full bg-[#31d99b]/14 px-3 py-1 text-xs font-black text-[#087353]">no fake data</span>
              </div>
              <div className="mt-5 space-y-3">
                {signalRows.map(([label, value, status]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-[#101524]/8 bg-[#f7fbff] px-4 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#98a2b3]">{label}</p>
                      <p className="mt-1 text-sm font-black text-[#111827]">{value}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        status === "ok"
                          ? "bg-[#31d99b]/14 text-[#087353]"
                          : status === "warming"
                            ? "bg-[#ffb84d]/18 text-[#8a5700]"
                            : "bg-[#8b5cf6]/12 text-[#5b31b8]"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="landing-float-panel landing-float-delay absolute bottom-16 left-4 w-72 rounded-[28px] border border-[#101524]/10 bg-[#101524] p-5 text-white shadow-[0_28px_90px_rgba(16,21,36,0.32)]">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white/42">Fee loop</p>
              <p className="mt-3 text-3xl font-black">Generated to claimed to proof</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-[linear-gradient(90deg,#31d99b,#ffb84d,#ff5c7a)] landing-progress" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-b border-[#15213a]/10 bg-white py-4">
        <div className="landing-marquee flex gap-3 whitespace-nowrap">
          {marqueeItems.map(([label, detail], index) => (
            <div key={`${label}-${index}`} className="mx-2 inline-flex min-w-56 items-center gap-3 rounded-2xl border border-[#101524]/8 bg-[#f4f8ff] px-5 py-4 shadow-[0_10px_30px_rgba(19,33,58,0.06)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101524] text-xs font-black text-white">{index % 6 + 1}</span>
              <span>
                <span className="block text-sm font-black text-[#111827]">{label}</span>
                <span className="block text-xs font-black text-[#667085]">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0f8f67]">Product system</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-[#101524] sm:text-6xl">
              A launchpad is not enough. Trust has to ship with the token.
            </h2>
          </div>
          <p className="max-w-3xl text-lg font-black leading-8 text-[#516078]">
            The first screen should feel alive because the product is alive: source checks, token proof, fee snapshots, creator identity, and social context all move together.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map(({ title, body, href, icon: Icon, tone }, index) => (
            <Link
              href={href}
              key={title}
              className="landing-tilt-card group relative min-h-80 overflow-hidden rounded-[30px] border border-[#101524]/10 bg-white p-6 shadow-[0_24px_70px_rgba(19,33,58,0.10)] transition duration-300 hover:-translate-y-2"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${tone}`} />
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-[0_18px_36px_rgba(19,33,58,0.16)]`}>
                <Icon size={24} />
              </div>
              <h3 className="mt-9 text-2xl font-black text-[#101524]">{title}</h3>
              <p className="mt-4 text-base font-black leading-7 text-[#5b667a]">{body}</p>
              <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 text-sm font-black text-[#101524]">
                Open layer <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[#15213a]/10 bg-[#101524] text-white">
        <div className="absolute inset-0 landing-dark-grid opacity-60" />
        <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-10">
          <div className="relative z-10">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffcf68]">Interactive preview</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
              The demo path judges can understand in one minute.
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-black leading-8 text-white/64">
              Launch, verify, prove, and grow. The product stays focused on token trust instead of becoming another broad crypto terminal.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {(Object.keys(previews) as PreviewKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivePreview(key)}
                  className={`min-h-11 rounded-2xl border px-5 text-sm font-black transition ${
                    activePreview === key
                      ? "border-white/35 bg-white text-[#101524]"
                      : "border-white/14 bg-white/[0.05] text-white/62 hover:text-white"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <div className="relative z-10 rounded-[34px] border border-white/12 bg-white/[0.08] p-4 shadow-[0_34px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[#f8fbff] p-6 text-[#101524]">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff5c7a,#ffb84d,#31d99b,#55d6ff,#a78bfa)] landing-gradient-run" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white shadow-[0_18px_42px_rgba(19,33,58,0.16)]" style={{ background: preview.color }}>
                    <PreviewIcon size={23} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#98a2b3]">{preview.eyebrow}</p>
                    <h3 className="mt-1 text-2xl font-black text-[#101524]">{preview.title}</h3>
                  </div>
                </div>
                <Gauge className="hidden text-[#31d99b] sm:block" />
              </div>
              <p className="mt-6 text-lg font-black leading-8 text-[#5b667a]">{preview.body}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {preview.bullets.map((item, index) => (
                  <div key={item} className="landing-mini-step rounded-2xl border border-[#101524]/8 bg-white p-4 shadow-[0_12px_32px_rgba(19,33,58,0.08)]" style={{ animationDelay: `${index * 110}ms` }}>
                    <BookOpenCheck size={18} className="text-[#31d99b]" />
                    <p className="mt-3 text-sm font-black leading-5 text-[#101524]">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 rounded-2xl border border-[#101524]/8 bg-[#101524] p-4 text-white">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-white/42">
                  <span>proof sequence</span>
                  <span>live UI</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#31d99b,#55d6ff,#a78bfa)] landing-progress" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.68fr_1.32fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0f8f67]">How it works</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-[#101524] sm:text-6xl">Trust starts at launch and keeps updating.</h2>
          </div>
          <div className="relative grid gap-4 md:grid-cols-2">
            <div className="pointer-events-none absolute left-4 top-8 hidden h-[calc(100%-4rem)] w-1 rounded-full bg-[#dce8f5] md:block">
              <div className="h-3/4 w-full rounded-full bg-[linear-gradient(#31d99b,#ffb84d,#ff5c7a)] landing-progress-vertical" />
            </div>
            {steps.map(([num, title, body, Icon], index) => (
              <div key={num} className="landing-step-card min-h-56 rounded-[28px] border border-[#101524]/10 bg-white p-6 shadow-[0_18px_52px_rgba(19,33,58,0.08)]" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#0f8f67]">{num}</p>
                  <Icon size={22} className="text-[#ff5c7a]" />
                </div>
                <h3 className="mt-8 text-2xl font-black text-[#101524]">{title}</h3>
                <p className="mt-4 text-base font-black leading-7 text-[#5b667a]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#15213a]/10 bg-[#eaf7ff]">
        <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#c76d00]">Hackathon tracks</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-[#101524] sm:text-6xl">Built for Bags-native proof, creator reputation, social finance, and USDT value.</h2>
            </div>
            <Link href="/hackathon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#101524]/12 bg-white px-5 text-sm font-black text-[#101524] shadow-[0_14px_34px_rgba(19,33,58,0.08)] hover:bg-[#101524] hover:text-white">
              Pitch Deck <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tracks.map(([title, body, Icon], index) => (
              <div key={title} className="landing-track-card rounded-[28px] border border-[#101524]/10 bg-white/82 p-6 shadow-[0_20px_58px_rgba(19,33,58,0.08)] backdrop-blur-xl" style={{ animationDelay: `${index * 80}ms` }}>
                <Icon size={24} className="text-[#0f8f67]" />
                <h3 className="mt-6 text-xl font-black text-[#101524]">{title}</h3>
                <p className="mt-4 text-sm font-black leading-6 text-[#5b667a]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[38px] bg-[#101524] p-8 text-white shadow-[0_34px_100px_rgba(16,21,36,0.26)] sm:p-12 lg:p-16">
          <div className="absolute inset-0 landing-cta-sheen" />
          <div className="relative z-10">
            <LockKeyhole size={32} className="text-[#31d99b]" />
            <h2 className="mt-8 max-w-4xl font-display text-4xl leading-tight sm:text-6xl">
              Launch the token, then let the proof do the work.
            </h2>
            <p className="mt-5 max-w-3xl text-lg font-black leading-8 text-white/64">
              SignalCred keeps the demo path tight: create through Bags, open the Trust Index, prove the fee loop, and publish token-linked social evidence.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/launch" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-black text-[#101524] transition hover:bg-[#d7fff0]">
                Launch Token <ArrowRight size={18} />
              </Link>
              <Link href="/square" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/18 px-6 text-base font-black text-white/78 transition hover:text-white">
                Open Token Social Proof <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#15213a]/10 bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="font-display text-2xl text-[#101524]">SignalCred</p>
            <p className="mt-2 max-w-xl text-sm font-black leading-6 text-[#667085]">
              Bags-native launch, trust, and social finance layer. No fake stats, no detached social feed, no hidden proof.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-black text-[#667085]">
            <Link href="/token" className="hover:text-[#101524]">Trust Index</Link>
            <Link href="/fees" className="hover:text-[#101524]">Creator Reputation</Link>
            <Link href="/square" className="hover:text-[#101524]">Token Social Proof</Link>
            <Link href="/docs" className="hover:text-[#101524]">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
