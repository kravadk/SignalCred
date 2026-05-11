/**
 * Smoke test — run with: npx tsx scripts/smoke-test.ts
 * Tests all public endpoints against a running server.
 */

const BASE = process.env.TEST_URL || "http://localhost:3000";
const WALLET = "11111111111111111111111111111111111111111111"; // 44-char dummy wallet for route tests

let passed = 0;
let failed = 0;

async function check(
  label: string,
  fn: () => Promise<{ ok: boolean; status: number; body: unknown }>
) {
  try {
    const { ok, status, body } = await fn();
    if (ok) {
      console.log(`✅ ${label} [${status}]`);
      passed++;
    } else {
      console.error(`❌ ${label} [${status}]`, JSON.stringify(body).slice(0, 120));
      failed++;
    }
  } catch (e) {
    console.error(`❌ ${label} — THREW:`, String(e));
    failed++;
  }
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function post(path: string, payload: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function run(): Promise<void> {
  console.log(`\n🧪 SignalCred Smoke Tests → ${BASE}\n`);

  await check("GET /api/health", () => get("/api/health"));

  await check("GET /api/stats", () => get("/api/stats"));

  await check(
    "POST /api/auth/session (valid wallet)",
    () => post("/api/auth/session", { wallet: WALLET })
  );
  await check(
    "POST /api/auth/session (invalid wallet → 400)",
    async () => {
      const r = await post("/api/auth/session", { wallet: "bad" });
      return { ok: r.status === 400, status: r.status, body: r.body };
    }
  );

  await check("GET /api/me (no wallet → user null)", async () => {
    const r = await get("/api/me");
    const ok = r.ok && (r.body as Record<string,unknown>).user === null;
    return { ok, status: r.status, body: r.body };
  });

  await check("GET /api/posts?tab=new", () => get("/api/posts?tab=new"));
  await check("GET /api/posts?tab=trending", () => get("/api/posts?tab=trending"));
  await check("GET /api/posts?tab=launches", () => get("/api/posts?tab=launches"));

  await check("GET /api/tokens", () => get("/api/tokens"));
  await check("GET /api/trending/tokens", () => get("/api/trending/tokens"));
  await check("GET /api/trending/posts", () => get("/api/trending/posts"));

  await check("GET /api/leaderboard", () => get("/api/leaderboard"));

  await check(
    `GET /api/profiles/${WALLET}`,
    () => get(`/api/profiles/${WALLET}`)
  );

  await check("POST /api/posts (no wallet → 401)", async () => {
    const r = await post("/api/posts", { content: "test", postType: "update" });
    return { ok: r.status === 401, status: r.status, body: r.body };
  });
  await check("GET /api/fees/partner (no wallet → 401)", async () => {
    const r = await get("/api/fees/partner");
    return { ok: r.status === 401, status: r.status, body: r.body };
  });
  await check("GET /api/me PATCH (no wallet → 401)", async () => {
    const r = await post("/api/me", { username: "test" }); // PATCH → POST check
    // me uses PATCH so POST shouldn't match, expect 405
    return { ok: r.status === 405 || r.status === 401, status: r.status, body: r.body };
  });

  await check(
    "GET /api/trade/quote (missing params → 400)",
    async () => {
      const r = await get("/api/trade/quote");
      return { ok: r.status === 400, status: r.status, body: r.body };
    }
  );

  await check(
    "POST /api/ai/token-draft (missing params → 400)",
    async () => {
      const r = await post("/api/ai/token-draft", {});
      return { ok: r.status === 400, status: r.status, body: r.body };
    }
  );
  await check(
    "POST /api/ai/token-analysis (missing params → 400)",
    async () => {
      const r = await post("/api/ai/token-analysis", {});
      return { ok: r.status === 400, status: r.status, body: r.body };
    }
  );

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Total: ${passed + failed} | ✅ ${passed} passed | ❌ ${failed} failed`);

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Check server logs.\n");
    process.exit(1);
  } else {
    console.log("\n🎉 All smoke tests passed!\n");
  }
}

const _result = run();
if (_result && typeof _result.catch === "function") {
  _result.catch((e: unknown) => {
    console.error("Smoke test runner error:", e);
    process.exit(1);
  });
}
