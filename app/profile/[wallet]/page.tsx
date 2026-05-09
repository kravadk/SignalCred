"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, BadgeCheck, Camera, ChevronDown, ExternalLink, Gift, Loader2, MessageSquare, ReceiptText, Save, ShieldAlert, WalletCards, X } from "lucide-react";
import { formatLamports, shortWallet } from "@/lib/utils";
import { feeVelocitySubtitle, feeVelocityValue } from "@/lib/fee-velocity-display";
import { ExplorerLink, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";
import { CreatorTrustGraph } from "@/components/profile/CreatorTrustGraph";
import { CreatorTreasuryPanel } from "@/components/profile/CreatorTreasuryPanel";

type RiskFlag = { id: string; label: string; severity: "low" | "medium" | "high" };

type CreatorToken = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  lifetimeFeesLamports: number;
  lifetimeFeesUsdt: number;
  claimedFees24hLamports: number;
  claimedFees24hUsdt: number;
  feeVelocity24hLamports: number | null;
  feeVelocity24hUsdt: number | null;
  feeVelocityStatus: "active" | "pending" | "unavailable";
  socialScore: number;
  poolVerified: boolean;
  creatorProof: boolean;
  riskFlags: RiskFlag[];
};

type CreatorReputation = {
  creator: { wallet: string; solscan: string; verifiedTokenCount: number; username?: string | null; avatarUrl?: string | null; bio?: string | null };
  tokens: CreatorToken[];
  totals: {
    tokenCount: number;
    lifetimeFeesLamports: number;
    lifetimeFeesUsdt: number;
    claimedFees24hLamports: number;
    claimedFees24hUsdt: number;
    feeVelocity24hLamports: number;
    feeVelocity24hUsdt: number;
    socialScore: number;
    verifiedTokens: number;
    poolVerifiedTokens: number;
  };
  treasuryPlanner: {
    previewOnly: boolean;
    claimableEstimateLamports: number;
    defaultKeepSolPercent: number;
    defaultConvertUsdtPercent: number;
    defaultRewardsPercent: number;
  };
  riskFlags: RiskFlag[];
  officialUpdates?: Array<{
    id: string;
    content: string;
    postType: string;
    tokenMint?: string | null;
    likesCount: number;
    commentsCount: number;
    repostsCount: number;
    createdAt: string;
  }>;
  campaigns?: Array<{ id: string; title: string; description?: string | null; budgetUsdt: string; status: string; tokenMint: string; createdAt: string }>;
  campaignTotals?: { count: number; plannedBudgetUsdt: number };
  solPriceUsdt: number;
  usdtSource: string;
  usdtApproximate: boolean;
};

type CompactFeeLoop = {
  mint: string;
  lifetimeFeesLamports: number;
  claimedFees24hLamports: number;
  feeVelocity24hLamports: number | null;
  feeVelocityStatus: "active" | "pending" | "unavailable";
  campaigns: Array<{ id: string; status: string; budgetUsdt: number }>;
  fundingProofs: Array<{ id: string; href?: string | null }>;
  noFakeData: true;
};

function usd(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "~$0.00 USDT";
  if (n >= 1_000_000) return `~$${(n / 1_000_000).toFixed(2)}M USDT`;
  if (n >= 1_000) return `~$${(n / 1_000).toFixed(2)}K USDT`;
  return `~$${n.toFixed(2)} USDT`;
}

function riskClass(severity: RiskFlag["severity"]) {
  if (severity === "high") return "border-[#ff624e]/25 bg-[#ff624e]/10 text-[#ff9a87]";
  if (severity === "medium") return "border-[#ffb84d]/25 bg-[#ffb84d]/10 text-[#ffcc7a]";
  return "border-white/10 bg-white/6 text-white/45";
}

function normalizeImageUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${raw.slice("ipfs://".length)}`;
  if (raw.startsWith("ar://")) return `https://arweave.net/${raw.slice("ar://".length)}`;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:image/")) return raw;
  return null;
}

