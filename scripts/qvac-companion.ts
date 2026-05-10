import http from "node:http";
import os from "node:os";

type EvidenceRow = {
  id?: string;
  label?: string;
  status?: string;
  source?: string;
  value?: string;
  explanation?: string;
  href?: string | null;
  evidenceUrl?: string | null;
};

type PassportPayload = {
  mint?: string;
  token?: { name?: string; symbol?: string };
  verdict?: string;
  trustScore?: number;
  evidence?: EvidenceRow[];
  riskLabels?: Array<{ label?: string; severity?: string; evidenceIds?: string[] }>;
  scoreBreakdown?: unknown;
  sourceLabels?: unknown;
  noFakeData?: true;
};

type QvacPrivacyMode = "qvac_private" | "qvac_demo" | "unavailable";

type QvacTrustReview = {
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

type ModelStatus = {
  status: "loading" | "loaded" | "disabled" | "error";
  modelId: string | null;
  source: string | null;
  error?: string;
};

type QvacSdk = typeof import("@qvac/sdk");

const HOST = process.env.QVAC_HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || process.env.QVAC_PORT || 8787);
const MOCK = process.env.QVAC_MOCK === "1" || process.env.QVAC_MOCK === "true";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const LLM_MODEL_TYPE = process.env.QVAC_LLM_MODEL_TYPE || "llm";
const EMBED_MODEL_TYPE = process.env.QVAC_EMBED_MODEL_TYPE || "embeddings";
const TRANSLATION_MODEL_TYPE = process.env.QVAC_TRANSLATION_MODEL_TYPE || "nmt";
const LLM_MODEL_SRC = process.env.QVAC_LLM_MODEL_SRC || "";
const EMBED_MODEL_SRC = process.env.QVAC_EMBED_MODEL_SRC || "";
const TRANSLATION_MODEL_SRC = process.env.QVAC_TRANSLATION_MODEL_SRC || "";

const modelStatus: {
  llm: ModelStatus;
  embeddings: ModelStatus;
  translation: ModelStatus;
} = {
  llm: { status: MOCK ? "disabled" : "loading", modelId: null, source: LLM_MODEL_SRC || "LLAMA_3_2_1B_INST_Q4_0" },
  embeddings: { status: EMBED_MODEL_SRC ? "loading" : "disabled", modelId: null, source: EMBED_MODEL_SRC || null },
  translation: { status: TRANSLATION_MODEL_SRC ? "loading" : "disabled", modelId: null, source: TRANSLATION_MODEL_SRC || null },
};

let qvacImport: Promise<QvacSdk | null> | null = null;
let bootstrapPromise: Promise<void> | null = null;

function qvac() {
  if (!qvacImport) {
    qvacImport = import("@qvac/sdk").catch((error) => {
      console.warn("[qvac-companion] QVAC SDK unavailable:", error instanceof Error ? error.message : String(error));
      return null;
    });
  }
  return qvacImport;
}

function cors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function containsSecretShape(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSecretShape);
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (/seed|secret|private.?key|mnemonic|rpc.?url|api.?key|password/i.test(key)) return true;
    return containsSecretShape(nested);
  });
}

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  if (Buffer.concat(chunks).length > 256_000) throw new Error("Payload too large");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function safePassport(input: unknown): PassportPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const row = input as PassportPayload;
  const evidence = Array.isArray(row.evidence) ? row.evidence : [];
  return {
    mint: typeof row.mint === "string" ? row.mint : undefined,
    token: row.token && typeof row.token === "object" ? {
      name: row.token.name,
      symbol: row.token.symbol,
    } : undefined,
    verdict: typeof row.verdict === "string" ? row.verdict : undefined,
    trustScore: Number.isFinite(Number(row.trustScore)) ? Number(row.trustScore) : undefined,
    evidence: evidence.slice(0, 60).map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      source: item.source,
      value: item.value,
      explanation: item.explanation,
      href: item.href ?? item.evidenceUrl ?? null,
    })),
    riskLabels: Array.isArray(row.riskLabels) ? row.riskLabels.slice(0, 16) : [],
    scoreBreakdown: row.scoreBreakdown,
    sourceLabels: row.sourceLabels,
    noFakeData: true,
  };
}

