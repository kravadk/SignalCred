"use client";

import type { TokenPassportResponse } from "@/lib/trust-passport";

export type QvacPrivacyMode = "qvac_private" | "qvac_demo" | "unavailable";

export type QvacTrustReview = {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskExplanation: string;
  positiveSignals: string[];
  missingProof: string[];
  nextChecks: string[];
  questionsToInspect: string[];
  sourceEvidenceIds: string[];
  privacyMode: QvacPrivacyMode;
  notFinancialAdvice: true;
};

export type QvacHealth = {
  ready: boolean;
  qvacAvailable: boolean;
  mode: QvacPrivacyMode;
  modelId: string | null;
  embeddingModelId: string | null;
  translationModelId: string | null;
  models?: {
    llm?: { status: "loading" | "loaded" | "disabled" | "error"; modelId: string | null; source?: string; error?: string };
    embeddings?: { status: "loading" | "loaded" | "disabled" | "error"; modelId: string | null; source?: string; error?: string };
    translation?: { status: "loading" | "loaded" | "disabled" | "error"; modelId: string | null; source?: string; error?: string };
  };
  mockEnabled?: boolean;
  mockAllowed?: boolean;
  device: string;
  capabilities: string[];
  message: string;
};

type QvacRequest =
  | { endpoint: "analyze/passport"; passport: TokenPassportResponse; question?: string }
  | { endpoint: "explain/before-buy"; passport: TokenPassportResponse; question?: string }
  | { endpoint: "search/proof"; passport: TokenPassportResponse; question: string }
  | { endpoint: "translate"; text: string; to?: string; from?: string };

export const QVAC_API_BASE = "/api/qvac";

export async function getQvacHealth(signal?: AbortSignal): Promise<QvacHealth | null> {
  try {
    const res = await fetch(`${QVAC_API_BASE}/health`, { cache: "no-store", signal });
    if (!res.ok) return null;
    return (await res.json()) as QvacHealth;
  } catch {
    return null;
  }
}

export async function requestQvacReview(request: QvacRequest, signal?: AbortSignal): Promise<QvacTrustReview> {
  const { endpoint, ...payload } = request;
  const res = await fetch(`${QVAC_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.userMessage || body.error || "QVAC review is unavailable right now");
  }
  return body.review ?? body;
}
