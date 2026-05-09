"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import {
  BarChart3,
  Bookmark,
  Coins,
  Copy,
  ExternalLink,
  FileImage,
  Flag,
  Flame,
  Gift,
  Hash,
  Heart,
  Link2,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Repeat2,
  Rocket,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import type { Post, Token } from "@/db/schema";
import { cn, formatTimeAgo, shortWallet } from "@/lib/utils";
import { GatedOverlay } from "@/components/square/GatedOverlay";
import { bagsTokenUrl, ExplorerLink, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";
import { CampaignPlannerCard } from "@/components/token/CampaignPlannerCard";
import { MilestonesCard } from "@/components/token/MilestonesCard";
import { ProofRankedPostCard } from "@/components/square/ProofRankedPostCard";
import { SocialValidationPanel } from "@/components/square/SocialValidationPanel";
import { normalizeImageUrl as normalizeSharedImageUrl, proxiedImageUrl } from "@/lib/image-url";

type Tab = "for-you" | "following" | "official" | "signals";
type PostType = "update" | "analysis";

const MAX_POST_LENGTH = 320;
const MAX_POST_IMAGE_BYTES = 1_048_576;

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "for-you", label: "For You", icon: Flame },
  { id: "following", label: "Following", icon: Bookmark },
  { id: "official", label: "Official", icon: Trophy },
  { id: "signals", label: "Signals", icon: ShieldCheck },
];

const POST_TYPES: { id: PostType; label: string }[] = [
  { id: "update", label: "Update" },
  { id: "analysis", label: "Proof note" },
];

type SquareToken = Token & {
  price?: number | null;
  socialScore?: number;
};

type SquarePost = Post & {
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenImageUrl?: string | null;
};

type TokenMarket = {
  symbol: string;
  priceChange24hPercent: number | null;
  imageUrl?: string | null;
  name?: string | null;
};

type TokenProof = {
  socialScore: number | null;
  milestonesCompleted: number | null;
  milestonesTotal: number | null;
  campaignCount: number;
  campaignBudgetUsdt: number;
};

async function actionErrorMessage(res: Response | null, fallback: string) {
  if (!res) return fallback;
  const data = await res.json().catch(() => null);
  return typeof data?.userMessage === "string"
    ? data.userMessage
    : typeof data?.error === "string"
      ? data.error
      : fallback;
}

