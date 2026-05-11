import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_SERVICE_URL = "http://127.0.0.1:8787";
const ALLOWED_PATHS = new Set([
  "health",
  "analyze/passport",
  "explain/before-buy",
  "search/proof",
  "translate",
]);

function qvacServiceUrl() {
  return process.env.QVAC_SERVICE_URL
    || process.env.QVAC_COMPANION_URL
    || (process.env.NODE_ENV === "development" ? DEFAULT_SERVICE_URL : "");
}

function normalizeMode(mode: unknown) {
  if (mode === "local_qvac") return "qvac_private";
  if (mode === "local_mock") return "qvac_demo";
  if (mode === "offline") return "unavailable";
  return mode;
}

function normalizeBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  if (Array.isArray(body)) return body.map(normalizeBody);
  const row = body as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    next[key] = key === "mode" || key === "privacyMode" ? normalizeMode(value) : normalizeBody(value);
  }
  return next;
}

const MOCK_ENABLED = process.env.QVAC_MOCK === "true" || process.env.QVAC_MOCK === "1";

function buildMockReview(passport: Record<string, unknown>) {
  const evidence = Array.isArray(passport?.evidence)
    ? (passport.evidence as Array<{ id?: string; status?: string; label?: string }>)
    : [];
  const riskLabels = Array.isArray(passport?.riskLabels)
    ? (passport.riskLabels as Array<{ label?: string }>)
    : [];
  const verified = evidence.filter(r => r.status === "verified" || r.status === "ok");
  const missing  = evidence.filter(r => r.status !== "verified" && r.status !== "ok");
  const riskLevel = riskLabels.length > 2 ? "high"
    : missing.length > verified.length ? "medium" : "low";
  return {
    summary: verified.length > 0
      ? `${verified.length} of ${evidence.length} proof signals confirmed. ${missing.length > 0 ? `${missing.length} still warming or missing.` : "All indexed signals verified."}`
      : "No verified proof signals yet. Token is new or evidence is still being collected.",
    riskLevel,
    riskExplanation: riskLabels.length > 0
      ? `Risk flags: ${riskLabels.map(r => r.label).join(", ")}.`
      : "No critical risk flags detected in indexed evidence.",
    positiveSignals: verified.map(r => r.label || r.id || "verified signal").slice(0, 4),
    missingProof:   missing.map(r => r.label || r.id || "pending signal").slice(0, 4),
    nextChecks: [
      "Open Trust Passport for full evidence breakdown",
      "Check creator wallet on Solscan",
      "Verify pool proof on Meteora",
    ],
    questionsToInspect: [
      "Is the creator wallet known?",
      "Are fees real and claimed?",
      "Is social activity token-linked?",
    ],
    sourceEvidenceIds: verified.map(r => r.id).filter(Boolean) as string[],
    privacyMode: "qvac_demo" as const,
    notFinancialAdvice: true as const,
  };
}

function handleMock(path: string, bodyText: string): NextResponse | null {
  if (!MOCK_ENABLED) return null;

  if (path === "health") {
    return NextResponse.json({
      ready: true, qvacAvailable: true, mode: "qvac_demo",
      modelId: "LLAMA_3_2_1B_INST_Q4_0",
      embeddingModelId: null, translationModelId: null,
      device: "QVAC demo mode (judge preview)",
      capabilities: ["private trust review", "evidence search", "translation"],
      mockEnabled: true,
      message: "QVAC is in demo mode. Run npm run qvac:companion for real local inference.",
    });
  }

  if (path === "translate") {
    let text = "";
    try { text = (JSON.parse(bodyText) as { text?: string })?.text ?? ""; } catch { /* noop */ }
    return NextResponse.json({
      review: {
        summary: text,
        riskLevel: "unknown",
        riskExplanation: "Translation demo — real NMT model not loaded.",
        positiveSignals: [], missingProof: [], nextChecks: [],
        questionsToInspect: [], sourceEvidenceIds: [],
        privacyMode: "qvac_demo", notFinancialAdvice: true,
      },
    });
  }

  try {
    const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
    const passport = (body.passport ?? body) as Record<string, unknown>;
    return NextResponse.json({ review: buildMockReview(passport) });
  } catch {
    return NextResponse.json(
      { error: "invalid_passport", userMessage: "Could not parse passport for mock review." },
      { status: 400 }
    );
  }
}

async function proxy(request: NextRequest, params: { path?: string[] }) {
  const path = (params.path ?? []).join("/");
  if (!ALLOWED_PATHS.has(path)) {
    return NextResponse.json({ error: "qvac_route_not_found", userMessage: "QVAC route is not available." }, { status: 404 });
  }

  const bodyText = (request.method !== "GET" && request.method !== "HEAD")
    ? await request.text()
    : "";

  const mockResponse = handleMock(path, bodyText);
  if (mockResponse) return mockResponse;

  const baseUrl = qvacServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({
      ready: false,
      qvacAvailable: false,
      mode: "unavailable",
      modelId: null,
      embeddingModelId: null,
      translationModelId: null,
      device: "QVAC service not configured",
      capabilities: ["private trust review", "evidence search", "translation"],
      message: "QVAC review service is not configured for this deployment.",
    }, { status: path === "health" ? 200 : 503 });
  }

  const target = `${baseUrl.replace(/\/+$/, "")}/${path}`;
  const init: RequestInit = {
    method: request.method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  };

  if (bodyText) {
    init.body = bodyText;
  }

  try {
    const upstream = await fetch(target, init);
    const body = await upstream.json().catch(() => ({}));
    return NextResponse.json(normalizeBody(body), { status: upstream.status });
  } catch {
    return NextResponse.json({
      ready: false,
      qvacAvailable: false,
      mode: "unavailable",
      modelId: null,
      embeddingModelId: null,
      translationModelId: null,
      device: "QVAC service unreachable",
      capabilities: ["private trust review", "evidence search", "translation"],
      message: "QVAC review service is currently unavailable.",
    }, { status: path === "health" ? 200 : 503 });
  }
}

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxy(request, context.params);
}

export async function POST(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxy(request, context.params);
}
