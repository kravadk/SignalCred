import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  DatabaseZap,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

export const metadata = { title: "Bags Hackathon Demo - SignalCred" };

const tracks = [
  {
    icon: DatabaseZap,
    title: "Bags API",
    body: "A Bags-wide token index built from launch feed, migrated pools, creators, lifetime fees, claim events, and token-level proof.",
    proof: ["token-launch/feed", "solana/bags/pools", "creator/v3", "lifetime-fees"],
  },
  {
    icon: LayoutGrid,
    title: "Social Finance",
    body: "Every verified Bags token gets context: official creator updates, token-linked posts, social score, and evidence-first discussion.",
    proof: ["creator-only official updates", "token context", "Square feed", "wallet signatures"],
  },
  {
    icon: CircleDollarSign,
    title: "Fee Reputation",
    body: "Fees become a public reputation signal: lifetime fees, claimed 24h, and hourly snapshot-based fee velocity.",
    proof: ["claim events", "fee snapshots", "velocity pending/active", "creator ranking"],
  },
];

const demoFlow = [
  {
    title: "Open Bags Token Index",
    href: "/token",
    body: "See a Bags universe, not a fixed local list: feed + migrated pools, DexScreener market data, Bags proof, and fee velocity status.",
  },
  {
    title: "Choose a token",
    href: "/token/94rNUftdQYXdiYzpkiM6Stdc9bZrxLNasEYeCM8oBAGS",
    body: "Open a token page and start with identity, market signal, and the Evidence block.",
  },
  {
    title: "Inspect Evidence",
    href: "/token/94rNUftdQYXdiYzpkiM6Stdc9bZrxLNasEYeCM8oBAGS",
    body: "Verify Bags feed proof, pool proof, creators API, lifetime fees, claim events, fee velocity snapshots, and market source.",
  },
  {
    title: "Open Reputation",
    href: "/fees",
    body: "Compare tokens by lifetime fees, claimed 24h, fee velocity, market data, creator identity, and Bags proof.",
  },
  {
    title: "Post or launch",
    href: "/launch",
    body: "Creator actions are wallet-signed; official updates require Bags creators API verification.",
  },
];

const competitors = [
  ["BagsPulse", "Broad market coverage", "SignalCred adds evidence/source transparency plus fee velocity snapshots."],
  ["BagScan", "Token inspection", "SignalCred turns inspection into a creator reputation and social finance loop."],
  ["CreatorRadar", "Creator discovery", "SignalCred ties creator identity to real Bags fees and verified official updates."],
  ["AI launchpads", "Launch flow", "SignalCred focuses after launch: proof, context, reputation, and trust."],
];

export default function HackathonPage() {
  return (
    <main className="focus-shell text-white">
      <section className="mb-8 max-w-4xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#26aa68]/25 bg-[#26aa68]/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#69d99a]">
          <BadgeCheck size={14} />
          Judge Demo Script
        </div>
        <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
          The evidence layer for every Bags token.
        </h1>
        <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/58">
          SignalCred is intentionally scoped to three hackathon tracks: Bags API, Social Finance,
          and Fee Sharing / Creator Reputation. The demo shows how a Bags token becomes searchable,
          explainable, social, and reputation-ranked without fake local rows.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/token" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#26aa68] px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(38,170,104,0.25)]">
            Start Demo <ArrowRight size={15} />
          </Link>
          <Link href="/fees" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/[0.055] bg-white/[0.055] px-5 text-sm font-black text-white/80 hover:bg-white/[0.08]">
            Reputation Ranking <Trophy size={15} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {tracks.map(({ icon: Icon, title, body, proof }) => (
          <article key={title} className="rounded-[24px] border border-white/[0.055] bg-[#100b22]/82 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
            <Icon className="mb-4 text-[#69d99a]" size={24} />
            <h2 className="mb-2 text-xl font-black">{title}</h2>
            <p className="text-sm font-semibold leading-6 text-white/52">{body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {proof.map((item) => (
                <span key={item} className="rounded-lg border border-white/[0.045] bg-white/[0.04] px-2 py-1 text-[10px] font-mono text-white/42">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/[0.055] bg-[#100b22]/82 p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="text-[#ffb84d]" size={20} />
            <h2 className="font-display text-3xl">2-minute demo flow</h2>
          </div>
          <div className="space-y-2">
            {demoFlow.map((step, index) => (
              <Link key={step.title} href={step.href} className="grid gap-3 rounded-2xl border border-white/[0.045] bg-white/[0.04] px-3 py-3 transition-colors hover:bg-white/[0.07] md:grid-cols-[42px_0.7fr_1.3fr] md:items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#26aa68]/16 text-xs font-black text-[#69d99a]">{index + 1}</span>
                <p className="text-sm font-black text-white">{step.title}</p>
                <p className="text-sm font-semibold leading-6 text-white/50">{step.body}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.055] bg-white/[0.045] p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="text-[#69d99a]" size={20} />
            <h2 className="font-display text-3xl">What to judge</h2>
          </div>
          <div className="space-y-3 text-sm font-semibold leading-6 text-white/55">
            <p>No mock tokens or invented fee velocity. Pending states stay visible until real data exists.</p>
            <p>Official updates are creator-only through wallet signatures and Bags creators API verification.</p>
            <p>Every token row exposes source: Bags universe, DexScreener market, fee snapshots, claim events.</p>
            <p>The product avoids generic AI/yield/privacy/payment sprawl and stays inside the three target tracks.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-white/[0.055] bg-white/[0.045] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Trophy className="text-[#ffb84d]" size={20} />
          <h2 className="font-display text-3xl">Competitive wedge</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.055]">
          {competitors.map(([name, strength, answer]) => (
            <div key={name} className="grid gap-3 border-b border-white/[0.035] bg-black/18 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[0.7fr_1fr_1.7fr]">
              <p className="font-black text-white">{name}</p>
              <p className="font-semibold text-white/48">{strength}</p>
              <p className="font-semibold text-white/62">{answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
