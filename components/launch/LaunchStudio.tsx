"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import Link from "next/link";
import {
  Rocket, Sparkles, Settings2, Zap, CheckCircle2,
  Loader2, X, Copy, ExternalLink, RefreshCw, ChevronDown, ChevronUp,
  Upload, ImageIcon, Link as LinkIcon, Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExplorerLink, bagsTokenUrl, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";

/* ─── types ─────────────────────────────────────────── */
interface AIDraft {
  description: string;
  lore: string;
  launchPost: string;
  pitch: string;
  tags: string[];
  riskChecklist: string[];
}

interface LaunchStep {
  label: string;
  done: boolean;
}

type TabMode = "quick" | "ai" | "advanced";

/* ─── helpers ───────────────────────────────────────── */
function StepBadge({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 transition-all", active && "scale-105")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black font-fun shrink-0 transition-all",
        done
          ? "bg-[#26aa68] text-white shadow-[0_0_14px_rgba(38,170,104,0.6)]"
          : active
          ? "bg-white/20 text-white ring-2 ring-white/30"
          : "bg-white/8 text-white/30"
      )}>
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span className={cn(
        "text-xs font-fun font-semibold whitespace-nowrap",
        done ? "text-[#69d99a]" : active ? "text-white" : "text-white/30"
      )}>{label}</span>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#ff3d4f] text-white text-sm font-fun font-semibold shadow-2xl animate-pop max-w-sm w-full mx-4">
      <span className="flex-1">{message}</span>
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

function launchErrorMessage(error: unknown) {
  const raw = String(error instanceof Error ? error.message : error);
  if (/User rejected|Transaction was rejected|rejected the request|WalletSignTransactionError/i.test(raw)) {
    return "Launch cancelled in wallet. No token was created.";
  }
  if (/blockhash not found|TransactionExpired|timed out|timeout/i.test(raw)) {
    return "Network was slow. Refresh the launch transaction and try again.";
  }
  if (/insufficient|0x1|Attempt to debit/i.test(raw)) {
    return "Not enough SOL for launch and network fees. Add SOL and try again.";
  }
  if (/Bags API rejected|metadata/i.test(raw)) {
    return "Bags rejected the metadata. Check image URL, symbol, and required fields.";
  }
  if (/Launch verification failed|confirm/i.test(raw)) {
    return "Launch transaction was not verified yet. Check Solscan or retry confirmation.";
  }
  return raw.replace(/^Error:\s*/, "").slice(0, 180);
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/70"
    >
      {copied ? <CheckCircle2 size={13} className="text-[#69d99a]" /> : <Copy size={13} />}
    </button>
  );
}