function TokenAvatar({ src, symbol }: { src?: string | null; symbol: string }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : normalizeImageUrl(src);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#7a55c6] to-[#ff6a84] text-xs font-black text-white">
      {image ? (
        <img src={image} alt={`${symbol} logo`} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        symbol.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

function ProfileImage({ src, wallet, className = "h-16 w-16 rounded-2xl" }: { src?: string | null; wallet: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : normalizeImageUrl(src);
  const label = shortWallet(wallet).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "SC";
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1adf91] via-[#34a8ff] to-[#8b5cf6] text-lg font-black text-white shadow-[0_0_24px_rgba(80,216,164,0.18)] ${className}`}>
      {image ? (
        <img src={image} alt="Creator avatar" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AvatarEditor({
  wallet,
  initialAvatarUrl,
  onSaved,
}: {
  wallet: string;
  initialAvatarUrl?: string | null;
  onSaved: (avatarUrl: string | null) => void;
}) {
  const { publicKey } = useWallet();
  const isOwner = publicKey?.toBase58() === wallet;
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl ?? "");
  }, [initialAvatarUrl]);

  if (!isOwner) {
    return (
      <p className="mt-3 max-w-xl rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs font-body font-semibold leading-5 text-white/38">
        {publicKey ? "Only this creator wallet can edit the profile avatar." : "Connect this creator wallet to edit the profile avatar."}
      </p>
    );
  }

  const saveAvatar = async (nextUrl = avatarUrl) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-wallet": wallet },
        body: JSON.stringify({ avatarUrl: nextUrl.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? "Avatar save failed");
        return;
      }
      onSaved(body.user?.avatarUrl ?? null);
      setAvatarUrl(body.user?.avatarUrl ?? "");
      setMessage("Avatar saved");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const uploadLocalAvatar = async (file: File | null) => {
    if (!file) return;
    setMessage("");
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setMessage("Use PNG, JPG, WEBP, or GIF.");
      return;
    }
    if (file.size > 140_000) {
      setMessage("Avatar must be under 140 KB for local profile storage.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setAvatarUrl(dataUrl);
    await saveAvatar(dataUrl);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[34px] items-center gap-2 rounded-md border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 text-xs font-body font-black text-[#69d99a] hover:bg-[#00ff88]/12"
      >
        <Camera size={14} />
        {open ? "Close avatar editor" : "Edit avatar"}
      </button>
      {open && (
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://... or small data:image avatar"
              className="min-h-[38px] min-w-0 flex-1 rounded-md border border-white/[0.07] bg-black/20 px-3 text-xs font-body font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#00ff88]/35"
            />
            <label className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.045] px-3 text-xs font-body font-black text-white/68 hover:bg-white/[0.07]">
              <Camera size={14} />
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLocalAvatar(event.target.files?.[0] ?? null)} />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAvatar()}
              className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md bg-white px-3 text-xs font-body font-black text-black disabled:opacity-50"
            >
              <Save size={14} />
              Save
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAvatar("")}
              className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-body font-black text-white/60 disabled:opacity-50"
            >
              <X size={14} />
              Clear
            </button>
          </div>
          {message && <p className="mt-2 text-xs font-body font-semibold text-white/48">{message}</p>}
        </div>
      )}
    </div>
  );
}

function ProfileDetailSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <details open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)} className="group min-w-0 overflow-visible rounded-lg border border-white/[0.05] bg-white/[0.018]">
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