function avatarStyle(seed?: string | null) {
  const value = seed ?? "anon";
  const hue = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 78% 58%), hsl(${(hue + 48) % 360} 72% 46%))`,
  };
}

function normalizeImageUrl(value?: string | null) {
  return normalizeSharedImageUrl(value);
}

function identiconDataUri(seed?: string | null, label = "SC") {
  const value = seed || label || "SignalCred";
  const hue = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const letters = (label || value).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "SC";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="hsl(${hue},82%,58%)"/>
          <stop offset="1" stop-color="hsl(${(hue + 62) % 360},78%,42%)"/>
        </linearGradient>
        <filter id="s"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity=".35"/></filter>
      </defs>
      <rect width="96" height="96" rx="30" fill="url(#g)"/>
      <circle cx="72" cy="23" r="16" fill="rgba(255,255,255,.18)"/>
      <path d="M14 66 C27 43, 44 82, 58 54 S80 40, 86 28" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="6" stroke-linecap="round"/>
      <text x="48" y="57" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="900" fill="white" filter="url(#s)">${letters}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function RoundImage({
  src,
  alt,
  fallback,
  seed,
  className,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
  seed?: string | null;
  className: string;
}) {
  const [mode, setMode] = useState<"direct" | "proxy" | "failed">("direct");
  const directSrc = normalizeImageUrl(src);
  const proxySrc = proxiedImageUrl(src);
  const image = mode === "direct" ? directSrc : mode === "proxy" ? proxySrc : null;
  return (
    <img
      src={image ?? identiconDataUri(seed, fallback)}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setMode(mode === "direct" && proxySrc && proxySrc !== directSrc ? "proxy" : "failed")}
      className={cn("shrink-0 object-cover", className)}
    />
  );
}

function typeTone(type: string) {
  if (type === "launch") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (type === "analysis") return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  if (type === "trade") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (type === "meme") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatChange(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function firstLinkedMint(content: string, symbolToMint: Map<string, string>) {
  const matches = content.match(/\$[a-zA-Z0-9_]{2,12}/g) ?? [];
  for (const match of matches) {
    const mint = symbolToMint.get(match.slice(1).toUpperCase());
    if (mint) return mint;
  }
  return null;
}

function firstCashtag(content: string) {
  const match = content.match(/\$([a-zA-Z0-9_]{2,12})/);
  return match ? match[1].toUpperCase() : null;
}

function renderContent(content: string, symbolToMint: Map<string, string>) {
  return content.split(/(\s+)/).map((part, index) => {
    const cashtag = part.match(/^\$([a-zA-Z0-9_]{2,12})([.,!?;:]?)$/);
    if (cashtag) {
      const symbol = cashtag[1].toUpperCase();
      const mint = symbolToMint.get(symbol);
      const label = `$${cashtag[1]}`;
      const className = "font-bold text-[#f3ba2f] hover:text-[#ffd76a]";
      return mint ? (
        <span key={index}>
          <Link href={`/token/${mint}`} className={className}>{label}</Link>
          {cashtag[2]}
        </span>
      ) : (
        <span key={index} className="font-bold text-[#f3ba2f]">{part}</span>
      );
    }
    if (part.startsWith("#") && part.length > 1) {
      return <Link key={index} href={`/square?tag=${encodeURIComponent(part.slice(1))}`} className="font-semibold text-slate-500 hover:text-slate-300">{part}</Link>;
    }
    return <span key={index}>{part}</span>;
  });
}

function SquareRail() {
  const items = [
    { icon: Search, href: "/token", label: "Tokens" },
    { icon: Flame, href: "/square", label: "Square", active: true },
    { icon: Coins, href: "/fees", label: "Fees" },
    { icon: Rocket, href: "/launch", label: "Launch" },
    { icon: Trophy, href: "/hackathon", label: "Pitch" },
  ];

  return (
    <aside className="hidden xl:flex fixed left-0 top-0 z-20 h-screen w-[72px] flex-col items-center border-r border-white/8 bg-[#09090f]/92 backdrop-blur-xl">
      <Link href="/" className="mt-5 mb-7 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white shadow-sm">
        <Sparkles size={18} />
      </Link>
      <div className="flex flex-col gap-2">
        {items.map(({ icon: Icon, href, label, active }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-all",
              active ? "bg-white/10 text-white shadow-sm" : "text-white/45 hover:bg-white/8 hover:text-white"
            )}
          >
            <Icon size={18} />
          </Link>
        ))}
      </div>
    </aside>
  );
}

function PostComposer({
  onPost,
  symbolToMint,
  forcedTokenMint,
}: {
  onPost: () => void;
  symbolToMint: Map<string, string>;
  forcedTokenMint?: string | null;
}) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const fileRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("update");
  const [tokenMint, setTokenMint] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [postError, setPostError] = useState("");
  const [tokenHint, setTokenHint] = useState("");
  const [tokenCandidates, setTokenCandidates] = useState<SquareToken[]>([]);
  const [resolvingToken, setResolvingToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const remaining = MAX_POST_LENGTH - content.length;
  const overLimit = remaining < 0;

  useEffect(() => {
    if (forcedTokenMint) return;
    const query = (tokenMint.trim() || firstCashtag(content) || "").replace(/^\$/, "");
    if (query.length < 2 || isMint(query)) {
      setTokenCandidates([]);
      setTokenHint("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tokens?search=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setTokenCandidates(Array.isArray(data.tokens) ? data.tokens : []);
        setTokenHint(data.tokens?.length ? "Select an indexed Bags token below." : `No indexed Bags token found for $${query}.`);
      } catch {
        if (!controller.signal.aborted) setTokenHint("Token lookup failed. Paste the Bags mint directly.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [content, forcedTokenMint, tokenMint]);

  const lookupToken = async (query: string) => {
    const clean = query.trim().replace(/^\$/, "");
    if (!clean) return null;
    if (isMint(clean)) return clean;
    const local = symbolToMint.get(clean.toUpperCase());
    if (local) return local;
    setResolvingToken(true);
    try {
      const res = await fetch(`/api/tokens?search=${encodeURIComponent(clean)}&limit=10`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      const candidates: SquareToken[] = Array.isArray(data.tokens) ? data.tokens : [];
      setTokenCandidates(candidates);
      const exact = candidates.find((token) => token.symbol?.toUpperCase() === clean.toUpperCase());
      const mintMatch = candidates.find((token) => token.mint === clean);
      const chosen = exact ?? mintMatch ?? candidates[0] ?? null;
      return chosen?.mint ?? null;
    } finally {
      setResolvingToken(false);
    }
  };

  const resolveAttachedMint = async () => {
    if (forcedTokenMint) return forcedTokenMint;
    const manual = tokenMint.trim();
    if (manual) return lookupToken(manual);
    const inferredMint = firstLinkedMint(content, symbolToMint);
    if (inferredMint) return inferredMint;
    const tag = firstCashtag(content);
    if (tag) return lookupToken(tag);
    return null;
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setMediaError("");
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setMediaError("Image must be 1 MB or smaller.");
      return;
    }
    setMediaPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", "Post");
      fd.append("symbol", "POST");
      fd.append("description", "");
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.imageUrl) {
        setMediaUrl(data.imageUrl);
        setMediaPreview(data.imageUrl);
      } else {
        const dataUrl = await readFileAsDataUrl(file);
        setMediaUrl(dataUrl);
        setMediaPreview(dataUrl);
      }
    } catch {
      const dataUrl = await readFileAsDataUrl(file);
      setMediaUrl(dataUrl);
      setMediaPreview(dataUrl);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!publicKey) {
      console.info("[square-action]", { action: "post.create", type: "auth", status: "error", errorType: "wallet_missing" });
      setVisible(true);
      return;
    }
    if (!content.trim() || overLimit || uploading || (mediaPreview && !mediaUrl)) return;
    const attachedMint = await resolveAttachedMint();
    if (!attachedMint) {
      const tag = firstCashtag(content);
      const message = tag
        ? `No indexed Bags token found for $${tag}. Select a token suggestion or paste the Bags mint.`
        : "Attach an indexed Bags token by symbol, mint, or $cashtag before posting.";
      console.info("[square-action]", { action: "post.create", type: "validation", status: "error", errorType: "token_context_missing", tag });
      setPostError(message);
      setExpanded(true);
      return;
    }
    console.info("[square-action]", { action: "post.create", type: postType, status: "attempt", tokenMint: `${attachedMint.slice(0, 8)}...${attachedMint.slice(-5)}` });
    setPostError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({
          content,
          postType,
          tokenMint: attachedMint,
          mediaUrl: mediaUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[square-action]", {
          action: "post.create",
          type: postType,
          status: "error",
          errorType: body.error || "api_error",
          tokenMint: `${attachedMint.slice(0, 8)}...${attachedMint.slice(-5)}`,
        });
        setPostError(body.reason || body.error || "Post blocked until a valid Bags token is attached.");
        return;
      }
      const body = await res.json().catch(() => ({}));
      console.info("[square-action]", {
        action: "post.create",
        type: postType,
        status: "success",
        tokenMint: `${attachedMint.slice(0, 8)}...${attachedMint.slice(-5)}`,
        postId: body.post?.id,
      });
      setContent("");
      if (!forcedTokenMint) setTokenMint("");
      setMediaUrl("");
      setMediaPreview("");
      setTokenCandidates([]);
      setTokenHint("");
      setExpanded(false);
      onPost();
    } catch (error) {
      console.error("[square-action]", { action: "post.create", type: postType, status: "error", errorType: "network", message: String(error) });
      setPostError("Post failed because the network request failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-b border-white/[0.055] bg-[#0d1020] px-4 py-3">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={avatarStyle(publicKey?.toBase58())}>
          {publicKey ? publicKey.toBase58().slice(0, 2).toUpperCase() : "ML"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {POST_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setPostType(type.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  postType === type.id ? "bg-[#f54291] text-white" : "bg-white/8 text-white/45 hover:bg-white/12 hover:text-white"
                )}
              >
                {type.label}
              </button>
            ))}
            {forcedTokenMint && (
              <span className="ml-auto truncate rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-mono font-bold text-emerald-300">
                {forcedTokenMint.slice(0, 6)}...{forcedTokenMint.slice(-5)}
              </span>
            )}
          </div>
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (event.target.value) setExpanded(true);
            }}
            onFocus={() => {
              setExpanded(true);
              if (!publicKey) setVisible(true);
            }}
            rows={expanded ? 2 : 1}
            placeholder={publicKey ? "Share token proof, creator update, fee evidence, or milestone context..." : "Connect wallet to post token-linked proof..."}
            className="min-h-[40px] w-full resize-none rounded-lg border border-white/[0.055] bg-white/[0.035] px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/28 focus:border-[#b48dff]/35 focus:shadow-none"
          />

          {mediaPreview && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035]">
              <img src={mediaPreview} alt="Post attachment" className="max-h-[180px] w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="animate-spin text-white/65" size={18} />
                </div>
              )}
              <button
                onClick={() => {
                  setMediaPreview("");
                  setMediaUrl("");
                  setMediaError("");
                }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white/55 shadow-sm hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {mediaError && (
            <p className="mt-2 text-xs font-semibold text-rose-300">{mediaError}</p>
          )}

          {forcedTokenMint && expanded && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Attached Bags token</p>
                <p className="truncate font-mono text-xs font-semibold text-emerald-100">{forcedTokenMint}</p>
              </div>
              <Link href={`/token/${forcedTokenMint}`} className="shrink-0 text-xs font-black text-emerald-300 hover:text-white">
                Open
              </Link>
            </div>
          )}

          {!forcedTokenMint && expanded && (
            <input
              value={tokenMint}
              onChange={(event) => setTokenMint(event.target.value)}
              placeholder="Search Bags token by symbol/name, paste mint, or use a $cashtag"
              className="mt-2 h-9 w-full rounded-lg border border-white/[0.065] bg-white/[0.035] px-3 text-xs font-medium text-white outline-none placeholder:text-white/28 focus:border-[#b48dff]/35 focus:shadow-none"
            />
          )}
          {!forcedTokenMint && expanded && (tokenCandidates.length > 0 || tokenHint) && (
            <div className="mt-2 rounded-lg border border-white/[0.065] bg-white/[0.035] p-2">
              {tokenCandidates.length > 0 ? (
                <div className="grid gap-1">
                  {tokenCandidates.map((token) => (
                    <button
                      key={token.mint}
                      type="button"
                      onClick={() => {
                        setTokenMint(token.mint);
                        setTokenHint(`Attached $${token.symbol}`);
                        setPostError("");
                      }}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-white">${token.symbol}</span>
                        <span className="block truncate text-[11px] font-semibold text-white/38">{token.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-emerald-300">{token.mint.slice(0, 5)}...{token.mint.slice(-4)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-1 text-xs font-semibold text-amber-200">{tokenHint}</p>
              )}
              {tokenCandidates.length > 0 && tokenHint && (
                <p className="mt-1 px-2 text-[11px] font-semibold text-white/35">{tokenHint}</p>
              )}
            </div>
          )}
          {!forcedTokenMint && expanded && (
            <p className="mt-1.5 text-xs font-semibold text-white/35">
              Token-less posts do not enter Social Proof. Unknown cashtags stay blocked instead of creating fake context.
            </p>
          )}
          {postError && <p className="mt-1.5 text-xs font-bold text-rose-300">{postError}</p>}

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 hover:bg-white/8 hover:text-white"
              title="Attach image"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={17} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleImageFile(file);
              }}
            />
            <span className={cn("ml-auto text-xs font-semibold tabular-nums", overLimit ? "text-rose-300" : remaining < 40 ? "text-amber-300" : "text-white/35")}>
              {remaining}
            </span>
            <button
              onClick={submit}
              disabled={submitting || resolvingToken || uploading || !content.trim() || overLimit || Boolean(mediaPreview && !mediaUrl)}
              className="flex h-8 items-center gap-2 rounded-full bg-gradient-to-r from-[#f54291] to-[#8b5cf6] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/30"
            >
              {submitting || resolvingToken ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Post
            </button>
          </div>
        </div>
      </div>
      {!forcedTokenMint && <p className="sr-only">Attach an indexed Bags token</p>}
    </section>
  );
}

function TipButton({ post, wallet }: { post: Post; wallet: string | null }) {
  const { sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [done, setDone] = useState(false);

  const tip = async (amount: number) => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    if (!post.authorWallet || post.authorWallet === wallet) return;
    if (!sendTransaction) {
      setVisible(true);
      return;
    }
    setTipping(true);
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(wallet),
          toPubkey: new PublicKey(post.authorWallet),
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      );
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetch(`/api/posts/${post.id}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": wallet },
        body: JSON.stringify({ txSignature: signature, amount, currency: "SOL" }),
      });
      setDone(true);
      setOpen(false);
    } finally {
      setTipping(false);
    }
  };

  if (!post.authorWallet || post.authorWallet === wallet) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn("flex items-center gap-1.5 text-slate-500 transition hover:text-amber-600", done && "text-emerald-600")}
      >
        {tipping ? <Loader2 size={17} className="animate-spin" /> : <Coins size={17} />}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {[0.01, 0.05, 0.1].map((amount) => (
            <button
              key={amount}
              onClick={() => tip(amount)}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-100 hover:text-amber-700"
            >
              {amount}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyComposer({ postId, wallet, onSent }: { postId: string; wallet: string | null; onSent: () => void }) {
  const { setVisible } = useWalletModal();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    if (!text.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": wallet },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.userMessage ?? data.error ?? "Reply failed");
        return;
      }
      setText("");
      onSent();
    } catch {
      setError("Network error. Reply was not posted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full" style={avatarStyle(wallet)} />
        <input
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 200))}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Post a token-linked reply"
          className="h-10 flex-1 rounded-full border-0 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:shadow-none"
        />
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400 transition hover:bg-slate-950 hover:text-white disabled:hover:bg-slate-100 disabled:hover:text-slate-400"
        >
          {submitting ? "Sending" : "Reply"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>}
    </div>
  );
}

