import Link from "next/link";
import { ArrowRight, CheckCircle2, DatabaseZap, LayoutGrid, ShieldCheck, Trophy } from "lucide-react";

export const metadata = { title: "Docs - SignalCred" };

const integrations = [
  ["Launch feed", "GET /token-launch/feed", "Indexes recent Bags launches into the Token Index."],
  ["Pool verification", "GET /solana/bags/pools/token-mint", "Verifies arbitrary token mints before showing Bags badge."],
  ["Creators", "GET /token-launch/creator/v3", "Adds creator/provider identity to Token Home and reputation views."],
  ["Lifetime fees", "GET /token-launch/lifetime-fees", "Ranks tokens by real fee reputation."],
  ["Fee velocity", "fee_snapshots hourly cache", "Calculates generated fees 24h from lifetime fee deltas without mock data."],
  ["Fee claims", "sdk.fee.getAllClaimablePositions + getClaimTransactions", "Lets creators claim earned fees without custody."],
];

const publicApis = [
  ["Token trust", "GET /api/public/token/[mint]/trust", "Compact score, verdict, badges, risk labels, links, and embed URL."],
  ["Token passport", "GET /api/public/token/[mint]/passport", "Full public proof document with evidence rows and no-fake-data policy."],
  ["Creator trust", "GET /api/public/creator/[wallet]/trust", "Creator reliability summary with public token/passport links."],
  ["Trust embed", "/embed/trust/[mint]", "Iframe-ready trust card for Bags tools, launch pages, bots, and community docs."],
];

const safeguards = [
  "No fake charts or fake fee data",
  "Rate-limited public import and leaderboard APIs",
  "Solana mint validation before import",
  "External URLs sanitized before storing",
  "Private/localhost URLs rejected",
  "Wallet signature required for creator-only official updates and fee actions",
  "Launch status requires on-chain verification",
  "Graceful pending states when external data is unavailable",
];

export default function DocsPage() {
  return (
    <main className="focus-shell text-white">
      <section className="mb-8 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#69d99a]">
          <CheckCircle2 size={14} />
          Focused Documentation
        </div>
        <h1 className="font-display text-5xl leading-[0.95] md:text-7xl">
          Three tracks, one product loop.
        </h1>
        <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/58">
          SignalCred is intentionally scoped to Bags API, Social Finance, and Fee Reputation. Everything below maps directly to those three tracks.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/token" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#26aa68] px-5 text-sm font-black text-white">
            Token Index <ArrowRight size={15} />
          </Link>
          <Link href="/fees" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-5 text-sm font-black text-white/80">
            Fee Reputation <Trophy size={15} />
          </Link>
          <Link href="/grant/status" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-[#69d99a]/20 bg-[#69d99a]/10 px-5 text-sm font-black text-[#69d99a]">
            Grant Status <ShieldCheck size={15} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: DatabaseZap,
            title: "Bags API",
            body: "The app indexes Bags launches, verifies pools by mint, imports creators, and exposes source-backed evidence.",
          },
          {
            icon: LayoutGrid,
            title: "Social Finance",
            body: "Each Bags token gets a home, token-attached posts, community activity, and a social score.",
          },
          {
            icon: Trophy,
            title: "Fee Reputation",
            body: "Lifetime fees and claimable positions become a public signal of creator traction.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-[24px] border border-white/10 bg-[#100b22]/82 p-5">
            <Icon className="mb-4 text-[#69d99a]" size={24} />
            <h2 className="mb-2 text-xl font-black">{title}</h2>
            <p className="text-sm font-semibold leading-6 text-white/52">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-white/7 p-6">
        <h2 className="mb-4 font-display text-3xl">Integration Map</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {integrations.map(([name, ref, use]) => (
            <div key={name} className="grid gap-3 border-b border-white/6 bg-black/18 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[0.8fr_1fr_1.4fr]">
              <p className="font-black text-white">{name}</p>
              <code className="text-xs text-[#69d99a]">{ref}</code>
              <p className="font-semibold text-white/52">{use}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-[#69d99a]/16 bg-[#062019]/72 p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">Public Trust API + Embed</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-white/52">
              Read-only, cacheable trust data for external Bags apps. Responses include `noFakeData: true`, source labels, generated timestamps, and no server secrets.
            </p>
          </div>
          <code className="rounded-2xl border border-white/10 bg-black/22 px-3 py-2 text-xs text-[#69d99a]">
            {"<iframe src=\"/embed/trust/MINT\"></iframe>"}
          </code>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {publicApis.map(([name, ref, use]) => (
            <div key={name} className="grid gap-3 border-b border-white/6 bg-black/16 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[0.72fr_1.15fr_1.35fr]">
              <p className="font-black text-white">{name}</p>
              <code className="text-xs text-[#69d99a]">{ref}</code>
              <p className="font-semibold text-white/52">{use}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-[#100b22]/82 p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="text-[#69d99a]" size={20} />
          <h2 className="font-display text-3xl">Security Rules</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {safeguards.map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm font-bold text-white/60">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-[#69d99a]/16 bg-white/[0.045] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Grant Operations</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-white/52">
              `/grant/status` is the reviewer-facing operational dashboard for live coverage, fee snapshot freshness, public API readiness, and trust/security policies.
            </p>
          </div>
          <Link href="/grant/status" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#69d99a] px-5 text-sm font-black text-[#06120d]">
            Open Grant Status <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}