export default function CreatorProfilePage({ params }: { params: { wallet: string } }) {
  const [data, setData] = useState<CreatorReputation | null>(null);
  const [feeLoops, setFeeLoops] = useState<CompactFeeLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/creators/${params.wallet}/reputation`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Creator reputation unavailable");
        setData(body);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "Creator reputation unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params.wallet]);

  useEffect(() => {
    if (!data?.tokens?.length) {
      setFeeLoops([]);
      return;
    }
    const controller = new AbortController();
    const recent = data.tokens.slice(0, 3);
    Promise.all(
      recent.map((token) =>
        fetch(`/api/tokens/${token.mint}/fee-loop`, { signal: controller.signal, cache: "no-store" })
          .then(async (res) => (res.ok ? (await res.json()) as CompactFeeLoop : null))
          .catch(() => null)
      )
    ).then((rows) => {
      if (!controller.signal.aborted) setFeeLoops(rows.filter((row): row is CompactFeeLoop => Boolean(row)));
    });
    return () => controller.abort();
  }, [data]);

  if (loading) {
    return (
      <div className="focus-shell flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-white/30" />
          <p className="mt-4 text-sm font-body font-black text-white/70">Creator Reliability Score</p>
          <p className="mt-2 text-sm font-body font-black text-white/60">USDT Creator Treasury</p>
          <p className="mt-4 text-sm font-body font-black text-white/45">Recent Fee Loop Evidence</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="focus-shell">
        <Link href="/fees" className="btn-ghost mb-5 inline-flex min-h-[40px] items-center gap-2 px-4 text-sm">
          <ArrowLeft size={15} /> Reputation hub
        </Link>
        <div className="card p-8 text-center">
          <ShieldAlert size={34} className="mx-auto mb-3 text-[#ff624e]" />
          <p className="font-body font-bold text-white">{error || "Creator reputation unavailable"}</p>
        </div>
      </div>
    );
  }

  const avatarUrl = avatarOverride ?? data.creator.avatarUrl ?? null;
  const displayName = data.creator.username || shortWallet(data.creator.wallet);

  return (
    <div className="focus-shell">
      <Link href="/fees" className="btn-ghost mb-3 inline-flex min-h-[34px] items-center gap-2 px-3 text-xs">
        <ArrowLeft size={15} /> Reputation hub
      </Link>

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-4">
          <div className="mb-4 flex flex-wrap items-start gap-4">
            <ProfileImage src={avatarUrl} wallet={data.creator.wallet} />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="track-pill border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00ff88]">
                  <BadgeCheck size={13} /> Creator reputation
                </span>
                {data.creator.username && (
                  <span className="rounded-md border border-white/8 bg-white/[0.045] px-2 py-1 text-[11px] font-body font-black text-white/50">
                    @{data.creator.username}
                  </span>
                )}
              </div>
              <h1 className="truncate font-body text-2xl font-black tracking-[-0.02em] text-white md:text-3xl">{displayName}</h1>
              {data.creator.bio && <p className="mt-2 max-w-3xl text-sm font-body font-semibold leading-6 text-white/52">{data.creator.bio}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-body font-semibold">
                <ExplorerLink href={data.creator.solscan} label={shortAddress(data.creator.wallet)} />
                <span className="text-white/35">{data.creator.verifiedTokenCount} verified token proofs</span>
                <span className="text-white/35">SOL ~= {data.solPriceUsdt.toFixed(2)} USDT</span>
              </div>
              <AvatarEditor wallet={data.creator.wallet} initialAvatarUrl={avatarUrl} onSaved={setAvatarOverride} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Lifetime fees", formatLamports(data.totals.lifetimeFeesLamports), usd(data.totals.lifetimeFeesUsdt)],
              ["Generated 24h", formatLamports(data.totals.feeVelocity24hLamports), usd(data.totals.feeVelocity24hUsdt)],
              ["Claimed 24h", formatLamports(data.totals.claimedFees24hLamports), usd(data.totals.claimedFees24hUsdt)],
              ["Social score", String(data.totals.socialScore), `${data.totals.tokenCount} indexed tokens`],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-lg border border-white/8 bg-white/5 p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-white/35">{label}</p>
                <p className="mt-1 truncate font-mono text-lg font-black text-white">{value}</p>
                <p className="mt-1 text-[11px] font-body font-semibold text-[#50d8a4]">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.riskFlags.length ? data.riskFlags.map((flag) => (
              <span key={flag.id} className={`rounded-xl border px-3 py-1.5 text-xs font-body font-bold ${riskClass(flag.severity)}`}>
                {flag.label}
              </span>
            )) : (
              <span className="rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1.5 text-xs font-body font-bold text-[#00ff88]">
                No major creator-level risk flags
              </span>
            )}
          </div>
        </section>

        <aside className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#50d8a4]">creator finance</p>
              <h2 className="mt-1 font-mono text-base font-black text-white">USDT Treasury</h2>
            </div>
            <WalletCards size={18} className="text-[#50d8a4]" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-white/[0.045] px-3 py-2">
              <span className="text-white/42">Planned campaigns</span>
              <span className="font-mono text-[#50d8a4]">{usd(data.campaignTotals?.plannedBudgetUsdt ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.045] px-3 py-2">
              <span className="text-white/42">Claimable estimate</span>
              <span className="font-mono text-white">{formatLamports(data.treasuryPlanner.claimableEstimateLamports)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.045] px-3 py-2">
              <span className="text-white/42">Mode</span>
              <span className="font-mono text-[#ffcc7a]">preview only</span>
            </div>
          </div>
          <p className="mt-3 rounded-md border border-white/[0.06] bg-white/[0.035] px-3 py-2 text-xs font-body font-semibold leading-5 text-white/42">
            Full treasury controls live below, same as token detail: compact summary first, deep tools on demand.
          </p>
        </aside>
      </div>

      <ProfileDetailSection title="Recent Fee Loop Evidence" subtitle="Generated fees, claimed fees, and campaign funding state." defaultOpen>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ReceiptText size={16} className="text-[#ffcc7a]" />
              <h2 className="font-mono text-base font-black text-white">Recent Fee Loop Evidence</h2>
            </div>
            <p className="text-xs font-body font-semibold leading-5 text-white/38">
              Compact proof across the latest creator tokens: generated fees, claimed fees, and campaign funding state.
            </p>
          </div>
          <span className="rounded-md border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-[11px] font-mono font-bold text-[#00ff88]">
            no fake data
          </span>
        </div>

        {data.tokens.length === 0 ? (
          <div className="rounded-lg border border-white/8 bg-white/[0.035] p-4 text-sm font-body font-semibold text-white/35">
            No indexed creator tokens yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {data.tokens.slice(0, 3).map((token) => {
              const loop = feeLoops.find((row) => row.mint === token.mint);
              const campaignState = loop
                ? loop.fundingProofs.length > 0
                  ? "funded proof"
                  : loop.campaigns.length > 0
                    ? "planned campaign"
                    : "no campaign"
                : "loading";
              return (
                <Link key={token.mint} href={`/token/${token.mint}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <TokenAvatar src={token.imageUrl} symbol={token.symbol} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-body font-black text-white">{token.name}</p>
                        <p className="truncate text-xs font-mono text-white/35">{token.symbol} - {shortAddress(token.mint)}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="shrink-0 text-white/25" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-body font-semibold text-white/38">Lifetime</span>
                      <span className="font-mono text-[#00ff88]">{formatLamports(loop?.lifetimeFeesLamports ?? token.lifetimeFeesLamports)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-body font-semibold text-white/38">Claimed 24h</span>
                      <span className="font-mono text-white">{formatLamports(loop?.claimedFees24hLamports ?? token.claimedFees24hLamports)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-body font-semibold text-white/38">Velocity</span>
                      <span className="font-body font-black text-[#ffcc7a]">
                        {feeVelocityValue(loop?.feeVelocityStatus ?? token.feeVelocityStatus, loop?.feeVelocity24hLamports ?? token.feeVelocity24hLamports)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-body font-semibold text-white/38">Campaign</span>
                      <span className="font-body font-black text-[#cdb6ff]">{campaignState}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ProfileDetailSection>

      <div className="mt-3 space-y-2">
        <ProfileDetailSection title="Recent Social Proof Activity" subtitle="Token-linked posts, updates, quotes, and reactions from this wallet." defaultOpen>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare size={16} className="text-[#cdb6ff]" />
                <h2 className="font-mono text-base font-black text-white">Recent Social Proof Activity</h2>
              </div>
              <p className="text-xs font-body font-semibold leading-5 text-white/38">
                These rows update from Square posts and keep the creator profile tied to real token context.
              </p>
            </div>
            <span className="rounded-md border border-[#b48dff]/20 bg-[#b48dff]/10 px-2 py-1 text-[11px] font-mono font-bold text-[#cdb6ff]">
              {data.officialUpdates?.length ?? 0} posts
            </span>
          </div>
          {!data.officialUpdates?.length ? (
            <div className="rounded-lg border border-white/8 bg-white/[0.035] p-4 text-sm font-body font-semibold text-white/35">
              No token-linked social proof posts from this wallet yet.
            </div>
          ) : (
            <div className="space-y-2">
              {data.officialUpdates.slice(0, 6).map((post) => (
                <Link key={post.id} href={post.tokenMint ? `/token/${post.tokenMint}` : `/square/post/${post.id}`} className="block rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.055]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-[10px] font-body font-black uppercase text-white/48">
                        {post.postType}
                      </span>
                      {post.tokenMint && (
                        <span className="truncate rounded-md border border-[#00ff88]/15 bg-[#00ff88]/8 px-2 py-1 text-[10px] font-mono font-bold text-[#69d99a]">
                          {shortAddress(post.tokenMint)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-body font-black text-white/28">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-body font-semibold leading-6 text-white/72">{post.content}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-body font-black text-white/36">
                    <span>{post.likesCount} likes</span>
                    <span>{post.repostsCount} reposts</span>
                    <span>{post.commentsCount} replies</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ProfileDetailSection>

        <ProfileDetailSection title="USDT Treasury Planner" subtitle="Stable creator economics and preview-only campaign budgeting.">
          <CreatorTreasuryPanel wallet={data.creator.wallet} />
        </ProfileDetailSection>

        <ProfileDetailSection title="Creator Trust Graph" subtitle="Creator history, linked wallets, suspicious patterns, and score breakdown.">
          <CreatorTrustGraph wallet={data.creator.wallet} />
        </ProfileDetailSection>

        <ProfileDetailSection title="USDT Campaign Budget" subtitle="Planned creator reward budgets tied to Bags tokens.">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Gift size={16} className="text-[#50d8a4]" />
                <h2 className="font-mono text-base font-black text-white">USDT Campaign Budget</h2>
              </div>
              <p className="text-xs font-body font-semibold leading-5 text-white/38">
                Planned creator reward budgets tied to Bags tokens. Preview only - no transaction executed.
              </p>
            </div>
            <span className="rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-3 py-1 text-sm font-body font-black text-[#50d8a4]">
              {usd(data.campaignTotals?.plannedBudgetUsdt ?? 0)}
            </span>
          </div>
          {!data.campaigns?.length ? (
            <div className="rounded-lg border border-white/8 bg-white/[0.035] p-4 text-sm font-body font-semibold text-white/35">
              No planned USDT reward campaigns yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.campaigns.map((campaign) => (
                <Link key={campaign.id} href={`/token/${campaign.tokenMint}`} className="rounded-xl border border-white/8 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-body font-black text-white">{campaign.title}</p>
                      <p className="mt-1 text-xs font-body font-semibold text-white/35">{shortAddress(campaign.tokenMint)}</p>
                    </div>
                    <span className="shrink-0 rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-2.5 py-1 text-xs font-body font-black text-[#50d8a4]">
                      {usd(Number(campaign.budgetUsdt))}
                    </span>
                  </div>
                  {campaign.description && <p className="mt-2 line-clamp-2 text-xs font-body font-semibold leading-5 text-white/38">{campaign.description}</p>}
                  <p className="mt-2 text-[10px] font-body font-black uppercase text-white/28">{campaign.status}</p>
                </Link>
              ))}
            </div>
          )}
        </ProfileDetailSection>

        <ProfileDetailSection title="Creator Tokens" subtitle="All indexed tokens for this creator with fees, velocity, and proof labels." defaultOpen>
          <div className="overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.015]">
            <div className="border-b border-white/8 px-4 py-3">
              <h2 className="font-mono text-base font-black text-white">Creator Tokens</h2>
              <p className="text-xs font-body font-semibold text-white/35">Fees are shown in SOL with approximate USDT stable value.</p>
            </div>
            {data.tokens.length === 0 ? (
              <div className="p-8 text-center text-sm font-body font-semibold text-white/35">No indexed creator tokens yet.</div>
            ) : data.tokens.map((token) => (
              <Link key={token.mint} href={`/token/${token.mint}`} className="grid grid-cols-1 gap-3 border-b border-white/5 px-5 py-4 transition-colors hover:bg-white/5 md:grid-cols-12 md:items-center">
                <div className="flex min-w-0 items-center gap-3 md:col-span-4">
                  <TokenAvatar src={token.imageUrl} symbol={token.symbol} />
                  <div className="min-w-0">
                    <p className="truncate font-body font-black text-white">{token.name}</p>
                    <p className="truncate text-xs font-mono text-white/35">{token.symbol} - {shortAddress(token.mint)}</p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-body font-black uppercase text-white/30">Lifetime</p>
                  <p className="font-mono text-[#00ff88]">{formatLamports(token.lifetimeFeesLamports)}</p>
                  <p className="text-xs font-body font-semibold text-[#50d8a4]">{usd(token.lifetimeFeesUsdt)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-body font-black uppercase text-white/30">Generated 24h</p>
                  <p className="font-mono text-[#ffcc7a]">{feeVelocityValue(token.feeVelocityStatus, token.feeVelocity24hLamports)}</p>
                  <p className="text-xs font-body font-semibold text-[#ffcc7a]">
                    {token.feeVelocity24hUsdt == null ? feeVelocitySubtitle(token.feeVelocityStatus) : usd(token.feeVelocity24hUsdt)}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-body font-black uppercase text-white/30">Claimed 24h</p>
                  <p className="font-mono text-white">{formatLamports(token.claimedFees24hLamports)}</p>
                  <p className="text-xs font-body font-semibold text-white/40">{usd(token.claimedFees24hUsdt)}</p>
                </div>
                <div className="flex flex-wrap justify-start gap-2 md:col-span-2 md:justify-end">
                  {token.creatorProof && <span className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-xs font-body font-semibold text-[#00ff88]">Creator proof</span>}
                  {token.poolVerified && <span className="rounded-lg border border-[#b48dff]/20 bg-[#b48dff]/10 px-2 py-1 text-xs font-body font-semibold text-[#cdb6ff]">Pool proof</span>}
                  <ExternalLink size={15} className="text-white/25" />
                </div>
              </Link>
            ))}
          </div>
        </ProfileDetailSection>
              </div>
    </div>
  );
}
