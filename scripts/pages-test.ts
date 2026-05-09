/**
 * Page render test — npx tsx scripts/pages-test.ts
 * Checks every Next.js page returns HTTP 200 (or expected redirect codes).
 * Run against a live dev or production server.
 */

import "dotenv/config";

const BASE = process.env.TEST_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

async function checkPage(
  label: string,
  path: string,
  allowedStatuses: number[] = [200]
) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: { Accept: "text/html" },
      redirect: "manual", // don't follow — we want to catch redirects
    });

    const ok = allowedStatuses.includes(res.status);
    if (ok) {
      console.log(`  ✅ ${label} [${res.status}]  ${path}`);
      passed++;
    } else {
      console.error(`  ❌ ${label} [${res.status}]  ${path}  (expected ${allowedStatuses.join("|")})`);
      failed++;
    }
  } catch (e) {
    console.error(`  ❌ ${label} — THREW: ${String(e)}`);
    failed++;
  }
}

async function run(): Promise<void> {
  console.log(`\n🌐  SignalCred — Page Render Tests`);
  console.log(`   Target: ${BASE}\n`);

  // ── Public pages ──────────────────────────────────────────────────────────
  console.log("▶ Public pages");

  await checkPage("Home /", "/");
  await checkPage("Launch /launch", "/launch");
  await checkPage("Square (Feed) /square", "/square");
  await checkPage("Leaderboard /leaderboard", "/leaderboard");
  await checkPage("Fees dashboard /fees", "/fees");
  await checkPage("Futures roadmap /futures", "/futures");
  await checkPage("Docs /docs", "/docs");

  // ── Dynamic pages (valid-looking params) ─────────────────────────────────
  console.log("\n▶ Dynamic pages");

  // Token page — use SOL mint; page should render even if token not in DB
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  await checkPage(
    "Token page /token/:mint",
    `/token/${SOL_MINT}`,
    [200, 404] // 404 acceptable if token not in DB
  );

  // Profile page — dummy wallet
  const DUMMY_WALLET = "11111111111111111111111111111111111111111111";
  await checkPage(
    "Profile /profile/:wallet",
    `/profile/${DUMMY_WALLET}`,
    [200, 404]
  );

  // ── Index redirects ───────────────────────────────────────────────────────
  console.log("\n▶ Index redirects / catch-alls");

  await checkPage(
    "/token (no mint → redirect or 200)",
    "/token",
    [200, 307, 308, 302, 404]
  );

  await checkPage(
    "/profile (no wallet → redirect or 200)",
    "/profile",
    [200, 307, 308, 302, 404]
  );

  // ── 404 for unknown pages ─────────────────────────────────────────────────
  console.log("\n▶ 404 behaviour");

  await checkPage(
    "Unknown route → 404",
    "/this-page-does-not-exist-xyz",
    [404]
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(52)}`);
  console.log(
    `Total: ${passed + failed}  |  ✅ ${passed} passed  |  ❌ ${failed} failed`
  );

  if (failed > 0) {
    console.log("\n⚠️  Some page tests failed.\n");
    process.exit(1);
  } else {
    console.log("\n🎉  All page tests passed!\n");
  }
}

run().catch((e) => {
  console.error("Page test runner crashed:", e);
  process.exit(1);
});