/* ─── main component ─────────────────────────────────── */
export function LaunchStudio() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [tab, setTab] = useState<TabMode>("quick");
  const [showSocial, setShowSocial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [initialBuy, setInitialBuy] = useState("0.1");

  // Image upload
  const [imageMode, setImageMode] = useState<"url" | "file">("file");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedMint, setUploadedMint] = useState<string>("");
  const [uploadedMetadata, setUploadedMetadata] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);

  // AI
  const [aiDraft, setAiDraft] = useState<AIDraft | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [launchPost, setLaunchPost] = useState("");

  // launch state
  const [launching, setLaunching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [steps, setSteps] = useState<LaunchStep[]>([
    { label: "Metadata", done: false },
    { label: "Fee Config", done: false },
    { label: "Wallet Sign", done: false },
    { label: "Verified Live", done: false },
  ]);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(-1);

  // supply display
  const [displaySupply, setDisplaySupply] = useState(1_000_000_000);

  // advanced new fields
  const [whitepaperUrl, setWhitepaperUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [teamWallets, setTeamWallets] = useState<string[]>([]);

  // stats
  const [launchedCount, setLaunchedCount] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/trending/tokens")
      .then((r) => r.json())
      .then((d) => setLaunchedCount(d.tokens?.length ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/usdt/price").then(r => r.json()).then(d => setSolPrice(d.price ?? null));
  }, []);

  const setStep = (i: number) => {
    setActiveStep(i);
    setSteps((prev) => prev.map((s, idx) => ({ ...s, done: idx < i })));
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("File must be an image"); return; }
    if (file.size > 1_048_576) { setError("Image must be under 1 MB"); return; }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadedMint("");
    setUploadedMetadata("");
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name || "Token");
      fd.append("symbol", symbol || "TKN");
      fd.append("description", description || "");

      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setImageUrl(data.imageUrl);
      setUploadedMint(data.tokenMint);
      setUploadedMetadata(data.metadataUrl);
      setImagePreview(data.imageUrl); // use Bags CDN URL
    } catch (e) {
      setError(`Upload failed: ${String(e).slice(0, 120)}`);
      setImagePreview(URL.createObjectURL(file)); // keep local preview
    } finally {
      setUploading(false);
    }
  }, [name, symbol, description]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const generateAI = useCallback(async () => {
    if (!name || !symbol) { setError("Enter name and symbol first"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/token-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiDraft(data.draft);
      setDescription(data.draft.description);
      setLaunchPost(data.draft.launchPost);
    } catch (e) {
      setError(launchErrorMessage(e));
    } finally {
      setAiLoading(false);
    }
  }, [name, symbol]);

  const handleLaunch = useCallback(async () => {
    if (!connected || !publicKey) { setVisible(true); return; }
    if (!name || !symbol || !imageUrl) {
      setError("Name, symbol, and image (URL or uploaded file) are required");
      return;
    }

    setLaunching(true);
    setSteps([
      { label: "Metadata", done: false },
      { label: "Fee Config", done: false },
      { label: "Wallet Sign", done: false },
      { label: "Verified Live", done: false },
    ]);
    setShowPreview(false);

    try {
      setActiveStep(0);
      const res = await fetch("/api/tokens/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({
          name, symbol, description, imageUrl, websiteUrl, twitterUrl, telegramUrl,
          initialBuyLamports: Math.floor(parseFloat(initialBuy) * 1e9),
          launchPost: launchPost || aiDraft?.launchPost,
          whitepaperUrl: whitepaperUrl || undefined,
          tags: selectedTags,
          teamWallets: teamWallets.filter(Boolean),
          // If image was pre-uploaded via Bags SDK, reuse mint+metadata (skips re-upload)
          ...(uploadedMint && uploadedMetadata
            ? { tokenMint: uploadedMint, metadataUrl: uploadedMetadata }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep(1);

      // Sign config transactions first (if any)
      const configTxs: string[] = data.configTxs ?? [];
      for (const txB64 of configTxs) {
        const tx = VersionedTransaction.deserialize(Buffer.from(txB64, "base64"));
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }

      setStep(2);

      // Sign the launch transaction
      const launchTx = VersionedTransaction.deserialize(Buffer.from(data.launchTx, "base64"));
      const sig = await sendTransaction(launchTx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setStep(3);

      // Server verifies the signed launch transaction on-chain before marking the token live.
      const confirmRes = await fetch("/api/tokens/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({
          mint: data.mint,
          txSignature: sig,
          launchPost: launchPost || aiDraft?.launchPost,
        }),
      });
      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) throw new Error(confirmData.error ?? "Launch verification failed");

      setStep(4);
      setMintAddress(data.mint);
      setLaunchedCount((c) => (c ?? 0) + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setLaunching(false);
    }
  }, [
    connected, publicKey, name, symbol, imageUrl, description, websiteUrl,
    twitterUrl, telegramUrl, initialBuy, launchPost, aiDraft, sendTransaction,
    connection, setVisible, whitepaperUrl, selectedTags, teamWallets,
    uploadedMint, uploadedMetadata,
  ]);

  // ── SUCCESS STATE ──────────────────────────────────────
  if (mintAddress) {
    const displayPost = launchPost || aiDraft?.launchPost || `🚀 $${symbol} is LIVE on Bags! Trade it now at signalcred.xyz/token/${mintAddress.slice(0, 8)}…`;
    return (
      <div className="py-10 px-4 animate-pop max-w-xl mx-auto">
        {/* Green glow header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#26aa68]/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_48px_rgba(38,170,104,0.5)]">
            <CheckCircle2 size={40} className="text-[#69d99a]" />
          </div>
          <h2 className="font-display text-5xl text-white mb-1">Token Live!</h2>
          <p className="text-white/50 font-fun text-sm">Your token is now on Solana via Bags</p>
        </div>

        {/* What was created — checklist */}
        <div className="card p-5 mb-5 space-y-3">
          <h3 className="font-display text-lg text-white">What was created</h3>
          <p className="text-xs font-fun leading-5 text-white/40">
            Official first post is creator-verified and published into Square after on-chain launch verification.
          </p>
          {[
            { icon: "🪙", label: "Token minted on Solana", detail: `${mintAddress.slice(0, 8)}…${mintAddress.slice(-6)}` },
            { icon: "💰", label: "Fee config active", detail: "creator + SignalCred claimers" },
            { icon: "📄", label: "Token page created", detail: `/token/${mintAddress.slice(0, 8)}…` },
            { icon: "📣", label: "Official first post published in Square", detail: "creator-verified after on-chain verification" },
          ].map(({ icon, label, detail }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-lg shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-fun font-bold">{label}</p>
                <p className="text-white/40 text-xs font-mono truncate">{detail}</p>
              </div>
              <CheckCircle2 size={14} className="text-[#69d99a] shrink-0" />
            </div>
          ))}
        </div>

        {/* Auto-generated launch post preview */}
        <div className="card p-4 mb-5 border border-[#26aa68]/20 bg-[#26aa68]/5">
          <p className="text-[#69d99a] text-xs font-fun font-black uppercase tracking-wider mb-2">📣 Official first post (creator-verified in Square)</p>
          <p className="text-white/80 text-sm font-body leading-relaxed">{displayPost}</p>
        </div>

        {/* Mint address */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/8 text-white/70 text-xs font-mono mb-6">
          <span className="text-white/30 shrink-0">mint:</span>
          <ExplorerLink
            href={solscanUrl(mintAddress, "token")}
            label={shortAddress(mintAddress)}
            className="flex-1 text-white/70"
          />
          <CopyBtn text={mintAddress} />
        </div>

        {/* Primary CTA — prominent green glow link to token page */}
        <Link
          href={`/token/${mintAddress}`}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 text-base font-fun font-black text-white mb-3 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95"
          style={{
            background: "linear-gradient(135deg, #26aa68, #1a8a52)",
            boxShadow: "0 0 32px rgba(38,170,104,0.55), 0 8px 24px rgba(38,170,104,0.3)",
          }}
        >
          <ExternalLink size={16} /> View Token Page →
        </Link>

        <div className="flex gap-3 flex-wrap justify-center">
          <ExplorerLink
            href={bagsTokenUrl(mintAddress)}
            label="Open on Bags.fm"
            className="btn-ghost h-11 px-6 rounded-btn text-sm font-fun font-bold"
          />
          <Link href="/square" className="btn-ghost h-11 px-6 rounded-btn flex items-center gap-2 text-sm font-fun font-bold">
            Open Square
          </Link>
          <button
            onClick={() => { setMintAddress(null); setName(""); setSymbol(""); setDescription(""); setImageUrl(""); setAiDraft(null); setLaunchPost(""); setSteps(s => s.map(x => ({...x, done: false}))); setActiveStep(-1); }}
            className="btn-ghost h-11 px-6 rounded-btn flex items-center gap-2 text-sm font-fun font-bold"
          >
            <RefreshCw size={14} /> Launch Another
          </button>
        </div>
      </div>
    );
  }

  const creatorAllocPct = initialBuy && parseFloat(initialBuy) > 0
    ? Math.min((parseFloat(initialBuy) / 85) * 100, 99).toFixed(2)
    : "0.00";

  return (
    <div>
      {error && <Toast message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div className="mb-3 rounded-[28px] border border-white/[0.055] bg-[#100b22]/82 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-fun font-bold uppercase tracking-[0.12em] text-[#69d99a]">Bags Launch Studio</p>
            <h1 className="font-display text-3xl font-black text-white">Launch Studio</h1>
            <p className="text-xs font-body text-white/52">
              Create a Bags token, verify the transaction, publish creator context, and start its trust passport.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-fun">
            <span className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/8 px-2 py-1 text-[#69d99a]">Bags SDK</span>
            <span className="rounded-lg border border-white/[0.055] bg-white/[0.04] px-2 py-1 text-white/52">Verified post</span>
            <span className="rounded-lg border border-white/[0.055] bg-white/[0.04] px-2 py-1 text-white/52">Fee proof</span>
          </div>
        </div>
      </div>

      {/* Step tracker */}
      <div className="mb-3 flex items-center gap-3 overflow-x-auto rounded-[24px] border border-white/[0.055] bg-[#100b22]/82 px-3 py-2 md:gap-5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <StepBadge n={i + 1} label={s.label} done={s.done} active={activeStep === i} />
            {i < steps.length - 1 && (
              <div className={cn("w-8 h-px shrink-0", s.done ? "bg-[#26aa68]" : "bg-white/10")} />
            )}
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="mb-3 flex w-fit gap-1 rounded-xl border border-white/[0.055] bg-[#100b22]/82 p-1">
        {([
          { id: "quick", label: "Quick Launch", icon: Zap },
          { id: "ai", label: "AI Assisted", icon: Sparkles },
          { id: "advanced", label: "Advanced", icon: Settings2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-fun font-bold transition-all",
              tab === id
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/50 hover:text-white/80"
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main form ── */}
        <div className="space-y-3">
          <div className="card p-4 space-y-4">
            <h3 className="font-display text-xl font-black text-white">Token Identity</h3>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Name</span>
                  <span className={cn("text-xs font-mono tabular-nums", name.length > 28 ? "text-[#ff6a84]" : name.length > 20 ? "text-[#ffb84d]" : "text-white/25")}>
                    {name.length}/32
                  </span>
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 32))}
                  placeholder="Founder Dust"
                  className="input"
                  maxLength={32}
                />
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Symbol</span>
                  <span className={cn("text-xs font-mono tabular-nums", symbol.length >= 10 ? "text-[#ff6a84]" : symbol.length >= 7 ? "text-[#ffb84d]" : "text-white/25")}>
                    {symbol.length}/10 · A-Z
                  </span>
                </div>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10))}
                  placeholder="DUST"
                  className="input"
                  maxLength={10}
                />
              </label>
            </div>

            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Description</span>
                <span className={cn("text-xs font-mono tabular-nums", description.length > 180 ? "text-[#ff6a84]" : description.length > 140 ? "text-[#ffb84d]" : "text-white/25")}>
                  {description.length}/200
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="The degen token that turns your bags into rockets…"
                rows={3}
                className="input resize-none py-3 leading-relaxed"
                maxLength={200}
              />
            </label>

            {/* Supply selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Display Supply</span>
                <span className="text-white/25 text-xs font-fun">Visual only — actual supply set by Bags protocol</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "100M", value: 100_000_000 },
                  { label: "500M", value: 500_000_000 },
                  { label: "1B", value: 1_000_000_000 },
                  { label: "10B", value: 10_000_000_000 },
                ].map(({ label, value }) => (
                  <button key={label} type="button"
                    onClick={() => setDisplaySupply(value)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-fun font-bold transition-all border",
                      displaySupply === value
                        ? "bg-[#7c3aed]/30 border-[#7c3aed]/60 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70"
                    )}
                  >{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-white/5 text-xs font-fun text-white/50">
                <span>Creator gets:</span>
                <span className="text-[#00ff88] font-bold">
                  {initialBuy && parseFloat(initialBuy) > 0
                    ? `~${creatorAllocPct}% of supply`
                    : "0% (no initial buy)"
                  }
                </span>
                <span className="ml-auto text-white/25">{(displaySupply / 1_000_000).toFixed(0)}M tokens shown</span>
              </div>
            </div>

            <label className="block">
              <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider block mb-1.5">Token Image</span>
                {/* Mode toggle */}
                <div className="flex gap-1 p-0.5 rounded-xl bg-white/8 w-fit mb-2">
                  {(["file", "url"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setImageMode(m)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-fun font-bold transition-all",
                        imageMode === m ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                      )}
                    >
                      {m === "file" ? <><Upload size={11} /> Upload File</> : <><LinkIcon size={11} /> URL</>}
                    </button>
                  ))}
                </div>

                {imageMode === "file" ? (
                  <div>
                    {/* Drag & Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("img-file-input")?.click()}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-[100px]",
                        dragOver
                          ? "border-[#9977e0] bg-[#7a55c6]/15"
                          : imagePreview
                          ? "border-[#26aa68]/40 bg-[#26aa68]/5"
                          : "border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/6"
                      )}
                    >
                      {imagePreview ? (
                        <div className="flex items-center gap-3 p-3 w-full">
                          <img src={imagePreview} alt="preview"
                            className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0" />
                          <div className="flex-1 min-w-0">
                            {uploading ? (
                              <div className="flex items-center gap-2 text-[#9977e0]">
                                <Loader2 size={13} className="animate-spin" />
                                <span className="text-xs font-fun">Uploading to Bags CDN…</span>
                              </div>
                            ) : uploadedMint ? (
                              <div>
                                <p className="text-[#69d99a] text-xs font-fun font-bold">✅ Uploaded to Bags CDN</p>
                                <p className="text-white/30 text-xs font-mono truncate">{imageUrl.slice(0, 40)}…</p>
                              </div>
                            ) : (
                              <p className="text-white/50 text-xs font-fun">Image selected</p>
                            )}
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(""); setImageUrl(""); setUploadedMint(""); setUploadedMetadata(""); }}
                              className="text-white/25 hover:text-[#ff6a84] text-xs font-fun mt-1 flex items-center gap-1 transition-colors"
                            >
                              <X size={10} /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                            {dragOver ? <Upload size={18} className="text-[#9977e0]" /> : <ImageIcon size={18} className="text-white/30" />}
                          </div>
                          <div className="text-center">
                            <p className="text-white/60 text-xs font-fun font-bold">
                              {dragOver ? "Drop image here" : "Click or drag image here"}
                            </p>
                            <p className="text-white/25 text-xs font-fun mt-0.5">PNG, JPG, GIF, WEBP · max 1 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                    <input id="img-file-input" type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  </div>
                ) : (
                  <div>
                    <input
                      value={imageUrl}
                      onChange={(e) => { setImageUrl(e.target.value); setUploadedMint(""); setUploadedMetadata(""); }}
                      placeholder="https://i.imgur.com/... or https://arweave.net/..."
                      className="input"
                    />
                    {imageUrl && (
                      <div className="flex items-center gap-3 mt-2">
                        <img src={imageUrl} alt="preview"
                          className="w-10 h-10 rounded-xl object-cover border border-white/10"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <p className="text-white/30 text-xs font-fun">Must be a publicly accessible direct image link</p>
                      </div>
                    )}
                  </div>
                )}
            </label>

            {/* Social links – always visible in advanced, toggle in quick */}
            {tab !== "quick" || showSocial ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Social Links</span>
                  {tab === "quick" && (
                    <button onClick={() => setShowSocial(false)} className="text-white/30 hover:text-white/60 transition-colors">
                      <ChevronUp size={14} />
                    </button>
                  )}
                </div>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://mytoken.xyz" className="input" />
                <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/mytoken" className="input" />
                <input value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="https://t.me/mytoken" className="input" />
              </div>
            ) : (
              <button
                onClick={() => setShowSocial(true)}
                className="flex items-center gap-1.5 text-white/40 text-xs font-fun hover:text-white/70 transition-colors"
              >
                <ChevronDown size={12} /> Add website, X, Telegram
              </button>
            )}
          </div>

          {/* AI Assisted panel */}
          {tab === "ai" && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-[#ff6a84]" /> AI Assistant
                </h3>
                <button
                  onClick={generateAI}
                  disabled={aiLoading || !name || !symbol}
                  className="btn-primary h-9 px-4 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {aiLoading ? "Generating…" : "Generate with AI"}
                </button>
              </div>

              {aiDraft && (
                <div className="space-y-3 animate-pop">
                  {/* Launch post */}
                  <div className="p-3 rounded-2xl bg-[#ff6a84]/10 border border-[#ff6a84]/20">
                    <span className="text-[#ff6a84] text-xs font-fun font-black uppercase tracking-wider block mb-1.5">Launch Post</span>
                    <textarea
                      value={launchPost || aiDraft.launchPost}
                      onChange={(e) => setLaunchPost(e.target.value)}
                      rows={2}
                      className="input text-sm resize-none py-2"
                    />
                  </div>

                  {/* Lore */}
                  <div className="p-3 rounded-2xl bg-[#7a55c6]/10 border border-[#7a55c6]/20">
                    <span className="text-[#7a55c6] text-xs font-fun font-black uppercase tracking-wider block mb-1.5">Lore</span>
                    <p className="text-white/70 text-xs leading-relaxed">{aiDraft.lore}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {aiDraft.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-xl bg-white/10 text-white/70 text-xs font-fun">#{tag}</span>
                    ))}
                  </div>

                  {/* Risk */}
                  <div className="p-3 rounded-2xl bg-[#ff624e]/10 border border-[#ff624e]/20">
                    <span className="text-[#ff624e] text-xs font-fun font-black uppercase tracking-wider block mb-1.5">Risk Checklist</span>
                    <ul className="space-y-1">
                      {aiDraft.riskChecklist.map((r) => (
                        <li key={r} className="text-white/60 text-xs flex items-start gap-1.5">
                          <span className="text-[#ff624e] mt-0.5">·</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!aiDraft && !aiLoading && (
                <p className="text-white/30 text-xs font-fun text-center py-4">
                  Enter name + symbol above, then click Generate
                </p>
              )}
            </div>
          )}

          {tab === "advanced" && (
            <div className="card p-5 space-y-4">
              <h3 className="font-display text-lg text-white">Advanced Settings</h3>

              {/* Whitepaper */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Whitepaper / Docs URL</span>
                  <span className="text-white/25 text-xs font-fun">(optional)</span>
                </div>
                <input value={whitepaperUrl} onChange={e => setWhitepaperUrl(e.target.value)}
                  placeholder="https://docs.mytoken.xyz or https://notion.so/..."
                  className="input text-sm" />
              </div>

              {/* Tags */}
              <div>
                <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider block mb-1.5">Tags</span>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["meme", "creator", "community", "ai", "gaming", "bags", "fees", "social"].map(tag => (
                    <button key={tag} type="button"
                      onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className={cn("px-2.5 py-1 rounded-xl text-xs font-fun font-bold transition-all border",
                        selectedTags.includes(tag)
                          ? "bg-[#7c3aed]/30 border-[#7c3aed]/60 text-[#b48dff]"
                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team wallets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider">Team Wallets</span>
                  <span className="text-white/25 text-xs font-fun">co-founders visible on token page</span>
                </div>
                <div className="space-y-1.5">
                  {teamWallets.map((w, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={w} onChange={e => setTeamWallets(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                        placeholder="Solana wallet address"
                        className="input flex-1 text-xs font-mono" />
                      <button type="button" onClick={() => setTeamWallets(prev => prev.filter((_, j) => j !== i))}
                        className="px-2 rounded-xl bg-[#ff3366]/20 text-[#ff3366] hover:bg-[#ff3366]/30 text-xs transition-all">✕</button>
                    </div>
                  ))}
                  {teamWallets.length < 4 && (
                    <button type="button" onClick={() => setTeamWallets(prev => [...prev, ""])}
                      className="text-[#7c3aed] text-xs font-fun hover:text-[#9977e0] transition-colors">
                      + Add team wallet
                    </button>
                  )}
                </div>
              </div>

              {/* Fee config info */}
              <div className="p-3 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-xs font-fun text-white/60 space-y-1">
                <p>✅ Fee share: <span className="text-[#00ff88]">creator + SignalCred claimers, BPS = 10,000</span></p>
                <p>✅ Token is marked live only after the signed launch tx is verified on-chain</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: buy + launch ── */}
        <div className="xl:sticky xl:top-24 space-y-3">
          {/* Initial buy */}
          <div className="card p-5 space-y-3">
            <h3 className="font-display text-lg text-white">Initial Buy</h3>
            <label className="block">
              <span className="text-white/50 text-xs font-fun font-bold uppercase tracking-wider block mb-1.5">SOL Amount</span>
              <div className="relative">
                <input
                  type="number"
                  value={initialBuy}
                  onChange={(e) => setInitialBuy(e.target.value)}
                  min="0"
                  step="0.01"
                  className="input pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-soft font-fun font-black text-sm">SOL</span>
              </div>
            </label>
            <div className="flex gap-1.5">
              {["0", "0.1", "0.5", "1"].map((v) => (
                <button
                  key={v}
                  onClick={() => setInitialBuy(v)}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs font-fun font-bold transition-all",
                    initialBuy === v
                      ? "bg-[#26aa68] text-white"
                      : "bg-white/8 text-white/50 hover:bg-white/15"
                  )}
                >{v === "0" ? "Skip" : `${v} SOL`}</button>
              ))}
            </div>
            {solPrice && parseFloat(initialBuy) > 0 && (
              <p className="text-white/40 text-xs font-mono text-center">
                ≈ ${(parseFloat(initialBuy) * solPrice).toFixed(2)} USDT
              </p>
            )}
            <p className="text-white/30 text-xs font-fun">Initial buy tokens go to your wallet on launch</p>
          </div>

          {/* Preview */}
          <div className="card p-5 space-y-3">
            <h3 className="font-display text-lg text-white">Preview</h3>
            <div className="rounded-2xl bg-white/5 p-3 space-y-1.5 text-xs font-fun">
              <div className="flex justify-between">
                <span className="text-white/40">Name</span>
                <span className="text-white font-bold">{name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Symbol</span>
                <span className="text-white font-bold">${symbol || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Initial Buy</span>
                <span className="text-white font-bold">{parseFloat(initialBuy) > 0 ? `${initialBuy} SOL` : "No buy"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Fee Share</span>
                <span className="text-[#69d99a] font-bold">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Network</span>
                <span className="text-white font-bold">Solana Mainnet</span>
              </div>
            </div>

            {/* Launch button */}
            {!connected ? (
              <button
                onClick={() => setVisible(true)}
                className="w-full h-12 rounded-2xl font-fun font-black text-white text-base transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8a5de2, #6f46c0)" }}
              >
                Connect Wallet to Launch
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={launching || !name || !symbol || !imageUrl}
                className="w-full h-12 rounded-2xl font-fun font-black text-white text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #ff5c61, #ff8b3f)",
                  boxShadow: launching ? "none" : "0 14px 28px rgba(255,92,97,0.35)",
                }}
              >
                {launching ? (
                  <><Loader2 size={16} className="animate-spin" /> Launching…</>
                ) : (
                  <><Rocket size={16} /> Launch Token</>
                )}
              </button>
            )}

            {solPrice && (
              <p className="text-white/25 text-xs font-fun text-center mt-1">
                Launch cost: ~0.025 SOL ≈ ${(0.025 * solPrice).toFixed(2)} USDT
              </p>
            )}
            {connected && publicKey && (
              <p className="text-center text-white/30 text-xs font-fun">
                Signing as {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-4)}
              </p>
            )}
          </div>

          {/* What happens next */}
          <div className="card p-4">
            <h3 className="text-white/60 text-xs font-fun font-black uppercase tracking-wider mb-3">Launch proof stack</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {["Meta", "Fees", "Sign", "Verify", "Post"].map((item, i) => (
                <div key={item} className="rounded-xl bg-white/6 border border-white/8 px-1.5 py-2 text-center">
                  <p className="text-[#ff624e] text-[10px] font-black font-mono">{i + 1}</p>
                  <p className="text-white/45 text-[9px] font-fun font-bold mt-0.5">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-white/52">
              The token page goes live only after Solana confirms the wallet-signed Bags launch transaction.
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/52">
              Then SignalCred links your launch update to that token so buyers can see it came from the creator flow.
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/52">
              Official first post is creator-verified in Square after the on-chain launch is confirmed.
            </p>
          </div>

          {/* Fee Share Config — mandatory step explanation */}
          <div className="hidden card p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7a55c6]/8 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7a55c6]/40 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-lg bg-[#7a55c6]/25 flex items-center justify-center">
                  <Coins size={11} className="text-[#b48dff]" />
                </div>
                <span className="text-white/70 text-xs font-fun font-bold uppercase tracking-wider">Fee Share Config</span>
                <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-[#b48dff] bg-[#7a55c6]/20">on-chain</span>
              </div>

              {/* What it does */}
              <p className="text-white/40 text-[10px] font-fun mb-3 leading-relaxed">
                <code className="text-[#b48dff]">createBagsFeeShareConfig()</code> deploys an on-chain Meteora config that routes 1% of every swap to up to 7 claimers. Set once at launch — immutable unless admin transfers ownership.
              </p>

              {/* Split bar */}
              <div className="flex h-2 rounded-full overflow-hidden mb-2">
                <div className="bg-[#7a55c6] transition-all" style={{ width: "50%" }} />
                <div className="bg-[#26aa68] transition-all" style={{ width: "50%" }} />
              </div>
              <div className="flex justify-between text-xs font-fun mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#7a55c6]" />
                  <span className="text-white/50">Creator <span className="text-white font-bold">0.5%</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#26aa68]" />
                  <span className="text-white/50">Platform <span className="text-white font-bold">0.5%</span></span>
                </div>
              </div>

              {/* Accrual mechanic */}
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-black/20 border border-white/8">
                <Zap size={10} className="text-[#ffb84d] shrink-0" />
                <span className="text-white/35 text-[10px] font-fun">Accrues on every swap · claimable anytime · no expiry</span>
              </div>
            </div>
          </div>

          {/* Bags SDK proof */}
          <div className="hidden card p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff624e]/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff624e]/30 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-lg bg-[#ff624e]/20 flex items-center justify-center">
                  <Zap size={11} className="text-[#ff624e]" />
                </div>
                <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">Bags SDK — Launch Flow</span>
              </div>
              <div className="space-y-2">
                {[
                  { n: "1", method: "createTokenInfoAndMetadata()", step: "Upload to IPFS", color: "#ff9a87" },
                  { n: "2", method: "createBagsFeeShareConfig()", step: "On-chain fee split", color: "#b48dff" },
                  { n: "3", method: "createLaunchTransaction()", step: "Sign · DBC launch", color: "#69d99a" },
                ].map(({ n, method, step, color }) => (
                  <div key={method} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/4 hover:bg-white/7 transition-all">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{ background: `${color}25`, color }}>{n}</span>
                    <code className="text-[10px] font-mono flex-1 truncate" style={{ color }}>{method}</code>
                    <span className="text-white/25 text-[10px] font-fun whitespace-nowrap">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#26aa68] animate-pulse" />
                  <span className="text-white/35 text-[10px] font-fun">Mainnet · @bagsfm/bags-sdk</span>
                </div>
                <span className="text-white/20 text-[9px] font-mono">DBC → DAMM V2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
