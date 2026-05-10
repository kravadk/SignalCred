import http from "node:http";
import os from "node:os";

type EvidenceRow = {
  id?: string;
  label?: string;
  status?: string;
  source?: string;
  value?: string;
  explanation?: string;
};

type PassportPayload = {
  mint?: string;
  token?: { name?: string; symbol?: string };
  verdict?: string;
  trustScore?: number;
  evidence?: EvidenceRow[];
  riskLabels?: Array<{ label?: string; severity?: string; evidenceIds?: string[] }>;
  noFakeData?: true;
};

type QvacTrustReview = {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  riskExplanation: string;
  positiveSignals: string[];
  missingProof: string[];
  nextChecks: string[];
  questionsToInspect: string[];
  sourceEvidenceIds: string[];
  privacyMode: "local_qvac" | "local_mock" | "offline";
  notFinancialAdvice: true;
};

const HOST = process.env.QVAC_HOST || "127.0.0.1";
const PORT = Number(process.env.QVAC_PORT || 8787);
const MOCK = process.env.QVAC_MOCK === "1" || process.env.QVAC_MOCK === "true";
const MODEL_ID = process.env.QVAC_LLM_MODEL_ID || "llama-3.2-1b-instruct";
const EMBED_MODEL_ID = process.env.QVAC_EMBED_MODEL_ID || "nomic-embed-text";
const TRANSLATION_MODEL_ID = process.env.QVAC_TRANSLATION_MODEL_ID || MODEL_ID;

let qvacImport: Promise<typeof import("@qvac/sdk") | null> | null = null;

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
    evidence: evidence.slice(0, 40).map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      source: item.source,
      value: item.value,
      explanation: item.explanation,
    })),
    riskLabels: Array.isArray(row.riskLabels) ? row.riskLabels.slice(0, 12) : [],
    noFakeData: true,
  };
}

function deterministicReview(passport: PassportPayload, mode: QvacTrustReview["privacyMode"], question?: string): QvacTrustReview {
  const evidence = passport.evidence ?? [];
  if (!evidence.length) throw new Error("Passport evidence is required");
  const verified = evidence.filter((row) => row.status === "verified" || row.status === "ok");
  const missing = evidence.filter((row) => row.status !== "verified" && row.status !== "ok");
  const highRisk = passport.riskLabels?.some((risk) => risk.severity === "high");
  const mediumRisk = passport.riskLabels?.some((risk) => risk.severity === "medium");
  const riskLevel = highRisk ? "high" : mediumRisk || missing.length > verified.length ? "medium" : "low";
  const symbol = passport.token?.symbol ? `$${passport.token.symbol}` : "this Bags token";

  return {
    summary: `${symbol} has a SignalCred score of ${passport.trustScore ?? "unknown"} with ${verified.length}/${evidence.length} proof rows verified. The local review is based only on passport evidence, not price prediction.`,
    riskLevel,
    riskExplanation: question
      ? `For "${question}", inspect ${missing.slice(0, 3).map((row) => row.label || row.id).join(", ") || "the verified proof rows"} before trusting the token.`
      : missing.length
        ? `Some proof is still missing or warming: ${missing.slice(0, 4).map((row) => row.label || row.id).join(", ")}.`
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
    privacyMode: mode,
    notFinancialAdvice: true,
  };
}

async function qvacJsonReview(passport: PassportPayload, instruction: string, question?: string): Promise<QvacTrustReview> {
  if (MOCK) return deterministicReview(passport, "local_mock", question);
  const sdk = await qvac();
  if (!sdk) return deterministicReview(passport, "offline", question);

  const prompt = `You are SignalCred's local QVAC trust reviewer.
Use only the JSON evidence below. Do not make price predictions. Do not invent proof.
Return strict JSON with:
summary, riskLevel(low|medium|high|unknown), riskExplanation, positiveSignals[], missingProof[], nextChecks[], questionsToInspect[], sourceEvidenceIds[], privacyMode="local_qvac", notFinancialAdvice=true.

Instruction: ${instruction}
Question: ${question || "none"}
Passport evidence JSON:
${JSON.stringify(passport).slice(0, 18000)}`;

  try {
    const run = sdk.completion({
      modelId: MODEL_ID,
      stream: false,
      responseFormat: { type: "json_object" },
      history: [{ role: "user", content: prompt }],
    });
    const final = await run.final;
    const text = final.content || final.raw?.fullText || "";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text) as QvacTrustReview;
    return { ...deterministicReview(passport, "local_qvac", question), ...parsed, privacyMode: "local_qvac", notFinancialAdvice: true };
  } catch (error) {
    console.warn("[qvac-companion] QVAC completion failed:", error instanceof Error ? error.message : String(error));
    return deterministicReview(passport, "offline", question);
  }
}

