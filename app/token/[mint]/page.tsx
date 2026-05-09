import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BadgeCheck, ExternalLink, Globe2, MessageCircle, Send, ShieldCheck, UserRound } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { TokenHero } from "@/components/token/TokenHero";
import { PriceChart } from "@/components/token/PriceChart";
import { TradePanel } from "@/components/token/TradePanel";
import { LiquidityPanel } from "@/components/token/LiquidityPanel";
import { OfficialUpdates } from "@/components/token/OfficialUpdates";
import { CommunityHoldersCard } from "@/components/token/CommunityHoldersCard";
import { FeeReputationCard } from "@/components/token/FeeReputationCard";
import { EvidencePanel } from "@/components/token/EvidencePanel";
import { SocialProofCard } from "@/components/token/SocialProofCard";
import { MilestonesCard } from "@/components/token/MilestonesCard";
import { CampaignPlannerCard } from "@/components/token/CampaignPlannerCard";
import { FeeLoopEvidenceCard } from "@/components/token/FeeLoopEvidenceCard";
import { TrustProfileCard } from "@/components/token/TrustProfileCard";
import { BeforeYouBuyPanel } from "@/components/token/BeforeYouBuyPanel";
import { db } from "@/lib/db";
import { tokens, posts, type Token } from "@/db/schema";

export async function generateMetadata({ params }: { params: { mint: string } }) {
  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });
  return {
    title: token ? `$${token.symbol} - SignalCred` : "Token - SignalCred",
    description: token?.description ?? "Bags token market, proof, and reputation.",
  };
}

function SocialLink({
  href,
  label,
  icon: Icon,
}: {
  href?: string | null;
  label: string;
  icon: typeof Globe2;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-white/8 bg-white/6 px-3 text-xs font-body font-black text-white/56 transition-colors hover:border-white/16 hover:bg-white/10 hover:text-white"
    >
      <Icon size={13} />
      {label}
    </a>
  );
}

