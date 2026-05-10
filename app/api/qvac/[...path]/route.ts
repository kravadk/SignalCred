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

async function proxy(request: NextRequest, params: { path?: string[] }) {
  const path = (params.path ?? []).join("/");
  if (!ALLOWED_PATHS.has(path)) {
    return NextResponse.json({ error: "qvac_route_not_found", userMessage: "QVAC route is not available." }, { status: 404 });
  }

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

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
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