async function qvacSearch(passport: PassportPayload, question: string): Promise<QvacTrustReview> {
  const base = deterministicReview(passport, MOCK ? "local_mock" : "local_qvac", question);
  if (MOCK) return base;
  const sdk = await qvac();
  if (!sdk) return { ...base, privacyMode: "offline" };
  try {
    const rows = passport.evidence ?? [];
    const query = await sdk.embed({ modelId: EMBED_MODEL_ID, text: question });
    const docs = await sdk.embed({ modelId: EMBED_MODEL_ID, text: rows.map((row) => `${row.id} ${row.label} ${row.status} ${row.value} ${row.explanation}`) });
    const scores = docs.embedding.map((vector, index) => ({
      index,
      score: vector.reduce((sum, value, i) => sum + value * (query.embedding[i] ?? 0), 0),
    })).sort((a, b) => b.score - a.score);
    return {
      ...base,
      summary: `Local QVAC evidence search matched your question to: ${scores.slice(0, 3).map((item) => rows[item.index]?.label || rows[item.index]?.id).join(", ")}.`,
      sourceEvidenceIds: scores.slice(0, 5).map((item) => String(rows[item.index]?.id || rows[item.index]?.label)).filter(Boolean),
      privacyMode: "local_qvac",
    };
  } catch (error) {
    console.warn("[qvac-companion] QVAC embedding search failed:", error instanceof Error ? error.message : String(error));
    return { ...base, privacyMode: "offline" };
  }
}

async function qvacTranslate(text: string, to = "uk", from = "en") {
  if (!text.trim()) throw new Error("Text is required");
  if (MOCK) {
    return deterministicTextReview(`[${to}] ${text}`, "local_mock");
  }
  const sdk = await qvac();
  if (!sdk) return deterministicTextReview(text, "offline");
  try {
    const translated = sdk.translate({ modelId: TRANSLATION_MODEL_ID, text: text.slice(0, 4000), from, to, stream: false });
    return deterministicTextReview(await translated.text, "local_qvac");
  } catch (error) {
    console.warn("[qvac-companion] QVAC translation failed:", error instanceof Error ? error.message : String(error));
    return deterministicTextReview(text, "offline");
  }
}

function deterministicTextReview(text: string, mode: QvacTrustReview["privacyMode"]): QvacTrustReview {
  return {
    summary: text,
    riskLevel: "unknown",
    riskExplanation: "Translation/local text output only; inspect source evidence before trading.",
    positiveSignals: [],
    missingProof: [],
    nextChecks: ["Compare translated text with original evidence rows."],
    questionsToInspect: [],
    sourceEvidenceIds: [],
    privacyMode: mode,
    notFinancialAdvice: true,
  };
}

async function route(req: http.IncomingMessage, res: http.ServerResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.end();
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const sdk = await qvac();
      return send(res, 200, {
        ready: Boolean(MOCK || sdk),
        qvacAvailable: Boolean(sdk),
        mode: MOCK ? "local_mock" : sdk ? "local_qvac" : "offline",
        modelId: MODEL_ID,
        embeddingModelId: EMBED_MODEL_ID,
        translationModelId: TRANSLATION_MODEL_ID,
        device: `${os.platform()} ${os.arch()} / ${os.cpus()?.[0]?.model ?? "local CPU/GPU"}`,
        capabilities: ["local LLM", "evidence RAG", "offline translation", "no cloud fallback"],
        message: MOCK ? "QVAC companion mock mode for smoke tests." : sdk ? "QVAC SDK imported. Model calls run locally." : "QVAC SDK unavailable.",
      });
    }

    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
    const body = await readJson(req);
    if (containsSecretShape(body)) {
      return send(res, 400, { error: "secret_payload_blocked", userMessage: "Do not send seeds, private keys, RPC URLs, or API keys to the QVAC companion." });
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
    return send(res, 400, {
      error: "qvac_companion_error",
      userMessage: error instanceof Error ? error.message : "Local QVAC request failed",
    });
  }
}

http.createServer(route).listen(PORT, HOST, () => {
  console.log(`[qvac-companion] listening on http://${HOST}:${PORT}`);
  console.log(`[qvac-companion] mode=${MOCK ? "local_mock" : "local_qvac"} model=${MODEL_ID}`);
});