function CompactTokenInfo({ token, mint }: { token: Token | null; mint: string }) {
  const hasLinks = Boolean(token?.websiteUrl || token?.twitterUrl || token?.telegramUrl || token?.whitepaperUrl);

  return (
    <div className="card p-3">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-sm font-body font-black text-white">Source links</p>
          <p className="mt-0.5 text-xs font-body font-semibold text-white/42">Explorer, creator profile, and official token context.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://bags.fm/${mint}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 text-xs font-body font-black text-[#00ff88] hover:bg-[#00ff88]/14"
          >
            Bags.fm <ExternalLink size={12} />
          </a>
          <a
            href={`https://solscan.io/token/${mint}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/[0.055] bg-white/[0.035] px-3 text-xs font-body font-black text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            Solscan <ExternalLink size={12} />
          </a>
          {token?.creatorWallet && (
            <Link
              href={`/profile/${token.creatorWallet}`}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#b48dff]/16 bg-[#b48dff]/8 px-3 text-xs font-body font-black text-[#cdb6ff] hover:bg-[#b48dff]/14"
            >
              Creator <UserRound size={12} />
            </Link>
          )}
          <SocialLink href={token?.websiteUrl} label="Web" icon={Globe2} />
          <SocialLink href={token?.twitterUrl} label="Twitter" icon={MessageCircle} />
          <SocialLink href={token?.telegramUrl} label="Telegram" icon={Send} />
          <SocialLink href={token?.whitepaperUrl} label="Docs" icon={ExternalLink} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 border-t border-white/[0.045] pt-3 md:grid-cols-3">
        <div className="rounded-lg bg-white/[0.025] px-3 py-2">
          <p className="text-[10px] font-body font-black uppercase tracking-[0.12em] text-white/30">Bags source</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-body font-black text-[#69d99a]">
            <ShieldCheck size={12} /> linked
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.025] px-3 py-2">
          <p className="text-[10px] font-body font-black uppercase tracking-[0.12em] text-white/30">Creator</p>
          <p className="mt-1 truncate text-xs font-body font-black text-white/68">
            {token?.creatorWallet ? `${token.creatorWallet.slice(0, 5)}...${token.creatorWallet.slice(-4)}` : "pending"}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.025] px-3 py-2">
          <p className="text-[10px] font-body font-black uppercase tracking-[0.12em] text-white/30">Social links</p>
          <p className="mt-1 text-xs font-body font-black text-white/68">{hasLinks ? "available" : "pending"}</p>
        </div>
      </div>

      {token?.description && (
        <p className="mt-3 line-clamp-2 text-sm font-body leading-6 text-white/56">{token.description}</p>
      )}
    </div>
  );
}

function DetailSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <details className="group min-w-0 overflow-visible rounded-lg border border-white/[0.05] bg-white/[0.018]">
      <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.04] group-open:sticky group-open:top-[58px] group-open:z-20 group-open:border-b group-open:border-white/[0.055] group-open:bg-[#100b22] group-open:shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
        <span className="min-w-0">
          <span className="block text-sm font-body font-black leading-5 text-white">{title}</span>
          <span className="mt-0.5 block text-xs font-body font-semibold leading-5 text-white/56">{subtitle}</span>
        </span>
        <span className="shrink-0 rounded-md bg-white/[0.055] px-2 py-1 text-[11px] font-body font-black text-white/58 group-open:bg-[#00ff88]/10 group-open:text-[#69d99a]">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="min-w-0 border-t border-white/[0.05] p-3">
        {children}
      </div>
    </details>
  );
}

export default async function TokenPage({ params }: { params: { mint: string } }) {
  const token: Token | null = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) }) ?? null;

  const [socialPosts] = await Promise.all([
    db.select().from(posts).where(eq(posts.tokenMint, params.mint)).orderBy(desc(posts.createdAt)).limit(6),
  ]);

  const symbol = token?.symbol ?? "BAGS";

  return (
    <div className="focus-shell">
      <div className="mb-3 rounded-2xl border border-[#314066]/45 bg-[#0d1020]/88 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href="/token"
              className="inline-flex min-h-[32px] shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-mono font-bold text-white/62 transition-colors hover:border-white/16 hover:bg-white/[0.075] hover:text-white"
            >
              <ArrowLeft size={15} />
              All tokens
            </Link>
            <span className="hidden truncate text-xs font-body font-semibold text-white/38 sm:inline">
              {symbol} proof workspace
            </span>
          </div>

          <span className="inline-flex min-h-[32px] items-center justify-center gap-2 rounded-lg border border-[#00ff88]/18 bg-[#00ff88]/9 px-3 text-xs font-mono font-bold uppercase tracking-[0.08em] text-[#69d99a]">
            <BadgeCheck size={13} /> Bags evidence
          </span>

          <div className="ml-0 flex flex-wrap items-center gap-1.5 lg:ml-auto">
            <a
              href={`https://solscan.io/token/${params.mint}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[32px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-mono font-bold text-white/62 transition-colors hover:border-white/16 hover:bg-white/[0.075] hover:text-white"
            >
              Solscan
              <ExternalLink size={13} />
            </a>
            <a
              href={`https://bags.fm/${params.mint}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[32px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-mono font-bold text-white/62 transition-colors hover:border-white/16 hover:bg-white/[0.075] hover:text-white"
            >
              Bags.fm
              <ExternalLink size={13} />
            </a>
            {token?.creatorWallet && (
              <Link
                href={`/profile/${token.creatorWallet}`}
                className="inline-flex min-h-[32px] items-center gap-2 rounded-lg border border-[#b48dff]/18 bg-[#b48dff]/10 px-3 text-xs font-mono font-bold text-[#cdb6ff] transition-colors hover:bg-[#b48dff]/14 hover:text-white"
              >
                Creator
                <UserRound size={13} />
              </Link>
            )}
            <Link
              href={`/passport/${params.mint}`}
              className="inline-flex min-h-[32px] items-center gap-2 rounded-lg border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 text-xs font-mono font-bold text-[#69d99a] transition-colors hover:bg-[#00ff88]/12 hover:text-white"
            >
              Passport
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <main className="min-w-0 space-y-3">
          <section>
            <TokenHero token={token} mint={params.mint} />
          </section>

          <section className="xl:hidden">
            <h2 className="sr-only">Buy / Sell</h2>
            <TradePanel mint={params.mint} symbol={symbol} />
            <div className="mt-3">
              <BeforeYouBuyPanel mint={params.mint} />
            </div>
          </section>

          <section>
            <PriceChart mint={params.mint} />
          </section>

          <CompactTokenInfo token={token} mint={params.mint} />

          <section className="min-w-0 rounded-xl border border-white/[0.045] bg-[#100b22]/34 p-3">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="font-body text-base font-black text-white">Token Proof Workspace</h2>
                <p className="mt-1 text-xs font-body font-semibold leading-5 text-white/54">
                  Evidence, fees, social context, liquidity, and campaign proof in one review area.
                </p>
              </div>
              <Link
                href={`/passport/${params.mint}`}
                className="inline-flex min-h-[34px] items-center gap-2 rounded-md border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 text-xs font-mono font-bold text-[#69d99a] transition-colors hover:bg-[#00ff88]/12 hover:text-white"
              >
                Open Passport
                <ExternalLink size={13} />
              </Link>
            </div>

            <div className="min-w-0 space-y-2">
              <DetailSection title="Evidence checklist" subtitle="Bags, Solscan, DexScreener, Meteora proof rows">
                <EvidencePanel mint={params.mint} />
              </DetailSection>
              <DetailSection title="Fee Loop Evidence" subtitle="Generated, claimed, receipt, campaign proof">
                <FeeLoopEvidenceCard mint={params.mint} />
              </DetailSection>
              <DetailSection title="Trust Profile" subtitle="Score breakdown, source labels, and risk flags">
                <TrustProfileCard mint={params.mint} />
              </DetailSection>
              <DetailSection title="Fee reputation" subtitle="Creator fees, USDT estimate, and risk labels">
                <FeeReputationCard mint={params.mint} />
              </DetailSection>
              <DetailSection title="Social proof" subtitle="Token-linked posts, wallets, reactions, and spam risk">
                <SocialProofCard mint={params.mint} />
              </DetailSection>
              <DetailSection title="Milestones" subtitle="Completed and pending token proof milestones">
                <MilestonesCard mint={params.mint} />
              </DetailSection>
              <DetailSection title="Official updates" subtitle="Creator/admin posts attached to this token">
                <OfficialUpdates mint={params.mint} symbol={symbol} creatorWallet={token?.creatorWallet ?? null} />
              </DetailSection>
              <DetailSection title="Community context" subtitle="Recent token-linked community activity">
                <CommunityHoldersCard mint={params.mint} symbol={symbol} socialPosts={socialPosts} />
              </DetailSection>
              <DetailSection title="Liquidity" subtitle="Pool status, TVL, route, and market source">
                <LiquidityPanel mint={params.mint} symbol={symbol} />
              </DetailSection>
              <DetailSection title="USDT rewards" subtitle="Campaign budget planner and funding proof">
                <CampaignPlannerCard mint={params.mint} />
              </DetailSection>
            </div>
          </section>

        </main>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <section className="hidden xl:block">
            <h2 className="sr-only">Buy / Sell</h2>
            <TradePanel mint={params.mint} symbol={symbol} />
          </section>

          <section>
            <BeforeYouBuyPanel mint={params.mint} />
          </section>
        </aside>
      </div>
    </div>
  );
}
