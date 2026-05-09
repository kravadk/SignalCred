"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { CheckCircle2, ExternalLink, Gift, Loader2, Plus, ShieldCheck } from "lucide-react";
import bs58 from "bs58";

type Campaign = {
  id: string;
  creatorWallet: string;
  title: string;
  description?: string | null;
  budgetUsdt: string;
  status: string;
  fundingTxSignature?: string | null;
  fundingAsset?: string | null;
  createdAt: string;
};

type CampaignResponse = {
  campaigns: Campaign[];
  previewOnly: boolean;
  fundingProof?: {
    status: string;
    execution: string;
    asset: string;
    message: string;
  };
};

export function CampaignPlannerCard({ mint }: { mint: string }) {
  const { publicKey, signMessage } = useWallet();
  const [data, setData] = useState<CampaignResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("Top contributors reward");
  const [description, setDescription] = useState("Top community contributors split this planned USDT budget.");
  const [budgetUsdt, setBudgetUsdt] = useState("50");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/tokens/${mint}/campaigns`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData({ campaigns: [], previewOnly: true }));
  };

  useEffect(() => { load(); }, [mint]);

  const createCampaign = async () => {
    if (!publicKey || !signMessage) {
      setError("Connect wallet and sign to create a creator campaign.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const wallet = publicKey.toBase58();
      const message = [
        "SignalCred wallet verification",
        `wallet:${wallet}`,
        "action:create-campaign",
        `mint:${mint}`,
        `timestamp:${Date.now()}`,
      ].join("|");
      const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));
      const res = await fetch(`/api/tokens/${mint}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet": wallet,
          "x-message": message,
          "x-signature": signature,
        },
        body: JSON.stringify({ title, description, budgetUsdt: Number(budgetUsdt), status: "planned" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Campaign creation failed");
      setData((current) => ({
        campaigns: [json.campaign, ...(current?.campaigns ?? [])],
        previewOnly: true,
        fundingProof: json.fundingProof ?? current?.fundingProof,
      }));
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign creation failed");
    } finally {
      setSaving(false);
    }
  };

  const campaigns = data?.campaigns ?? [];

  return (
    <div className="card relative overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26a17b]/45 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-fun font-black text-white">USDT Campaign Budget</p>
          <p className="text-xs font-fun text-white/38">Creator reward planning, no automatic payout.</p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-[#26a17b]/22 bg-[#26a17b]/10 px-3 text-xs font-fun font-black text-[#50d8a4] hover:bg-[#26a17b]/14"
        >
          <Plus size={12} />
          Plan
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-[#26a17b]/18 bg-[#26a17b]/8 px-3 py-2 text-[11px] font-fun leading-5 text-[#9df2d1]">
        {data?.fundingProof?.message ?? "Preview only - no transaction executed. Future versions can use wallet-signed SPL USDT transfers."}
        <span className="mt-1 block font-mono text-[10px] text-[#9df2d1]/70">
          {data?.fundingProof ? `${data.fundingProof.asset} / ${data.fundingProof.execution}` : "USDT-SPL / none"}
        </span>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 120))}
            className="input min-h-[42px] text-sm"
            placeholder="Campaign title"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 600))}
            className="input min-h-[76px] resize-none text-sm"
            placeholder="What contributors can earn"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="100000"
              value={budgetUsdt}
              onChange={(event) => setBudgetUsdt(event.target.value)}
              className="input min-h-[42px] flex-1 text-sm"
              placeholder="USDT budget"
            />
            <button
              onClick={createCampaign}
              disabled={saving}
              className="btn-primary min-h-[42px] px-4 text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
            </button>
          </div>
          {error && <p className="text-xs font-fun text-[#ff8a78]">{error}</p>}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-center">
          <Gift size={20} className="mx-auto mb-2 text-[#50d8a4]" />
          <p className="text-sm font-fun font-black text-white">No USDT campaign planned yet</p>
          <p className="mt-1 text-xs font-fun text-white/35">Creators can turn fee income into a stable reward budget.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-fun font-black text-white">{campaign.title}</p>
                  {campaign.description && <p className="mt-1 line-clamp-2 text-xs font-fun leading-5 text-white/38">{campaign.description}</p>}
                </div>
                <span className="shrink-0 rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-2.5 py-1 text-xs font-fun font-black text-[#50d8a4]">
                  {Number(campaign.budgetUsdt).toLocaleString()} USDT
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-fun font-black uppercase text-white/32">
                <CheckCircle2 size={12} className="text-[#50d8a4]" />
                {campaign.status}
                <ShieldCheck size={12} className="ml-auto text-[#50d8a4]" />
                creator verified required
              </div>
              {campaign.fundingTxSignature ? (
                <a
                  href={`https://solscan.io/tx/${campaign.fundingTxSignature}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#26a17b]/18 bg-[#26a17b]/8 px-2.5 py-1 text-[10px] font-fun font-black uppercase text-[#50d8a4]"
                >
                  <ExternalLink size={11} />
                  Funding proof on Solscan
                </a>
              ) : (
                <p className="mt-2 text-[10px] font-fun text-white/30">
                  Funding proof pending - planned budget only.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