function mockReview(passport: PassportPayload, question?: string): QvacTrustReview {
  const evidence = passport.evidence ?? [];
  if (!evidence.length) throw new Error("Passport evidence is required");
  const verified = evidence.filter((row) => row.status === "verified" || row.status === "ok");
  const missing = evidence.filter((row) => row.status !== "verified" && row.status !== "ok");
  const highRisk = passport.riskLabels?.some((risk) => risk.severity === "high");
  const mediumRisk = passport.riskLabels?.some((risk) => risk.severity === "medium");
  const riskLevel = highRisk ? "high" : mediumRisk || missing.length > verified.length ? "medium" : "low";
  const symbol = passport.token?.symbol ? `$${passport.token.symbol}` : "this Bags token";

  return {
    summary: `${symbol} has a SignalCred score of ${passport.trustScore ?? "unknown"} with ${verified.length}/${evidence.length} proof rows verified. This demo review is grounded in passport evidence, not price prediction.`,
    riskLevel,
    riskExplanation: question
      ? `For "${question}", inspect ${missing.slice(0, 3).map((row) => row.label || row.id).join(", ") || "the verified proof rows"} before trusting the token.`
      : missing.length
        ? `Some proof is still pending: ${missing.slice(0, 4).map((row) => row.label || row.id).join(", ")}.`
        : "Core proof rows are verified; users should still review liquidity, fees, and external links before trading.",
    positiveSignals: verified.slice(0, 5).map((row) => `${row.label || row.id}: ${row.value || row.status}`),
    missingProof: missing.slice(0, 5).map((row) => `${row.label || row.id}: ${row.status || "pending"}`),
    nextChecks: [
      "Open Solscan/Bags links for the strongest proof rows.",
      "Check fee loop freshness and claim receipts.",
      "Review token-linked social proof instead of generic hype.",
    ],
    questionsToInspect: [
      "Is creator/admin proof verified?",
      "Are fee snapshots old enough for generated 24h fees?",
      "Do claim or funding receipts link to Solscan?",
    ],
    sourceEvidenceIds: evidence.slice(0, 8).map((row) => String(row.id || row.label)).filter(Boolean),
    privacyMode: "qvac_demo",
    notFinancialAdvice: true,
  };
}

function normalizeSourceEvidenceIds(ids: unknown, evidence: EvidenceRow[]) {
  const allowed = new Set(evidence.map((row) => String(row.id || row.label)).filter(Boolean));
  const rawIds = Array.isArray(ids) ? ids.map(String) : [];
  const filtered = rawIds.filter((id) => allowed.has(id));
  return filtered.length ? filtered.slice(0, 12) : evidence.slice(0, 6).map((row) => String(row.id || row.label)).filter(Boolean);
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 8) : [];
}

function validateReview(parsed: Partial<QvacTrustReview>, passport: PassportPayload): QvacTrustReview {
  const evidence = passport.evidence ?? [];
  const sourceEvidenceIds = normalizeSourceEvidenceIds(parsed.sourceEvidenceIds, evidence);
  if (!evidence.length || !sourceEvidenceIds.length) {
    throw new Error("qvac_response_not_grounded");
  }

  const riskLevel = parsed.riskLevel === "low" || parsed.riskLevel === "medium" || parsed.riskLevel === "high" || parsed.riskLevel === "unknown"
    ? parsed.riskLevel
    : "unknown";

  return {
    summary: String(parsed.summary || "QVAC reviewed this trust passport.").slice(0, 800),
    riskLevel,
    riskExplanation: String(parsed.riskExplanation || "Inspect the referenced evidence rows before trading.").slice(0, 800),
    positiveSignals: asStringArray(parsed.positiveSignals),
    missingProof: asStringArray(parsed.missingProof),
    nextChecks: asStringArray(parsed.nextChecks),
    questionsToInspect: asStringArray(parsed.questionsToInspect),
    sourceEvidenceIds,
    privacyMode: "qvac_private",
    notFinancialAdvice: true,
  };
}