function PriceChangePill({ market, mint }: { market?: TokenMarket; mint: string }) {
  const change = formatChange(market?.priceChange24hPercent);
  if (!change || !market?.symbol) {
    return (
      <span className="inline-flex h-8 items-center rounded-full bg-white/10 px-3 text-xs font-black text-slate-400">
        ${market?.symbol || mint.slice(0, 4).toUpperCase()} 24h --
      </span>
    );
  }
  const positive = (market.priceChange24hPercent ?? 0) >= 0;
  return (
    <span className={cn(
      "inline-flex h-8 items-center rounded-full px-3 text-xs font-black tabular-nums",
      positive ? "bg-emerald-400/12 text-emerald-300" : "bg-rose-400/12 text-rose-300"
    )}>
      ${market.symbol} {change} 24h
    </span>
  );
}

function ProofBadges({ proof }: { proof?: TokenProof }) {
  if (!proof) {
    return (
      <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-black text-slate-400">
        proof loading
      </span>
    );
  }
  return (
    <>
      <span className="inline-flex h-8 items-center rounded-full bg-emerald-50 px-3 text-xs font-black text-emerald-700">
        social {proof.socialScore ?? "-"}
      </span>
      <span className="inline-flex h-8 items-center rounded-full bg-indigo-50 px-3 text-xs font-black text-indigo-700">
        milestones {proof.milestonesCompleted ?? "-"}/{proof.milestonesTotal ?? "-"}
      </span>
      <span className="inline-flex h-8 items-center rounded-full bg-[#26a17b]/10 px-3 text-xs font-black text-[#15865f]">
        campaigns {proof.campaignCount}{proof.campaignBudgetUsdt > 0 ? ` / $${proof.campaignBudgetUsdt.toLocaleString()}` : ""}
      </span>
    </>
  );
}

