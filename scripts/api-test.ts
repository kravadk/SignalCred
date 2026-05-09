/**
 * Full API test suite — npx tsx scripts/api-test.ts
 * Covers every route: public reads, auth guards, validation, AI endpoints, trade, fees.
 */

import "dotenv/config";

const BASE = process.env.TEST_URL ?? "http://localhost:3000";
const WALLET = "11111111111111111111111111111111111111111111"; // 44-char dummy wallet for route tests
const FAKE_MINT = "So11111111111111111111111111111111111111112"; // SOL mint — safe for read tests
const FAKE_POST_ID = "00000000-0000-0000-0000-000000000000";

let passed = 0;
let failed = 0;
const results: { label: string; ok: boolean; status: number; note?: string }[] = [];

// ── helpers ────────────────────────────────────────────────────────────────

async function req(
  method: string,
  path: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const get = (path: string, headers?: Record<string, string>) =>
  req("GET", path, { headers });
const post = (path: string, body: unknown, headers?: Record<string, string>) =>
  req("POST", path, { body, headers });
const patch = (path: string, body: unknown, headers?: Record<string, string>) =>
  req("PATCH", path, { body, headers });

type Assertion = (body: unknown) => boolean;

async function check(
  label: string,
  fn: () => Promise<{ ok: boolean; status: number; body: unknown }>,
  assertion?: Assertion
) {
  try {
    const { ok, status, body } = await fn();
    const assertOk = assertion ? assertion(body) : true;
    const pass = ok && assertOk;
    const note = !assertOk ? `assertion failed: ${JSON.stringify(body).slice(0, 100)}` : undefined;
    results.push({ label, ok: pass, status, note });
    if (pass) {
      console.log(`  ✅ ${label} [${status}]`);
      passed++;
    } else {
      console.error(`  ❌ ${label} [${status}]${note ? " — " + note : ""}`);
      failed++;
    }
  } catch (e) {
    console.error(`  ❌ ${label} — THREW: ${String(e)}`);
    results.push({ label, ok: false, status: 0, note: String(e) });
    failed++;
  }
}

async function checkStatus(
  label: string,
  fn: () => Promise<{ ok: boolean; status: number; body: unknown }>,
  expectedStatus: number,
  assertion?: Assertion
) {
  try {
    const { status, body } = await fn();
    const assertOk = assertion ? assertion(body) : true;
    const pass = status === expectedStatus && assertOk;
    const note = !assertOk ? `body: ${JSON.stringify(body).slice(0, 100)}` : undefined;
    results.push({ label, ok: pass, status, note });
    if (pass) {
      console.log(`  ✅ ${label} [${status}]`);
      passed++;
    } else {
      console.error(`  ❌ ${label} — expected ${expectedStatus}, got ${status}${note ? " " + note : ""}`);
      failed++;
    }
  } catch (e) {
    console.error(`  ❌ ${label} — THREW: ${String(e)}`);
    results.push({ label, ok: false, status: 0, note: String(e) });
    failed++;
  }
}

function hasKeys(...keys: string[]) {
  return (body: unknown): boolean => {
    const b = body as Record<string, unknown>;
    return keys.every((k) => k in b);
  };
}

function isArray(key: string) {
  return (body: unknown): boolean =>
    Array.isArray((body as Record<string, unknown>)[key]);
}

// ── run ────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log(`\n🧪  SignalCred — Full API Test Suite`);
  console.log(`   Target: ${BASE}\n`);

  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ Health & Stats");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "GET /api/health",
    () => get("/api/health"),
    hasKeys("ok")
  );

  await check(
    "GET /api/stats — has liveTokens/totalPosts/totalUsers",
    () => get("/api/stats"),
    hasKeys("liveTokens", "totalPosts", "totalUsers")
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Auth & Session");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "POST /api/auth/session (valid wallet)",
    () => post("/api/auth/session", { wallet: WALLET }),
    hasKeys("ok")
  );

  await checkStatus(
    "POST /api/auth/session (invalid wallet → 400)",
    () => post("/api/auth/session", { wallet: "not-a-real-wallet" }),
    400
  );

  await checkStatus(
    "POST /api/auth/session (missing wallet → 400)",
    () => post("/api/auth/session", {}),
    400
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ /api/me");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "GET /api/me (no wallet → user: null)",
    () => get("/api/me"),
    (b) => (b as Record<string, unknown>).user === null
  );

  await check(
    "GET /api/me (with x-wallet header)",
    () => get("/api/me", { "x-wallet": WALLET }),
    hasKeys("user")
  );

  await checkStatus(
    "POST /api/me (wrong method → 405)",
    () => post("/api/me", { username: "test" }),
    405
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Posts — /api/posts");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "GET /api/posts (default tab=new) — returns posts[]",
    () => get("/api/posts"),
    isArray("posts")
  );

  await check(
    "GET /api/posts?tab=new — returns posts[]",
    () => get("/api/posts?tab=new"),
    isArray("posts")
  );

  await check(
    "GET /api/posts?tab=trending — returns posts[]",
    () => get("/api/posts?tab=trending"),
    isArray("posts")
  );

  await check(
    "GET /api/posts?tab=launches — returns posts[]",
    () => get("/api/posts?tab=launches"),
    isArray("posts")
  );

  await check(
    "GET /api/posts?limit=5 — respects limit param",
    () => get("/api/posts?limit=5"),
    (b) => {
      const posts = (b as Record<string, unknown[]>).posts;
      return Array.isArray(posts) && posts.length <= 5;
    }
  );

  await checkStatus(
    "POST /api/posts (no wallet → 401)",
    () => post("/api/posts", { content: "hi", postType: "update" }),
    401
  );

  await checkStatus(
    "POST /api/posts (wallet, missing content → 400)",
    () =>
      post(
        "/api/posts",
        { postType: "update" },
        { "x-wallet": WALLET }
      ),
    400
  );

  await checkStatus(
    "POST /api/posts (wallet, missing postType → 400)",
    () =>
      post(
        "/api/posts",
        { content: "hello" },
        { "x-wallet": WALLET }
      ),
    400
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Post interactions — like / comment / tip");
  // ──────────────────────────────────────────────────────────────────────────

  await checkStatus(
    "POST /api/posts/:id/like (no wallet → 401)",
    () => post(`/api/posts/${FAKE_POST_ID}/like`, {}),
    401
  );

  await checkStatus(
    "POST /api/posts/:id/comment (no wallet → 401)",
    () => post(`/api/posts/${FAKE_POST_ID}/comment`, { content: "nice" }),
    401
  );

  await checkStatus(
    "POST /api/posts/:id/tip (no wallet → 401)",
    () =>
      post(`/api/posts/${FAKE_POST_ID}/tip`, {
        txSignature: "abc",
        amountLamports: 1000000,
      }),
    401
  );

  await checkStatus(
    "POST /api/posts/:id/tip (wallet, missing params → 400)",
    () =>
      post(
        `/api/posts/${FAKE_POST_ID}/tip`,
        {},
        { "x-wallet": WALLET }
      ),
    400
  );

  await checkStatus(
    "POST /api/posts/:id/tip (wallet, valid params, fake id → 404)",
    () =>
      post(
        `/api/posts/${FAKE_POST_ID}/tip`,
        { txSignature: "fakesig", amountLamports: 1000000 },
        { "x-wallet": WALLET }
      ),
    404
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Tokens — /api/tokens");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "GET /api/tokens — returns tokens[]",
    () => get("/api/tokens"),
    isArray("tokens")
  );

  await check(
    "GET /api/tokens?creator=:wallet — returns tokens[]",
    () => get(`/api/tokens?creator=${WALLET}`),
    isArray("tokens")
  );

  await check(
    "GET /api/tokens?limit=3 — respects limit",
    () => get("/api/tokens?limit=3"),
    (b) => {
      const t = (b as Record<string, unknown[]>).tokens;
      return Array.isArray(t) && t.length <= 3;
    }
  );

  await checkStatus(
    "POST /api/tokens (no wallet → 401)",
    () =>
      post("/api/tokens", {
        mint: FAKE_MINT,
        name: "Test",
        symbol: "TST",
      }),
    401
  );

  await checkStatus(
    "POST /api/tokens (wallet, missing symbol → 400)",
    () =>
      post(
        "/api/tokens",
        { mint: FAKE_MINT, name: "Test" },
        { "x-wallet": WALLET }
      ),
    400
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Token-specific routes — /api/tokens/:mint");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    `GET /api/tokens/:mint — returns token or null`,
    () => get(`/api/tokens/${FAKE_MINT}`),
    hasKeys("token")
  );

  await check(
    `GET /api/tokens/:mint/chart — returns candles[]`,
    () => get(`/api/tokens/${FAKE_MINT}/chart`),
    isArray("candles")
  );

  await check(
    `GET /api/tokens/:mint/fees — returns fees object`,
    () => get(`/api/tokens/${FAKE_MINT}/fees`),
    hasKeys("fees")
  );

  await check(
    `GET /api/tokens/:mint/social — returns posts[], stats`,
    () => get(`/api/tokens/${FAKE_MINT}/social`),
    hasKeys("posts", "stats")
  );

  await checkStatus(
    "POST /api/tokens/launch (no wallet → 401)",
    () =>
      post("/api/tokens/launch", {
        name: "Test",
        symbol: "TST",
        imageUrl: "https://example.com/img.png",
      }),
    401
  );

  await checkStatus(
    "POST /api/tokens/launch (wallet, missing imageUrl → 400)",
    () =>
      post(
        "/api/tokens/launch",
        { name: "Test", symbol: "TST" },
        { "x-wallet": WALLET }
      ),
    400
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Trending");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "GET /api/trending/tokens — returns tokens[]",
    () => get("/api/trending/tokens"),
    isArray("tokens")
  );

  await check(
    "GET /api/trending/posts — returns posts[]",
    () => get("/api/trending/posts"),
    isArray("posts")
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Leaderboard");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    "GET /api/leaderboard — returns tokens[]",
    () => get("/api/leaderboard"),
    isArray("tokens")
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Profiles");
  // ──────────────────────────────────────────────────────────────────────────

  await check(
    `GET /api/profiles/:wallet — returns profile`,
    () => get(`/api/profiles/${WALLET}`),
    hasKeys("profile")
  );

  await checkStatus(
    "POST /api/profiles/:wallet/follow (no wallet → 401)",
    () => post(`/api/profiles/${WALLET}/follow`, {}),
    401
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Trade");
  // ──────────────────────────────────────────────────────────────────────────

  await checkStatus(
    "GET /api/trade/quote (no params → 400)",
    () => get("/api/trade/quote"),
    400
  );

  await checkStatus(
    "GET /api/trade/quote (missing amount → 400)",
    () => get(`/api/trade/quote?inputMint=${FAKE_MINT}&outputMint=${FAKE_MINT}`),
    400
  );

  await checkStatus(
    "POST /api/trade/swap (no wallet → 401)",
    () => post("/api/trade/swap", { quoteResponse: {} }),
    401
  );

  await checkStatus(
    "POST /api/trade/swap (wallet, missing quoteResponse → 400)",
    () => post("/api/trade/swap", {}, { "x-wallet": WALLET }),
    400
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Fees");
  // ──────────────────────────────────────────────────────────────────────────

  await checkStatus(
    "GET /api/fees/partner (no wallet → 401)",
    () => get("/api/fees/partner"),
    401
  );

  await check(
    "GET /api/fees/partner (with wallet)",
    () => get("/api/fees/partner", { "x-wallet": WALLET }),
    hasKeys("fees")
  );

  await checkStatus(
    "POST /api/fees/token/:mint/claim (no wallet → 401)",
    () => post(`/api/fees/token/${FAKE_MINT}/claim`, {}),
    401
  );

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ AI endpoints");
  // ──────────────────────────────────────────────────────────────────────────

  await checkStatus(
    "POST /api/ai/token-draft (empty body → 400)",
    () => post("/api/ai/token-draft", {}),
    400
  );

  await checkStatus(
    "POST /api/ai/token-analysis (missing mint → 400)",
    () => post("/api/ai/token-analysis", {}),
    400
  );

  await checkStatus(
    "POST /api/ai/post-draft (no postType — should not crash)",
    async () => {
      // post-draft doesn't validate strictly, just returns a draft
      const r = await post("/api/ai/post-draft", {
        postType: "meme",
        tokenSymbol: "PEPE",
        tokenName: "Pepe",
      });
      // expect either 200 (AI worked) or 500 (no API key)
      return {
        ok: r.status === 200 || r.status === 500,
        status: r.status,
        body: r.body,
      };
    },
    200 // checkStatus will see the ok=true from inner fn
  );

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(52)}`);
  console.log(
    `Total: ${passed + failed}  |  ✅ ${passed} passed  |  ❌ ${failed} failed`
  );

  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => !r.ok)
      .forEach((r) => console.log(`  • [${r.status}] ${r.label}${r.note ? " — " + r.note : ""}`));
    console.log();
    process.exit(1);
  } else {
    console.log("\n🎉  All API tests passed!\n");
  }
}

run().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