async function loadOptionalModel(sdk: QvacSdk, key: "embeddings" | "translation", modelSrc: string, modelType: string) {
  if (!modelSrc) return;
  try {
    modelStatus[key].status = "loading";
    const modelId = await sdk.loadModel({ modelSrc, modelType });
    modelStatus[key] = { status: "loaded", modelId, source: modelSrc };
  } catch (error) {
    modelStatus[key] = {
      status: "error",
      modelId: null,
      source: modelSrc,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function ensureModels() {
  if (MOCK) return;
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const sdk = await qvac();
    if (!sdk) {
      modelStatus.llm = { ...modelStatus.llm, status: "error", error: "QVAC SDK unavailable" };
      return;
    }
    try {
      modelStatus.llm.status = "loading";
      const descriptor = LLM_MODEL_SRC || sdk.LLAMA_3_2_1B_INST_Q4_0;
      const modelId = await sdk.loadModel({
        modelSrc: descriptor,
        modelType: LLM_MODEL_SRC ? LLM_MODEL_TYPE : undefined,
        modelConfig: { ctx_size: Number(process.env.QVAC_LLM_CTX_SIZE || 4096) },
      });
      modelStatus.llm = { status: "loaded", modelId, source: LLM_MODEL_SRC || "LLAMA_3_2_1B_INST_Q4_0" };
      await Promise.all([
        loadOptionalModel(sdk, "embeddings", EMBED_MODEL_SRC, EMBED_MODEL_TYPE),
        loadOptionalModel(sdk, "translation", TRANSLATION_MODEL_SRC, TRANSLATION_MODEL_TYPE),
      ]);
    } catch (error) {
      modelStatus.llm = {
        status: "error",
        modelId: null,
        source: LLM_MODEL_SRC || "LLAMA_3_2_1B_INST_Q4_0",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })();
  return bootstrapPromise;
}

function requireLlmModel() {
  if (MOCK) return null;
  if (modelStatus.llm.status !== "loaded" || !modelStatus.llm.modelId) {
    const error = new Error("qvac_model_unavailable");
    error.name = "QVAC_MODEL_UNAVAILABLE";
    throw error;
  }
  return modelStatus.llm.modelId;
}

async function qvacJsonReview(passport: PassportPayload, instruction: string, question?: string): Promise<QvacTrustReview> {
  if (MOCK) return mockReview(passport, question);
  if (!passport.evidence?.length) throw new Error("Passport evidence is required");
  await ensureModels();
  const sdk = await qvac();
  if (!sdk) throw new Error("qvac_sdk_unavailable");
  const modelId = requireLlmModel();

  const prompt = `You are SignalCred's QVAC trust reviewer.
Use only the JSON evidence below. Do not make price predictions. Do not invent proof.
Return strict JSON with:
summary, riskLevel(low|medium|high|unknown), riskExplanation, positiveSignals[], missingProof[], nextChecks[], questionsToInspect[], sourceEvidenceIds[], notFinancialAdvice=true.
Every sourceEvidenceIds item must match an evidence id from the JSON.

Instruction: ${instruction}
Question: ${question || "none"}
Passport evidence JSON:
${JSON.stringify(passport).slice(0, 22000)}`;

  const run = sdk.completion({
    modelId,
    stream: false,
    responseFormat: { type: "json_object" },
    history: [{ role: "user", content: prompt }],
  });
  const final = await run.final;
  const text = final.content || final.raw?.fullText || "";
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text) as Partial<QvacTrustReview>;
  return validateReview(parsed, passport);
}

async function qvacSearch(passport: PassportPayload, question: string): Promise<QvacTrustReview> {
  if (MOCK) return mockReview(passport, question);
  if (!passport.evidence?.length) throw new Error("Passport evidence is required");
  await ensureModels();
  const sdk = await qvac();
  if (!sdk) throw new Error("qvac_sdk_unavailable");

  if (modelStatus.embeddings.status === "loaded" && modelStatus.embeddings.modelId) {
    const rows = passport.evidence ?? [];
    const query = await sdk.embed({ modelId: modelStatus.embeddings.modelId, text: question });
    const docs = await sdk.embed({
      modelId: modelStatus.embeddings.modelId,
      text: rows.map((row) => `${row.id} ${row.label} ${row.status} ${row.value} ${row.explanation}`),
    });
    const scores = docs.embedding.map((vector, index) => ({
      index,
      score: vector.reduce((sum, value, i) => sum + value * (query.embedding[i] ?? 0), 0),
    })).sort((a, b) => b.score - a.score);
    return {
      summary: `QVAC evidence search matched your question to: ${scores.slice(0, 3).map((item) => rows[item.index]?.label || rows[item.index]?.id).join(", ")}.`,
      riskLevel: "unknown",
      riskExplanation: "This is an evidence retrieval answer, not a trading recommendation.",
      positiveSignals: [],
      missingProof: [],
      nextChecks: ["Open the referenced proof rows and explorer links."],
      questionsToInspect: [],
      sourceEvidenceIds: scores.slice(0, 5).map((item) => String(rows[item.index]?.id || rows[item.index]?.label)).filter(Boolean),
      privacyMode: "qvac_private",
      notFinancialAdvice: true,
    };
  }

  return qvacJsonReview(passport, "Answer this evidence-search question and cite the most relevant evidence row IDs.", question);
}

async function qvacTranslate(text: string, to = "uk", from = "en") {
  if (!text.trim()) throw new Error("Text is required");
  if (MOCK) return textReview(`[${to}] ${text}`, "qvac_demo");
  await ensureModels();
  const sdk = await qvac();
  if (!sdk) throw new Error("qvac_sdk_unavailable");

  if (modelStatus.translation.status === "loaded" && modelStatus.translation.modelId) {
    const translated = sdk.translate({ modelId: modelStatus.translation.modelId, text: text.slice(0, 4000), from, to, stream: false });
    return textReview(await translated.text, "qvac_private");
  }

  const passport: PassportPayload = {
    token: { symbol: "TEXT" },
    trustScore: undefined,
    evidence: [{ id: "translation-source", label: "Translation source text", status: "verified", source: "qvac_input", value: text.slice(0, 120), explanation: text.slice(0, 1000) }],
    noFakeData: true,
  };
  const review = await qvacJsonReview(passport, `Translate this text from ${from} to ${to}. Return translated text as summary only.`, text.slice(0, 4000));
  return textReview(review.summary, "qvac_private");
}

function textReview(text: string, mode: QvacPrivacyMode): QvacTrustReview {
  return {
    summary: text,
    riskLevel: "unknown",
    riskExplanation: "Text output only; inspect source evidence before trading.",
    positiveSignals: [],
    missingProof: [],
    nextChecks: ["Compare translated text with original evidence rows."],
    questionsToInspect: [],
    sourceEvidenceIds: mode === "qvac_demo" ? [] : ["translation-source"],
    privacyMode: mode,
    notFinancialAdvice: true,
  };
}

function healthBody() {
  const productionMockBlocked = MOCK && IS_PRODUCTION && process.env.QVAC_ALLOW_PRODUCTION_MOCK !== "true";
  const realReady = modelStatus.llm.status === "loaded" && Boolean(modelStatus.llm.modelId);
  return {
    ready: productionMockBlocked ? false : MOCK || realReady,
    qvacAvailable: productionMockBlocked ? false : MOCK || realReady,
    mode: productionMockBlocked ? "unavailable" : MOCK ? "qvac_demo" : realReady ? "qvac_private" : "unavailable",
    modelId: modelStatus.llm.modelId,
    embeddingModelId: modelStatus.embeddings.modelId,
    translationModelId: modelStatus.translation.modelId,
    models: modelStatus,
    mockEnabled: MOCK,
    mockAllowed: !IS_PRODUCTION || process.env.QVAC_ALLOW_PRODUCTION_MOCK === "true",
    device: `${os.platform()} ${os.arch()} / ${os.cpus()?.[0]?.model ?? "CPU/GPU"}`,
    capabilities: ["QVAC LLM trust review", "evidence RAG", "translation", "no cloud fallback"],
    message: productionMockBlocked
      ? "QVAC mock mode is disabled for production demo."
      : MOCK
      ? "QVAC demo mode is enabled for smoke tests."
      : realReady
        ? "QVAC model loaded. Reviews use real QVAC inference."
        : "QVAC model is not ready.",
  };
}

async function route(req: http.IncomingMessage, res: http.ServerResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.end();
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      if (!MOCK) void ensureModels();
      const body = healthBody();
      return send(res, body.ready ? 200 : 503, body);
    }

    if (MOCK && IS_PRODUCTION && process.env.QVAC_ALLOW_PRODUCTION_MOCK !== "true") {
      return send(res, 503, { error: "qvac_mock_forbidden", userMessage: "QVAC mock mode is disabled for production demo." });
    }

    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
    const body = await readJson(req);
    if (containsSecretShape(body)) {
      return send(res, 400, { error: "secret_payload_blocked", userMessage: "Do not send seeds, private keys, RPC URLs, or API keys to QVAC review." });
    }

    if (url.pathname === "/analyze/passport") {
      const passport = safePassport((body as { passport?: unknown }).passport);
      return send(res, 200, { review: await qvacJsonReview(passport, "Summarize this trust passport.", String((body as { question?: string }).question ?? "")) });
    }
    if (url.pathname === "/explain/before-buy") {
      const passport = safePassport((body as { passport?: unknown }).passport);
      return send(res, 200, { review: await qvacJsonReview(passport, "Explain what a user should inspect before trading.", String((body as { question?: string }).question ?? "")) });
    }
    if (url.pathname === "/search/proof") {
      const passport = safePassport((body as { passport?: unknown }).passport);
      return send(res, 200, { review: await qvacSearch(passport, String((body as { question?: string }).question ?? "")) });
    }
    if (url.pathname === "/translate") {
      const { text, to, from } = body as { text?: string; to?: string; from?: string };
      return send(res, 200, { review: await qvacTranslate(String(text ?? ""), to, from) });
    }
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QVAC request failed";
    const isModelError = error instanceof Error && (error.name === "QVAC_MODEL_UNAVAILABLE" || message.includes("qvac_model_unavailable"));
    return send(res, isModelError ? 503 : 400, {
      error: isModelError ? "qvac_model_unavailable" : "qvac_companion_error",
      userMessage: isModelError ? "QVAC model is not loaded yet. Try again after model readiness is green." : message,
    });
  }
}

http.createServer(route).listen(PORT, HOST, () => {
  console.log(`[qvac-companion] listening on http://${HOST}:${PORT}`);
  console.log(`[qvac-companion] mode=${MOCK ? "qvac_demo" : "qvac_private"} source=${modelStatus.llm.source}`);
  if (!MOCK) void ensureModels();
});
