import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, DatabaseZap, ExternalLink, LayoutGrid, Lightbulb, ShieldCheck, Sparkles, Trophy, Wrench } from "lucide-react";
import { dev3packResourceComparison, dev3packResourceGroups } from "@/lib/dev3pack-resources";

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

const resourceFit = [
  {
    icon: Sparkles,
    title: "Solana Vibe Coding Checklist",
    body: "SignalCred keeps the demo path tight: connect wallet, inspect token, launch, post proof, and verify receipts without hidden setup or fake values.",
  },
  {
    icon: Lightbulb,
    title: "Product Ideation",
    body: "The product thesis is not another terminal or alpha bot. It is a trust passport standard for Bags tokens, creators, fees, and social proof.",
  },
  {
    icon: Wrench,
    title: "Developer Resources",
    body: "The build is grounded in Solana wallet flows, Bags APIs, public read-only trust APIs, embed widgets, fee snapshot cron, and ReStream worker readiness.",
  },
  {
    icon: Code2,
    title: "Agent / AI Skills",
    body: "AI stays bounded: optional summaries and drafting are evidence-backed. Trust scores come from source labels, signatures, fee rows, and explorer links.",
  },
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

      <section className="mt-8 rounded-[28px] border border-[#5bc4ff]/16 bg-[#071724]/72 p-6">
        <div className="mb-5 max-w-3xl">
          <h2 className="font-display text-3xl">Dev3pack Resource Fit</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-white/52">
            The resources page is useful as a checklist: build fast, explain the product clearly, use Solana-native tools, and keep AI/agent features grounded. SignalCred applies that as a submission-readiness layer.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {resourceFit.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-white/8 bg-black/18 p-4">
              <Icon className="mb-4 text-[#8fd8ff]" size={21} />
              <h3 className="text-sm font-black text-white">{title}</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/48">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-[#0d101a]/82 p-6">
        <div className="mb-5 max-w-4xl">
          <h2 className="font-display text-3xl">External Resource Comparison</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-white/52">
            These are the concrete Dev3pack links mapped against SignalCred. The point is not to copy every tool, but to decide what strengthens the trust-passport product without turning it into a generic AI app, launchpad, or terminal.
          </p>
        </div>

        <div className="grid gap-4">
          {dev3packResourceGroups.map((group) => (
            <article key={group.category} className="rounded-2xl border border-white/8 bg-black/18 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex rounded-md border border-[#5bc4ff]/18 bg-[#5bc4ff]/8 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-[#8fd8ff]">
                    {group.status}
                  </div>
                  <h3 className="font-display text-2xl">{group.category}</h3>
                  <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/48">{group.thesis}</p>
                </div>
                <div className="max-w-md space-y-1.5">
                  {group.items.map((item) => (
                    <p key={item} className="flex gap-2 text-[11px] font-semibold leading-4 text-white/45">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#69d99a]" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 lg:grid-cols-2">
                {group.resources.map((resource) => (
                  <a
                    key={resource.href}
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-xl border border-white/8 bg-white/[0.035] p-3 transition hover:border-[#69d99a]/30 hover:bg-[#69d99a]/[0.055]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{resource.label}</p>
                        <p className="mt-1 text-[11px] font-mono text-white/28">{new URL(resource.href).hostname}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-mono font-bold uppercase text-white/42 group-hover:text-[#69d99a]">
                        {resource.status}
                        <ExternalLink size={11} />
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-5 text-white/48">{resource.fit}</p>
                    <p className="mt-2 rounded-lg border border-white/6 bg-black/18 px-2 py-2 text-xs font-semibold leading-5 text-[#8fd8ff]/72">
                      SignalCred: {resource.signalCredUse}
                    </p>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {dev3packResourceComparison.map((row) => (
            <div key={row.takeaway} className="rounded-xl border border-[#69d99a]/12 bg-[#69d99a]/[0.045] p-3">
              <p className="text-sm font-black text-white">{row.takeaway}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/45">{row.why}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-[#69d99a]/80">{row.action}</p>
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