function PostCard({
  post,
  wallet,
  symbolToMint,
  market,
  proof,
  linkedMint,
}: {
  post: SquarePost;
  wallet: string | null;
  symbolToMint: Map<string, string>;
  market?: TokenMarket;
  proof?: TokenProof;
  linkedMint: string | null;
}) {
  const { signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const [reposted, setReposted] = useState(false);
  const [reposts, setReposts] = useState(post.repostsCount);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [showComments, setShowComments] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuNotice, setMenuNotice] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quotedPreview, setQuotedPreview] = useState<SquarePost | null>(null);
  const [comments, setComments] = useState<{ id: string; authorWallet: string; content: string }[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = post.authorUsername || (post.authorWallet ? shortWallet(post.authorWallet) : "anon");
  const tokenSymbol = market?.symbol || post.tokenSymbol || (linkedMint ? shortAddress(linkedMint) : "TOKEN");
  const tokenName = market?.name || post.tokenName || "Bags token";
  const tokenImage = post.tokenImageUrl || market?.imageUrl;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!wallet) return;
    fetch(`/api/posts/${post.id}/react`, { headers: { "x-wallet": wallet } })
      .then((res) => res.json())
      .then((data) => {
        const reactions = Array.isArray(data.reactions) ? data.reactions : [];
        setLiked(reactions.includes("like"));
        setReposted(reactions.includes("repost"));
        setBookmarked(reactions.includes("bookmark"));
      })
      .catch(() => {});
  }, [post.id, wallet]);

  useEffect(() => {
    if (!post.quotedPostId) return;
    fetch(`/api/posts/${post.id}`)
      .then((res) => res.json())
      .then((data) => setQuotedPreview(data.quotedPost ?? null))
      .catch(() => {});
  }, [post.id, post.quotedPostId]);

  const handleLike = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    const previousLiked = liked;
    setLiked((value) => !value);
    setLikes((value) => value + (liked ? -1 : 1));
    const res = await fetch(`/api/posts/${post.id}/react`, {
      method: "POST",
      headers: { "x-wallet": wallet, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "like" }),
    }).catch(() => null);
    if (!res?.ok) {
      setLiked(previousLiked);
      setLikes((value) => Math.max(0, value + (previousLiked ? 1 : -1)));
      showMenuNotice(await actionErrorMessage(res, "Like failed. Try again."));
    }
  };

  const handleRepost = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    const previousReposted = reposted;
    setReposted((value) => !value);
    setReposts((value) => value + (reposted ? -1 : 1));
    const res = await fetch(`/api/posts/${post.id}/react`, {
      method: "POST",
      headers: { "x-wallet": wallet, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "repost" }),
    }).catch(() => null);
    if (!res?.ok) {
      setReposted(previousReposted);
      setReposts((value) => Math.max(0, value + (previousReposted ? 1 : -1)));
      showMenuNotice(await actionErrorMessage(res, "Repost failed. Try again."));
    }
  };

  const handleBookmark = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    const previousBookmarked = bookmarked;
    setBookmarked((value) => !value);
    const res = await fetch(`/api/posts/${post.id}/react`, {
      method: "POST",
      headers: { "x-wallet": wallet, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "bookmark" }),
    }).catch(() => null);
    if (!res?.ok) {
      setBookmarked(previousBookmarked);
      showMenuNotice(await actionErrorMessage(res, "Bookmark failed. Try again."));
    }
  };

  const handleFollowCreator = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    if (!post.authorWallet || post.authorWallet === wallet) return;
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "x-wallet": wallet, "Content-Type": "application/json" },
      body: JSON.stringify({ following: post.authorWallet }),
    }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => ({})) : {};
    setMenuOpen(false);
    showMenuNotice(res?.ok ? (data.following === false ? "Creator unfollowed" : "Creator followed") : await actionErrorMessage(res, "Follow failed. Try again."));
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comment`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadComments();
  };

  const showMenuNotice = (message: string) => {
    setMenuNotice(message);
    window.setTimeout(() => setMenuNotice(""), 1600);
  };

  const postUrl = () => `${window.location.origin}/square/post/${post.id}`;

  const copyValue = async (value: string, message: string) => {
    await navigator.clipboard?.writeText(value).catch(() => {});
    setMenuOpen(false);
    showMenuNotice(message);
  };

  const copyPostLink = () => copyValue(postUrl(), "Post link copied");
  const copyPostText = () => copyValue(post.content, "Post text copied");
  const copyMint = () => {
    if (!linkedMint) return;
    copyValue(linkedMint, "Mint copied");
  };

  const shareProof = () => {
    const text = linkedMint
      ? `SignalCred proof note for ${shortAddress(linkedMint)}\n${post.content.slice(0, 180)}`
      : `SignalCred proof note\n${post.content.slice(0, 180)}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n\n${postUrl()}`)}`, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  };

  const submitQuote = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    if (!linkedMint || !quoteText.trim()) return;
    setQuoteSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "x-wallet": wallet, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: quoteText.trim(),
          postType: "quote",
          tokenMint: linkedMint,
          quotedPostId: post.id,
        }),
      });
      if (res.ok) {
        setQuoteOpen(false);
        setQuoteText("");
        showMenuNotice("Quote proof posted");
      } else {
        const data = await res.json().catch(() => ({}));
        showMenuNotice(data.error ?? "Quote failed");
      }
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const pinOfficialUpdate = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    if (!linkedMint || !signMessage) {
      showMenuNotice("Wallet signing unavailable");
      return;
    }
    const message = [
      "SignalCred wallet verification",
      `wallet:${wallet}`,
      "action:pin-post",
      `mint:${linkedMint}`,
      `timestamp:${Date.now()}`,
    ].join("|");
    const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));
    const res = await fetch(`/api/posts/${post.id}/pin`, {
      method: "POST",
      headers: {
        "x-wallet": wallet,
        "x-message": message,
        "x-signature": signature,
      },
    }).catch(() => null);
    setMenuOpen(false);
    showMenuNotice(res?.ok ? "Pinned official update" : "Pin blocked");
  };

  const markProofIssue = async () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    const res = await fetch(`/api/posts/${post.id}/review`, {
      method: "POST",
      headers: { "x-wallet": wallet, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "fake-proof" }),
    }).catch(() => {
      try {
        window.localStorage.setItem(`signalcred.square.review.${post.id}`, new Date().toISOString());
      } catch {}
      return null;
    });
    setMenuOpen(false);
    showMenuNotice(res?.ok ? "Marked for review" : await actionErrorMessage(res, "Review report failed. Try again."));
  };

  return (
    <article className="border-b border-slate-200 bg-white px-5 pt-4 pb-2 transition-colors hover:bg-slate-50/50">
      <div className="flex gap-3">
        <Link
          href={`/profile/${post.authorWallet}`}
          className="mt-0.5 block h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10"
        >
          <RoundImage
            src={post.authorAvatarUrl}
            alt={`${displayName} avatar`}
            fallback={displayName}
            seed={post.authorWallet}
            className="h-10 w-10 rounded-full"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <header className="mb-2 flex items-center gap-2">
            <Link href={`/profile/${post.authorWallet}`} className="font-bold text-slate-950 hover:underline">
              {displayName}
            </Link>
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1", typeTone(post.postType))}>
              {post.postType}
            </span>
            {post.pinnedForToken && (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                pinned
              </span>
            )}
            <span className="text-sm font-semibold text-slate-400">· {formatTimeAgo(post.createdAt)}</span>
            {menuNotice && <span className="ml-auto text-xs font-bold text-emerald-600">{menuNotice}</span>}
            <div ref={menuRef} className={cn("relative", !menuNotice && "ml-auto")}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Post actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={17} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-8 z-30 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm font-semibold text-slate-700 shadow-xl shadow-slate-950/15"
                >
                  <button type="button" role="menuitem" onClick={copyPostLink} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                    <Link2 size={15} /> Copy post link
                  </button>
                  <button type="button" role="menuitem" onClick={copyPostText} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                    <Copy size={15} /> Copy proof text
                  </button>
                  <Link role="menuitem" href={`/square/post/${post.id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                    <MessageCircle size={15} /> Open post detail
                  </Link>
                  <button type="button" role="menuitem" onClick={shareProof} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                    <Share2 size={15} /> Share proof on X
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setQuoteOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                    <Repeat2 size={15} /> Quote proof note
                  </button>
                  {post.authorWallet && post.authorWallet !== wallet && (
                    <button type="button" role="menuitem" onClick={handleFollowCreator} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                      <Bookmark size={15} /> Follow creator
                    </button>
                  )}
                  {linkedMint && (
                    <>
                      <div className="my-1 h-px bg-slate-100" />
                      {post.postType === "official" && (
                        <button type="button" role="menuitem" onClick={pinOfficialUpdate} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                          <ShieldCheck size={15} /> Pin official update
                        </button>
                      )}
                      <Link role="menuitem" href={`/token/${linkedMint}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                        <Hash size={15} /> Open token page
                      </Link>
                      <Link role="menuitem" href={`/passport/${linkedMint}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                        <ShieldCheck size={15} /> Open Trust Passport
                      </Link>
                      <button type="button" role="menuitem" onClick={copyMint} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                        <Copy size={15} /> Copy Bags mint
                      </button>
                      <a role="menuitem" href={solscanUrl(linkedMint, "token")} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                        <ExternalLink size={15} /> Open Solscan
                      </a>
                      <a role="menuitem" href={bagsTokenUrl(linkedMint)} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                        <ExternalLink size={15} /> Open Bags.fm
                      </a>
                    </>
                  )}
                  <div className="my-1 h-px bg-slate-100" />
                  <button type="button" role="menuitem" onClick={markProofIssue} className="flex w-full items-center gap-2 px-3 py-2 text-left text-amber-700 hover:bg-amber-50">
                    <Flag size={15} /> Mark proof issue
                  </button>
                </div>
              )}
            </div>
          </header>

          {linkedMint && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/token/${linkedMint}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                title={tokenName}
              >
                <RoundImage src={tokenImage} alt={`${tokenSymbol} logo`} fallback={tokenSymbol} seed={linkedMint} className="h-4 w-4 rounded-full" />
                ${tokenSymbol} <span className="text-slate-400">{shortAddress(linkedMint)}</span>
              </Link>
              <ExplorerLink
                href={solscanUrl(linkedMint, "token")}
                label="Solscan"
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              />
              <ExplorerLink
                href={bagsTokenUrl(linkedMint)}
                label="Bags.fm"
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              />
              {post.postType === "official" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  <ShieldCheck size={13} /> creator proof
                </span>
              )}
            </div>
          )}

          <div className="w-full max-w-none text-[15px] font-medium leading-7 text-slate-950">
            {post.gatedMint ? (
              <GatedOverlay gatedMint={post.gatedMint} gatedAmount={post.gatedAmount ?? 0}>
                <p>{renderContent(post.content, symbolToMint)}</p>
              </GatedOverlay>
            ) : (
              <p>{renderContent(post.content, symbolToMint)}</p>
            )}
          </div>

          {quotedPreview && (
            <Link href={`/square/post/${quotedPreview.id}`} className="mt-3 block w-full max-w-none rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                <Repeat2 size={14} /> Quoted proof by {shortWallet(quotedPreview.authorWallet ?? "anon")}
              </div>
              <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-800">{quotedPreview.content}</p>
            </Link>
          )}

          {quoteOpen && (
            <div className="mt-3 w-full max-w-none rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Quote proof note</p>
              <textarea
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value.slice(0, 320))}
                rows={2}
                placeholder="Add your token-linked context..."
                className="w-full resize-none rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{quoteText.length}/320</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setQuoteOpen(false)} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white">
                    Cancel
                  </button>
                  <button type="button" onClick={submitQuote} disabled={quoteSubmitting || !quoteText.trim()} className="rounded-full bg-slate-950 px-4 py-1.5 text-xs font-black text-white disabled:opacity-45">
                    {quoteSubmitting ? "Posting..." : "Quote"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {post.mediaUrl && (
            <div className="mt-4 w-full max-w-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img src={post.mediaUrl} alt="Post media" className="max-h-[520px] w-full object-cover" loading="lazy" />
            </div>
          )}

          <footer className="mt-2 grid w-full max-w-none grid-cols-[repeat(6,minmax(0,1fr))_auto] items-center gap-2 text-sm font-semibold text-slate-500">
            <button onClick={toggleComments} className="flex h-9 items-center justify-start gap-1.5 transition hover:text-indigo-600">
              <MessageCircle size={17} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>
            <button onClick={handleRepost} className={cn("flex h-9 items-center justify-start gap-1.5 transition hover:text-emerald-600", reposted && "text-emerald-600")}>
              <Repeat2 size={17} />
              {reposts > 0 && <span>{reposts}</span>}
            </button>
            <button onClick={handleLike} className={cn("flex h-9 items-center justify-start gap-1.5 transition hover:text-rose-600", liked && "text-rose-600")}>
              <Heart size={17} fill={liked ? "currentColor" : "none"} />
              {likes > 0 && <span>{likes}</span>}
            </button>
            <div className="flex h-9 items-center justify-start">
              <TipButton post={post} wallet={wallet} />
            </div>
            <button onClick={handleBookmark} className={cn("flex h-9 items-center justify-start transition hover:text-slate-950", bookmarked && "text-[#f3ba2f]")}>
              <Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button onClick={shareProof} className="flex h-9 items-center justify-start transition hover:text-indigo-600" title="Share proof">
              <Share2 size={17} />
            </button>
            {linkedMint && (
              <Link href={`/token/${linkedMint}`} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                Token page
              </Link>
            )}
          </footer>
          {linkedMint && (
            <div className="mt-3 flex w-full max-w-none flex-wrap items-center gap-2">
              <BarChart3 size={16} className="text-slate-500" />
              <PriceChangePill market={market} mint={linkedMint} />
              <ProofBadges proof={proof} />
            </div>
          )}
          {linkedMint && (
            <ProofRankedPostCard linkedMint={linkedMint} postType={post.postType} proof={proof} />
          )}

          {showComments && (
            <div className="mt-4 w-full max-w-none">
              <div className="space-y-3">
                {commentsLoading && <p className="text-sm font-semibold text-slate-400">Loading replies...</p>}
                {!commentsLoading && comments.length === 0 && (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                    No replies yet. Add token-linked context instead of generic chatter.
                  </p>
                )}
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full" style={avatarStyle(comment.authorWallet)} />
                    <div className="rounded-2xl bg-slate-100 px-4 py-2">
                      <p className="text-xs font-bold text-slate-500">{shortWallet(comment.authorWallet)}</p>
                      <p className="text-sm font-medium text-slate-900">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ReplyComposer
                postId={post.id}
                wallet={wallet}
                onSent={() => {
                  setCommentCount((value) => value + 1);
                  loadComments();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function FeedEmpty({ tab }: { tab: Tab }) {
  const copy = {
    "for-you": "No proof-ranked token activity yet. Start with a Bags token, not generic hype.",
    following: "No followed creator posts yet. Follow token creators from post actions.",
    official: "No verified creator/admin updates yet for this view.",
    signals: "No token signals yet. Launches, pinned official updates, and quote proof notes appear here.",
  }[tab];

  return (
    <div className="bg-white px-8 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <PenLine size={20} />
      </div>
      <p className="mx-auto max-w-sm text-sm font-semibold leading-6 text-slate-500">{copy}</p>
      <Link href="/launch" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
        Launch token
      </Link>
    </div>
  );
}

function TokenRequiredPanel({ label }: { label: string }) {
  return (
    <div className="bg-white px-8 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Search size={20} />
      </div>
      <p className="mx-auto max-w-sm text-sm font-semibold leading-6 text-slate-500">
        {label} is token-specific. Pick a Bags token first so the proof stays attached to a real mint.
      </p>
      <Link href="/token" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
        Open token index
      </Link>
    </div>
  );
}

function TokenSquarePanel({ tab, mint }: { tab: Tab; mint: string | null }) {
  if (tab !== "signals") return null;
  if (!mint) {
    return <TokenRequiredPanel label="Token signals" />;
  }
  return (
    <div className="grid gap-3 border-b border-slate-200 bg-[#07040f] p-4 xl:grid-cols-2">
      <MilestonesCard mint={mint} />
      <CampaignPlannerCard mint={mint} />
    </div>
  );
}

type SquareContext = {
  token?: { mint?: string; symbol?: string; name?: string; creatorWallet?: string | null };
  fees?: { lifetimeFeesSol?: number; feeVelocity24hSol?: number | null; feeVelocityStatus?: string };
  proof?: { bagsVerified?: boolean; poolVerified?: boolean; creatorVerified?: boolean };
  links?: { solscanMint?: string; bagsToken?: string };
};

function SquareTokenContext({ mint }: { mint: string }) {
  const [summary, setSummary] = useState<SquareContext | null>(null);
  const [socialScore, setSocialScore] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<{ completed: number; total: number } | null>(null);
  const [campaignBudget, setCampaignBudget] = useState<number>(0);
  const [pinnedOfficial, setPinnedOfficial] = useState<Post | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const [summaryRes, socialRes, milestonesRes, campaignsRes, officialRes] = await Promise.all([
        fetch(`/api/tokens/${mint}/summary`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
        fetch(`/api/tokens/${mint}/social-proof`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
        fetch(`/api/tokens/${mint}/milestones`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
        fetch(`/api/tokens/${mint}/campaigns`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
        fetch(`/api/posts?tab=official&limit=1&tokenMint=${mint}`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
      ]);
      if (controller.signal.aborted) return;
      if (summaryRes?.ok) setSummary(await summaryRes.json());
      if (socialRes?.ok) {
        const data = await socialRes.json();
        setSocialScore(typeof data.socialScore === "number" ? data.socialScore : null);
      }
      if (milestonesRes?.ok) {
        const data = await milestonesRes.json();
        setMilestones({
          completed: typeof data.completed === "number" ? data.completed : 0,
          total: typeof data.total === "number" ? data.total : 0,
        });
      }
      if (campaignsRes?.ok) {
        const data = await campaignsRes.json();
        const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
        setCampaignBudget(campaigns.reduce((sum: number, item: { budgetUsdt?: string | number }) => {
          const value = Number(item.budgetUsdt ?? 0);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0));
      }
      if (officialRes?.ok) {
        const data = await officialRes.json();
        setPinnedOfficial(Array.isArray(data.posts) && data.posts.length > 0 ? data.posts[0] : null);
      }
    }
    load().catch(() => {});
    return () => controller.abort();
  }, [mint]);

  const token = summary?.token;
  const proof = summary?.proof;
  const fees = summary?.fees;

  return (
    <section className="border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Token context</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-black text-slate-950">{token?.name ?? "Bags token"}</h2>
            <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-black text-white">
              ${token?.symbol ?? mint.slice(0, 4).toUpperCase()}
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-slate-500">
            Square is filtered to this Bags token. Posts here affect social proof only when they stay token-linked.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/token/${mint}`} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
            Token page
          </Link>
          <ExplorerLink
            href={solscanUrl(mint, "token")}
            label="Solscan"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:text-slate-950"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Social score</p>
          <p className="mt-1 font-mono text-lg font-black text-slate-950">{socialScore ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Milestones</p>
          <p className="mt-1 font-mono text-lg font-black text-slate-950">
            {milestones ? `${milestones.completed}/${milestones.total}` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Lifetime fees</p>
          <p className="mt-1 font-mono text-lg font-black text-emerald-600">
            {typeof fees?.lifetimeFeesSol === "number" ? `${fees.lifetimeFeesSol.toFixed(3)} SOL` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">USDT campaigns</p>
          <p className="mt-1 font-mono text-lg font-black text-indigo-600">
            {campaignBudget > 0 ? `$${campaignBudget.toLocaleString()}` : "planned"}
          </p>
        </div>
      </div>

      {pinnedOfficial && (
        <Link href={`/square/post/${pinnedOfficial.id}`} className="mt-3 block rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 hover:bg-emerald-100">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Pinned official creator update</p>
          <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-slate-900">{pinnedOfficial.content}</p>
        </Link>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["Bags", proof?.bagsVerified],
          ["Pool", proof?.poolVerified],
          ["Creator", proof?.creatorVerified],
          ["Velocity", fees?.feeVelocityStatus === "active"],
        ].map(([label, ok]) => (
          <span
            key={label as string}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-black",
              ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"
            )}
          >
            {label as string}: {ok ? "verified" : "pending"}
          </span>
        ))}
      </div>
    </section>
  );
}

function FeedSidebar() {
  const [trending, setTrending] = useState<{ mint: string; symbol: string; name: string; socialScore: number; imageUrl?: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/trending/tokens")
      .then((res) => res.json())
      .then((data) => setTrending(data.tokens?.slice(0, 5) ?? []))
      .catch(() => {});
  }, []);

  return (
    <aside className="sticky top-[76px] hidden max-h-[calc(100vh-92px)] w-[280px] shrink-0 space-y-3 overflow-hidden lg:block">
      <p className="sr-only">Token-linked posts only. Official updates require creator/admin proof. Campaigns and milestones must reference a real mint. No generic engagement farming in demo flow.</p>

      <section className="rounded-xl border border-white/[0.045] bg-white/[0.04] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
        <p className="mb-2 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-white/40">Tokens moving</p>
        {trending.length === 0 ? (
          <p className="text-sm font-medium text-white/45">No token activity yet.</p>
        ) : (
          <div className="space-y-2">
            {trending.map((token, index) => (
              <Link key={token.mint} href={`/token/${token.mint}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/7">
                <span className="w-5 text-xs font-black text-white/35">{index + 1}</span>
                <RoundImage src={token.imageUrl} alt={`${token.symbol} logo`} fallback={token.symbol} seed={token.mint} className="h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">${token.symbol}</p>
                  <p className="truncate text-xs font-semibold text-white/35">{token.name}</p>
                </div>
                <span className="text-xs font-black text-emerald-300">{token.socialScore}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

function FeedShell({ children, sidebar }: { children: React.ReactNode; sidebar: React.ReactNode }) {
  return (
    <div className="square-dark relative min-h-screen text-white">
      <div className="sr-only">
        <p>Social Finance</p>
        <p>Token Square</p>
        <h1>Token Social Proof</h1>
        <p>Only token-linked posts are ranked: creator updates, fee evidence, campaigns, and milestone proof.</p>
        <p>Social validation engine</p>
        <p>Token-linked posts only. Official updates require creator/admin proof. Campaigns and milestones must reference a real mint. No generic engagement farming in demo flow.</p>
      </div>
      <div className="mx-auto grid max-w-[1224px] gap-4 px-4 py-3 lg:grid-cols-[minmax(0,920px)_280px]">
        <main className="relative w-full overflow-hidden rounded-xl border border-white/[0.055] bg-[#101018]/92 shadow-[0_10px_30px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          {children}
        </main>
        {sidebar}
      </div>
    </div>
  );
}

function isMint(value: string | null | undefined) {
  return Boolean(value && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value));
}

export function Feed({ initialTokenMint = null }: { initialTokenMint?: string | null }) {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>("for-you");
  const [posts, setPosts] = useState<SquarePost[]>([]);
  const [tokens, setTokens] = useState<SquareToken[]>([]);
  const [tokenMarkets, setTokenMarkets] = useState<Record<string, TokenMarket>>({});
  const [tokenProofs, setTokenProofs] = useState<Record<string, TokenProof>>({});
  const [loading, setLoading] = useState(true);
  const [newPostCount, setNewPostCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const wallet = publicKey?.toBase58() ?? null;
  const tokenFilter = isMint(initialTokenMint) ? initialTokenMint : null;

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setNewPostCount(0);
    try {
      const apiTab = tab === "for-you" ? "trending" : tab;
      const params = new URLSearchParams({ tab: apiTab, limit: "20" });
      if (tokenFilter) params.set("tokenMint", tokenFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const url = `/api/posts?${params.toString()}`;
      const res = await fetch(url, {
        headers: tab === "following" && wallet ? { "x-wallet": wallet } : undefined,
      });
      const data = await res.json();
      setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }, [tab, tokenFilter, searchTerm, wallet]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    fetch("/api/tokens?limit=50")
      .then((res) => res.json())
      .then((data) => setTokens(data.tokens ?? []))
      .catch(() => {});
  }, []);

  const symbolToMint = useMemo(() => {
    const map = new Map<string, string>();
    for (const token of tokens) {
      if (token.symbol) map.set(token.symbol.toUpperCase(), token.mint);
    }
    return map;
  }, [tokens]);

  useEffect(() => {
    const mints = Array.from(
      new Set(
        posts
          .map((post) => post.tokenMint ?? firstLinkedMint(post.content, symbolToMint))
          .filter(Boolean)
      )
    ) as string[];
    const missing = mints.filter((mint) => !tokenMarkets[mint]);
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (mint) => {
        const res = await fetch(`/api/tokens/${mint}`).catch(() => null);
        if (!res?.ok) return null;
        const data = await res.json();
        const symbol = data.marketData?.symbol || data.token?.symbol || mint.slice(0, 4).toUpperCase();
        return {
          mint,
          market: {
            symbol,
            priceChange24hPercent:
              typeof data.marketData?.priceChange24hPercent === "number"
                ? data.marketData.priceChange24hPercent
                : null,
            imageUrl: data.token?.imageUrl || data.marketData?.logoURI || null,
            name: data.marketData?.name || data.token?.name || null,
          } satisfies TokenMarket,
        };
      })
    ).then((items) => {
      if (cancelled) return;
      const next: Record<string, TokenMarket> = {};
      for (const item of items) {
        if (item) next[item.mint] = item.market;
      }
      if (Object.keys(next).length > 0) {
        setTokenMarkets((current) => ({ ...current, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [posts, symbolToMint, tokenMarkets]);

  useEffect(() => {
    const mints = Array.from(
      new Set(
        posts
          .map((post) => post.tokenMint ?? firstLinkedMint(post.content, symbolToMint))
          .filter(Boolean)
      )
    ) as string[];
    const missing = mints.filter((mint) => !tokenProofs[mint]);
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (mint) => {
        const [socialRes, milestoneRes, campaignRes] = await Promise.all([
          fetch(`/api/tokens/${mint}/social-proof`).catch(() => null),
          fetch(`/api/tokens/${mint}/milestones`).catch(() => null),
          fetch(`/api/tokens/${mint}/campaigns`).catch(() => null),
        ]);
        const social = socialRes?.ok ? await socialRes.json().catch(() => ({})) : {};
        const milestones = milestoneRes?.ok ? await milestoneRes.json().catch(() => ({})) : {};
        const campaignsData = campaignRes?.ok ? await campaignRes.json().catch(() => ({})) : {};
        const campaigns = Array.isArray(campaignsData.campaigns) ? campaignsData.campaigns : [];
        const campaignBudgetUsdt = campaigns.reduce((sum: number, item: { budgetUsdt?: string | number }) => {
          const value = Number(item.budgetUsdt ?? 0);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0);
        return {
          mint,
          proof: {
            socialScore: typeof social.socialScore === "number" ? social.socialScore : null,
            milestonesCompleted: typeof milestones.completed === "number" ? milestones.completed : null,
            milestonesTotal: typeof milestones.total === "number" ? milestones.total : null,
            campaignCount: campaigns.length,
            campaignBudgetUsdt,
          } satisfies TokenProof,
        };
      })
    ).then((items) => {
      if (cancelled) return;
      const next: Record<string, TokenProof> = {};
      for (const item of items) next[item.mint] = item.proof;
      if (Object.keys(next).length > 0) {
        setTokenProofs((current) => ({ ...current, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [posts, symbolToMint, tokenProofs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const apiTab = tab === "for-you" ? "trending" : tab;
      const params = new URLSearchParams({ tab: apiTab, limit: "20" });
      if (tokenFilter) params.set("tokenMint", tokenFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const url = `/api/posts?${params.toString()}`;
      const res = await fetch(url, { headers: tab === "following" && wallet ? { "x-wallet": wallet } : undefined }).catch(() => null);
      if (!res) return;
      const data = await res.json();
      const fresh: SquarePost[] = data.posts ?? [];
      if (fresh.length > posts.length) setNewPostCount(fresh.length - posts.length);
    }, 18000);
    return () => clearInterval(interval);
  }, [posts.length, tab, tokenFilter, searchTerm, wallet]);

  const title = useMemo(() => TABS.find((item) => item.id === tab)?.label ?? "For you", [tab]);

  return (
    <FeedShell sidebar={<FeedSidebar />}>
      <header className="sticky top-0 z-10 border-b border-white/[0.055] bg-[#111421]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-3">
          <div>
            <h1 className="text-lg font-black tracking-[-0.02em] text-white">{title}</h1>
            <p className="text-sm font-semibold text-white/48">
              {tokenFilter ? "Filtered to one Bags token for judge-ready social proof." : "Only token-linked activity matters for Social Finance scoring"}
            </p>
          </div>
          <label className="ml-auto hidden h-9 min-w-[220px] items-center gap-2 rounded-full border border-white/[0.065] bg-white/[0.055] px-4 text-white/38 sm:flex">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search posts, wallets, tokens"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/38"
            />
          </label>
        </div>
        <nav className="flex gap-2 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition",
                tab === id ? "bg-gradient-to-r from-[#f54291] to-[#8b5cf6] text-white" : "bg-white/8 text-white/45 hover:bg-white/12 hover:text-white"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tokenFilter && <SquareTokenContext mint={tokenFilter} />}
      {tokenFilter && <SocialValidationPanel mint={tokenFilter} />}

      <PostComposer onPost={loadPosts} symbolToMint={symbolToMint} forcedTokenMint={tokenFilter} />

      <TokenSquarePanel tab={tab} mint={tokenFilter} />

      {newPostCount > 0 && (
        <button
          onClick={loadPosts}
          className="block w-full border-b border-slate-200 bg-indigo-50 px-5 py-3 text-center text-sm font-bold text-indigo-700 hover:bg-indigo-100"
        >
          {newPostCount} new post{newPostCount > 1 ? "s" : ""} available
        </button>
      )}

      {loading ? (
        <div className="space-y-0">
          {[0, 1, 2].map((item) => (
            <div key={item} className="border-b border-slate-200 px-5 py-6">
              <div className="mb-4 flex gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-32 rounded-full bg-slate-100" />
                  <div className="h-3 w-full rounded-full bg-slate-100" />
                  <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <FeedEmpty tab={tab} />
      ) : (
        <div>
          {posts.map((post) => {
              const linkedMint = post.tokenMint ?? firstLinkedMint(post.content, symbolToMint);
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  wallet={wallet}
                  symbolToMint={symbolToMint}
                  market={linkedMint ? tokenMarkets[linkedMint] : undefined}
                  proof={linkedMint ? tokenProofs[linkedMint] : undefined}
                  linkedMint={linkedMint}
                />
              );
            })}
        </div>
      )}
    </FeedShell>
  );
}
