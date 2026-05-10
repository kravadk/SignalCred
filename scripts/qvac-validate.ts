const BASE_URL = process.env.NEXT_PUBLIC_QVAC_COMPANION_URL || "http://127.0.0.1:8787";
const REQUIRED = process.env.QVAC_VALIDATE_REQUIRED === "true";

function fail(message: string): never {
  console.error(`[qvac-validate] ${message}`);
  process.exit(1);
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function main() {
  let health: Response;
  try {
    health = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
  } catch (error) {
    const message = `companion unavailable at ${BASE_URL}. Start it with npm run qvac:companion.`;
    if (REQUIRED) fail(message);
    console.warn(`[qvac-validate] ${message}`);
    process.exit(0);
  }

  if (!health.ok) fail(`health returned ${health.status}`);
  const healthBody = await health.json();
  if (!healthBody.ready) fail("health.ready is false");

  const passport = {
    mint: "8zAeGH7GbT7Pvig3n1tWTgmTi5XqYzeWHVUwfKfiBAGS",
    token: { name: "QVAC Smoke Token", symbol: "QVAC" },
    verdict: "warming",
    trustScore: 62,
    noFakeData: true,
    evidence: [
      { id: "bags-source", label: "Bags source", status: "verified", source: "bags_feed", value: "linked" },
      { id: "pool-proof", label: "Pool proof", status: "pending", source: "bags_pool", value: "warming" },
      { id: "fee-loop", label: "Fee loop", status: "pending", source: "fee_snapshots", value: "needs 24h baseline" },
    ],
    riskLabels: [{ label: "Pool proof pending", severity: "medium", evidenceIds: ["pool-proof"] }],
  };

  const analysis = await post("analyze/passport", { passport, question: "What should I inspect before trading?" });
  if (!analysis.res.ok) fail(`passport analysis returned ${analysis.res.status}`);
  const sourceEvidenceIds = analysis.json?.review?.sourceEvidenceIds ?? analysis.json?.sourceEvidenceIds;
  if (!Array.isArray(sourceEvidenceIds) || sourceEvidenceIds.length === 0) {
    fail("passport analysis did not return sourceEvidenceIds");
  }

  const emptyEvidence = await post("analyze/passport", {
    passport: { ...passport, evidence: [] },
  });
  if (emptyEvidence.res.status !== 400) fail("empty passport evidence was not rejected");

  const blocked = await post("analyze/passport", {
    passport,
    privateKey: "never-send-this",
  });
  if (blocked.res.status !== 400) fail("secret-shaped payload was not blocked");

  console.log("[qvac-validate] ok", {
    mode: healthBody.mode,
    sourceEvidenceIds,
  });
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
