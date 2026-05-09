/**
 * Cheap demo verification suite.
 *
 * Run:
 *   npm run test:demo
 *
 * This suite is intentionally read-only:
 * - no real launch
 * - no swap
 * - no claim
 * - no signed transaction
 *
 * It verifies the three hackathon tracks plus transparency links:
 * Bags token index, Social Finance surfaces, Fee Reputation, and explorer proof links.
 */

const BASE = process.env.TEST_URL || "http://localhost:3000";
const DUMMY_WALLET = "So11111111111111111111111111111111111111112";
const INVALID_MINT = "bad-mint";
const FAKE_POST_ID = "11111111-1111-4111-8111-111111111111";
const TEST_CLIENT_IP = `10.88.${Math.floor(Date.now() / 1000) % 250}.${process.pid % 250}`;

type Json = Record<string, unknown>;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasExternalExplorer(value: string) {
  return (
    value.startsWith("https://solscan.io/") ||
    value.startsWith("https://bags.fm/") ||
    value.startsWith("https://dexscreener.com/") ||
    value.startsWith("https://app.meteora.ag/")
  );
}

async function fetchWithTimeout(path: string, init: RequestInit = {}, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headerObject = init.headers && !(init.headers instanceof Headers) && !Array.isArray(init.headers)
      ? init.headers as Record<string, string>
      : {};
    return await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "x-forwarded-for": TEST_CLIENT_IP,
        ...headerObject,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function json(path: string, init: RequestInit = {}) {
  const res = await fetchWithTimeout(path, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function html(path: string) {
  const res = await fetchWithTimeout(path, { headers: { Accept: "text/html" }, redirect: "manual" });
  const body = await res.text().catch(() => "");
  return { res, body };
}

async function check(label: string, fn: () => Promise<boolean>) {
  try {
    const ok = await fn();
    if (ok) {
      passed += 1;
      console.log(`OK   ${label}`);
    } else {
      failed += 1;
      failures.push(label);
      console.error(`FAIL ${label}`);
    }
  } catch (error) {
    failed += 1;
    const note = `${label} :: ${error instanceof Error ? error.message : String(error)}`;
    failures.push(note);
    console.error(`FAIL ${note}`);
  }
}

async function checkStatus(label: string, path: string, expected: number, init: RequestInit = {}) {
  await check(label, async () => {
    const { res } = await json(path, init);
    return res.status === expected;
  });
}

async function run() {
  console.log(`\nSignalCred cheap demo tests -> ${BASE}\n`);

  await check("health endpoint is alive", async () => {
    const { res, body } = await json("/api/health");
    return res.status === 200 && isRecord(body);
  });

  const pages = [
    ["/", [200]],
    ["/token", [200]],
    ["/fees", [200]],
    ["/square", [200]],
    ["/launch", [200]],
    ["/docs", [200]],
    ["/hackathon", [200]],
    ["/hackathon/status", [200]],
    ["/grant/status", [200]],
  ] as const;

  for (const [path, statuses] of pages) {
    await check(`page ${path} renders`, async () => {
      const { res } = await html(path);
      return statuses.includes(res.status);
    });
  }

  await check("home landing renders SignalCred trust landing", async () => {
    const { res, body } = await html("/");
    return (
      res.status === 200 &&
      body.includes("SignalCred") &&
      body.includes("Launch Bags tokens people can actually trust") &&
      body.includes("Launch Token") &&
      body.includes("Explore Trust Index") &&
      body.includes("Fee Loop Evidence") &&
      body.includes("Token Social Proof") &&
      body.includes("View Hackathon Status") &&
      body.includes('href="/launch"') &&
      body.includes('href="/token"') &&
      body.includes('href="/fees"') &&
      body.includes('href="/square"') &&
      body.includes('href="/hackathon/status"')
    );
  });

  let selectedMint = "";
  let selectedSymbol = "";
  let selectedHasMarket = false;

  await check("Bags index returns real token universe", async () => {
    const { res, body } = await json("/api/trending/tokens?limit=30&offset=0");
    if (res.status !== 200 || !isRecord(body)) return false;
    const tokens = asArray(body.tokens);
    if (!tokens.length) return false;
    const first = tokens.find((token) => {
      if (!isRecord(token)) return false;
      return typeof token.mint === "string" && token.mint.length >= 32;
    });
    if (!isRecord(first) || typeof first.mint !== "string") return false;
    selectedMint = first.mint;
    selectedSymbol = typeof first.symbol === "string" ? first.symbol : "";
    selectedHasMarket = Boolean(first.metricSource && isRecord(first.metricSource) && first.metricSource.market);
    return (
      typeof body.source === "string" &&
      typeof body.total === "number" &&
      typeof body.count === "number" &&
      Number(body.count) > 0 &&
      Number(body.total) >= Number(body.count)
    );
  });

  await check("Bags index market data is explicit, not fake-filled", async () => {
    const { res, body } = await json("/api/trending/tokens?limit=50&offset=0");
    if (res.status !== 200 || !isRecord(body)) return false;
    const tokens = asArray(body.tokens).filter(isRecord);
    if (!tokens.length) return false;
    const duplicateExactMcap = new Map<number, number>();
    for (const token of tokens) {
      if (typeof token.marketCap === "number") {
        duplicateExactMcap.set(token.marketCap, (duplicateExactMcap.get(token.marketCap) || 0) + 1);
      }
    }
    const suspiciousDuplicates = Array.from(duplicateExactMcap.values()).some((count) => count > 5);
    const noMarketRows = tokens.filter((token) => token.marketCap == null);
    const noMarketIsAllowed = noMarketRows.every((token) => {
      const metricSource = isRecord(token.metricSource) ? token.metricSource : {};
      return metricSource.market == null;
    });
    return !suspiciousDuplicates && noMarketIsAllowed;
  });

  await check("Token index uses Trust Layer positioning", async () => {
    const { res, body } = await html("/token");
    return (
      res.status === 200 &&
      body.includes("Bags Trust Index") &&
      body.includes("Trust Signals Live") &&
      body.includes("Trust Tags") &&
      body.includes("Risk")
    );
  });

  await check("selected test token exists", async () => selectedMint.length >= 32);

  const tokenPath = () => `/token/${selectedMint}`;
  const apiToken = (suffix: string) => `/api/tokens/${selectedMint}${suffix}`;

  await check("token detail page renders and exposes explorer links", async () => {
    const { res, body } = await html(tokenPath());
    return (
      res.status === 200 &&
      body.includes("solscan.io/token/") &&
      body.includes("bags.fm/token/") &&
      body.includes("Buy / Sell") &&
      body.includes("Trust Profile") &&
      body.includes("Trust Passport") &&
      body.includes("Fee Loop Evidence")
    );
  });

  await check("token Trust Passport page renders proof document", async () => {
    const { res, body } = await html(`/passport/${selectedMint}`);
    return (
      res.status === 200 &&
      body.includes("Trust Passport") &&
      body.includes("Proof Checklist") &&
      body.includes("Risk Labels") &&
      body.includes("Score Breakdown") &&
      body.includes("no fake data")
    );
  });

  await check("token-filtered Square page renders social proof context", async () => {
    const { res, body } = await html(`/square?token=${selectedMint}`);
    return (
      res.status === 200 &&
      body.includes("Token Square") &&
      body.includes("Token Social Proof") &&
      body.includes("Social Finance") &&
      body.includes("For You") &&
      body.includes("Following") &&
      body.includes("Official") &&
      body.includes("Signals") &&
      body.includes("Social validation engine") &&
      body.includes("Social score") &&
      body.includes("USDT campaigns") &&
      body.includes("Solscan")
    );
  });

  await check("token summary endpoint returns first-screen market/proof contract", async () => {
    const { res, body } = await json(apiToken("/summary"));
    return (
      res.status === 200 &&
      isRecord(body) &&
      isRecord(body.token) &&
      isRecord(body.fees) &&
      isRecord(body.proof) &&
      isRecord(body.trustProfile) &&
      Array.isArray(body.trustProfile.trustTags) &&
      Array.isArray(body.trustProfile.riskLabels) &&
      isRecord(body.trustProfile.scoreBreakdown) &&
      isRecord(body.links) &&
      typeof body.token.mint === "string" &&
      typeof body.links.solscanMint === "string" &&
      typeof body.links.bagsToken === "string"
    );
  });

  await check("evidence API returns normalized clickable proof rows", async () => {
    const { res, body } = await json(apiToken("/evidence"));
    if (res.status !== 200 || !isRecord(body)) return false;
    const rows = asArray(body.rows).filter(isRecord);
    if (rows.length < 9) return false;
    const hrefs = rows.map((row) => row.href).filter((href): href is string => typeof href === "string");
    const required = hrefs.some((href) => href.includes("bags.fm/token/"));
    const marketOk = selectedHasMarket ? hrefs.some((href) => href.includes("dexscreener.com/")) : true;
    const normalized = rows.every((row) => (
      typeof row.id === "string" &&
      typeof row.status === "string" &&
      typeof row.source === "string" &&
      typeof row.description === "string" &&
      "timestamp" in row
    ));
    return required && marketOk && normalized && hrefs.every(hasExternalExplorer);
  });

  await check("passport API returns grant-grade no-fake proof rows", async () => {
    const { res, body } = await json(apiToken("/passport"));
    if (res.status !== 200 || !isRecord(body)) return false;
    const evidence = asArray(body.evidence).filter(isRecord);
    const links = isRecord(body.links) ? body.links : {};
    const externalEvidenceLinks = evidence
      .map((row) => row.evidenceUrl)
      .filter((href): href is string => typeof href === "string" && href.startsWith("https://"));
    const hasBaselineTruth = evidence.some((row) => (
      row.id === "fee-loop-proof" &&
      typeof row.value === "string" &&
      (row.value.includes("Baseline warming") || row.status === "verified")
    ));
    return (
      body.noFakeData === true &&
      typeof body.verdict === "string" &&
      typeof body.trustScore === "number" &&
      isRecord(body.scoreBreakdown) &&
      evidence.length >= 9 &&
      evidence.every((row) => (
        typeof row.id === "string" &&
        typeof row.status === "string" &&
        typeof row.source === "string" &&
        typeof row.explanation === "string" &&
        "timestamp" in row
      )) &&
      typeof links.bags === "string" &&
      typeof links.solscanMint === "string" &&
      externalEvidenceLinks.every(hasExternalExplorer) &&
      hasBaselineTruth
    );
  });

  await check("public token trust API returns embeddable no-fake summary", async () => {
    const { res, body } = await json(`/api/public/token/${selectedMint}/trust`);
    if (res.status !== 200 || !isRecord(body)) return false;
    const serialized = JSON.stringify(body);
    return (
      body.noFakeData === true &&
      typeof body.trustScore === "number" &&
      typeof body.verdict === "string" &&
      Array.isArray(body.badges) &&
      Array.isArray(body.riskLabels) &&
      isRecord(body.sourceLabels) &&
      body.passportHref === `/passport/${selectedMint}` &&
      body.embedHref === `/embed/trust/${selectedMint}` &&
      isRecord(body.links) &&
      !serialized.includes("apiKey") &&
      !serialized.includes("partnerKey") &&
      !serialized.includes("secret")
    );
  });

  await check("public token passport API returns full public proof document", async () => {
    const { res, body } = await json(`/api/public/token/${selectedMint}/passport`);
    return (
      res.status === 200 &&
      isRecord(body) &&
      body.noFakeData === true &&
      body.publicApi === true &&
      body.embedHref === `/embed/trust/${selectedMint}` &&
      Array.isArray(body.evidence)
    );
  });

  await check("public creator trust API returns public creator projection", async () => {
    const { res, body } = await json(`/api/public/creator/${DUMMY_WALLET}/trust`);
    return (
      res.status === 200 &&
      isRecord(body) &&
      body.noFakeData === true &&
      typeof body.wallet === "string" &&
      typeof body.verdict === "string" &&
      isRecord(body.totals) &&
      Array.isArray(body.tokens)
    );
  });

  await check("public trust endpoints are read-only", async () => {
    const { res } = await json(`/api/public/token/${selectedMint}/trust`, { method: "POST", body: JSON.stringify({}) });
    return res.status === 405;
  });

  await check("trust embed page renders iframe-ready card", async () => {
    const { res, body } = await html(`/embed/trust/${selectedMint}`);
    const xFrame = res.headers.get("x-frame-options") ?? "";
    const csp = res.headers.get("content-security-policy") ?? "";
    return (
      res.status === 200 &&
      body.includes("SignalCred Trust Embed") &&
      body.includes("Score") &&
      body.includes("Passport") &&
      !xFrame.toLowerCase().includes("deny") &&
      csp.includes("frame-ancestors")
    );
  });

  await check("fee reputation endpoint returns score/proof structure", async () => {
    const { res, body } = await json(apiToken("/reputation"));
    if (res.status !== 200 || !isRecord(body)) return false;
    return (
      typeof body.reputationScore === "number" &&
      typeof body.lifetimeFeesLamports === "number" &&
      typeof body.solPriceUsdt === "number" &&
      typeof body.lifetimeFeesUsdt === "number" &&
      typeof body.claimedFees24hUsdt === "number" &&
      typeof body.usdtSource === "string" &&
      isRecord(body.scoreBreakdown) &&
      isRecord(body.social)
    );
  });

  await check("token fees endpoint is read-only and includes velocity/USDT fields", async () => {
    const { res, body } = await json(apiToken("/fees"));
    return (
      res.status === 200 &&
      isRecord(body) &&
      typeof body.lifetimeFeesLamports === "number" &&
      typeof body.claimedFees24hLamports === "number" &&
      typeof body.feeVelocityStatus === "string" &&
      typeof body.solPriceUsdt === "number" &&
      typeof body.lifetimeFeesUsdt === "number" &&
      typeof body.claimedFees24hUsdt === "number" &&
      typeof body.usdtSource === "string" &&
      isRecord(body.source)
    );
  });

  await check("token pool endpoint is safe and structured", async () => {
    const { res, body } = await json(apiToken("/pool"));
    return res.status === 200 && isRecord(body) && "graduated" in body;
  });

  await check("token trades endpoint is safe and structured", async () => {
    const { res, body } = await json(apiToken("/trades"));
    return res.status === 200 && isRecord(body);
  });

  await check("token chart endpoint returns candles array", async () => {
    const { res, body } = await json(apiToken("/chart"));
    return res.status === 200 && isRecord(body) && Array.isArray(body.bars);
  });

  await check("token holders endpoint returns holders array", async () => {
    const { res, body } = await json(apiToken("/holders"));
    return res.status === 200 && isRecord(body) && Array.isArray(body.holders);
  });

  await check("wallet balance endpoint returns decimals without exposing client RPC", async () => {
    const { res, body } = await json(`/api/wallet/balances?tokenMint=${selectedMint}`);
    return (
      res.status === 200 &&
      isRecord(body) &&
      typeof body.tokenDecimals === "number" &&
      body.source === "server-rpc"
    );
  });

  await check("token social endpoint returns social context", async () => {
    const { res, body } = await json(apiToken("/social"));
    return res.status === 200 && isRecord(body) && Array.isArray(body.posts);
  });

  await check("token social-proof endpoint returns score breakdown and sources", async () => {
    const { res, body } = await json(apiToken("/social-proof"));
    return (
      res.status === 200 &&
      isRecord(body) &&
      typeof body.socialScore === "number" &&
      isRecord(body.scoreBreakdown) &&
      isRecord(body.sourceLabels) &&
      typeof body.spamRisk === "number"
    );
  });

  await check("token social-events endpoint returns proof-ranked evidence", async () => {
    const { res, body } = await json(apiToken("/social-events"));
    if (res.status !== 200 || !isRecord(body)) return false;
    const events = asArray(body.events).filter(isRecord);
    return (
      body.noFakeData === true &&
      body.tokenLinkedOnly === true &&
      typeof body.socialScore === "number" &&
      isRecord(body.scoreBreakdown) &&
      isRecord(body.sourceLabels) &&
      typeof body.rankingPolicy === "string" &&
      events.some((event) => event.type === "fee_event") &&
      events.every((event) => (
        typeof event.id === "string" &&
        typeof event.type === "string" &&
        typeof event.status === "string" &&
        typeof event.source === "string" &&
        "href" in event
      ))
    );
  });

  await check("token milestones endpoint returns real completed/pending milestones", async () => {
    const { res, body } = await json(apiToken("/milestones"));
    if (res.status !== 200 || !isRecord(body)) return false;
    const milestones = asArray(body.milestones).filter(isRecord);
    return (
      milestones.length >= 8 &&
      milestones.every((row) => typeof row.id === "string" && typeof row.status === "string" && typeof row.source === "string")
    );
  });

  await check("token campaigns endpoint lists preview-only USDT campaigns", async () => {
    const { res, body } = await json(apiToken("/campaigns"));
    return (
      res.status === 200 &&
      isRecord(body) &&
      Array.isArray(body.campaigns) &&
      body.previewOnly === true &&
      isRecord(body.fundingProof) &&
      body.fundingProof.execution === "none"
    );
  });

  await check("token claim history endpoint returns Bags claim event structure", async () => {
    const { res, body } = await json(apiToken("/claims?limit=5"));
    return (
      res.status === 200 &&
      isRecord(body) &&
      Array.isArray(body.events) &&
      isRecord(body.claimAction) &&
      body.claimAction.status === "wallet_required" &&
      typeof body.source === "string" &&
      "hasMore" in body
    );
  });

  await check("token fee-loop endpoint returns no-fake evidence timeline", async () => {
    const { res, body } = await json(apiToken("/fee-loop"));
    if (res.status !== 200 || !isRecord(body)) return false;
    const steps = asArray(body.steps).filter(isRecord);
    const sourceLabels = isRecord(body.sourceLabels) ? body.sourceLabels : {};
    return (
      body.noFakeData === true &&
      steps.length >= 5 &&
      steps.some((step) => step.id === "fees_generated") &&
      steps.some((step) => step.id === "fees_claimed") &&
      steps.some((step) => step.id === "claim_receipt") &&
      steps.some((step) => step.id === "campaign_planned") &&
      steps.some((step) => step.id === "campaign_funded") &&
      typeof body.feeVelocityStatus === "string" &&
      typeof sourceLabels.fees === "string"
    );
  });

  await check("token fee-loop explorer links are Solscan receipts when signatures exist", async () => {
    const { res, body } = await json(apiToken("/fee-loop"));
    if (res.status !== 200 || !isRecord(body)) return false;
    const claimEvents = asArray(body.claimEvents).filter(isRecord);
    const claimReceipts = asArray(body.claimReceipts).filter(isRecord);
    const fundingProofs = asArray(body.fundingProofs).filter(isRecord);
    const signedRows = [...claimEvents, ...claimReceipts, ...fundingProofs].filter((row) => typeof row.txSignature === "string" || typeof row.signature === "string");
    return signedRows.every((row) => typeof row.href === "string" && row.href.startsWith("https://solscan.io/tx/"));
  });

  await check("leaderboard returns Fee Reputation rows", async () => {
    const { res, body } = await json("/api/leaderboard");
    return (
      res.status === 200 &&
      isRecord(body) &&
      Array.isArray(body.tokens) &&
      typeof body.solPriceUsdt === "number" &&
      typeof body.usdtSource === "string"
    );
  });

  await check("Square feed API returns posts", async () => {
    const { res, body } = await json("/api/posts?tab=new&limit=10");
    const rows = asArray(body.posts).filter(isRecord);
    return (
      res.status === 200 &&
      isRecord(body) &&
      Array.isArray(body.posts) &&
      body.tokenLinkedOnly === true &&
      typeof body.rankingSource === "string" &&
      rows.every((post) => typeof post.tokenMint === "string")
    );
  });

  let samplePostId: string | null = null;
  await check("Square 2.0 tabs render Twitter-like token timeline controls", async () => {
    const { res, body } = await html("/square");
    return (
      res.status === 200 &&
      body.includes("For You") &&
      body.includes("Following") &&
      body.includes("Official") &&
      body.includes("Signals") &&
      body.includes("Search posts, wallets, tokens")
    );
  });

  await check("Square page is positioned as Token Social Proof, not generic social", async () => {
    const { res, body } = await html("/square");
    return (
      res.status === 200 &&
      body.includes("Token Social Proof") &&
      body.includes("Attach an indexed Bags token") &&
      !body.includes("trade idea") &&
      !body.includes(">Meme<")
    );
  });

  await check("launch page promises creator-verified official first post", async () => {
    const { res, body } = await html("/launch");
    return (
      res.status === 200 &&
      body.includes("Official first post") &&
      body.includes("creator-verified") &&
      body.includes("Square")
    );
  });

  await check("Square proof feed only returns token-linked posts or empty state", async () => {
    const { res, body } = await json("/api/posts?tab=trending&limit=20");
    if (res.status !== 200 || !isRecord(body)) return false;
    const rows = asArray(body.posts).filter(isRecord);
    samplePostId = typeof rows[0]?.id === "string" ? rows[0].id : samplePostId;
    return (
      body.tokenLinkedOnly === true &&
      body.rankingSource === "token_social_proof" &&
      rows.every((post) => typeof post.tokenMint === "string")
    );
  });

  await check("Square token filter only returns matching token-linked posts", async () => {
    const { res, body } = await json(`/api/posts?tab=new&limit=20&tokenMint=${selectedMint}`);
    if (res.status !== 200 || !isRecord(body)) return false;
    const rows = asArray(body.posts).filter(isRecord);
    return rows.every((post) => post.tokenMint === selectedMint);
  });

  await check("Square official token feed only returns matching official posts", async () => {
    const { res, body } = await json(`/api/posts?tab=official&limit=20&tokenMint=${selectedMint}`);
    if (res.status !== 200 || !isRecord(body)) return false;
    const rows = asArray(body.posts).filter(isRecord);
    return rows.every((post) => post.tokenMint === selectedMint && post.postType === "official");
  });

  await check("Square following without wallet returns structured empty state", async () => {
    const { res, body } = await json("/api/posts?tab=following&limit=20");
    return res.status === 200 && isRecord(body) && Array.isArray(body.posts);
  });

  await check("Square signals feed returns only token-linked signal posts or empty state", async () => {
    const { res, body } = await json("/api/posts?tab=signals&limit=20");
    if (res.status !== 200 || !isRecord(body)) return false;
    const rows = asArray(body.posts).filter(isRecord);
    return (
      body.tokenLinkedOnly === true &&
      body.rankingSource === "token_signal_posts" &&
      rows.every((post) => typeof post.tokenMint === "string" && ["launch", "official", "quote"].includes(String(post.postType)))
    );
  });

  await check("Square post detail endpoint returns token proof context when a post exists", async () => {
    if (!samplePostId) return true;
    const { res, body } = await json(`/api/posts/${samplePostId}`);
    return (
      res.status === 200 &&
      isRecord(body) &&
      isRecord(body.post) &&
      Array.isArray(body.comments) &&
      Array.isArray(body.reactions) &&
      body.tokenLinkedOnly === true &&
      body.noFakeData === true
    );
  });

  await check("trending posts API returns posts", async () => {
    const { res, body } = await json("/api/trending/posts");
    return res.status === 200 && isRecord(body) && Array.isArray(body.posts);
  });

  await check("hackathon status API returns judge health fields", async () => {
    const { res, body } = await json("/api/hackathon/status");
    return (
      res.status === 200 &&
      isRecord(body) &&
      isRecord(body.bagsApi) &&
      isRecord(body.index) &&
      isRecord(body.fees) &&
      isRecord(body.social) &&
      isRecord(body.restream) &&
      isRecord(body.liveFeed) &&
      isRecord(body.trustSignals) &&
      isRecord(body.restreamWorker) &&
      isRecord(body.trustLayerPolicies) &&
      isRecord(body.publicApi) &&
      body.publicApi.readOnly === true &&
      body.publicApi.noFakeData === true &&
      body.trustLayerPolicies.noFakeData === true &&
      body.trustLayerPolicies.tokenLinkedSocialOnly === true &&
      body.trustLayerPolicies.walletSignatureAuth === true &&
      body.trustLayerPolicies.serverOnlyKeys === true &&
      body.trustLayerPolicies.publicTrustApiReadOnly === true &&
      "lastEventAgeSeconds" in body.liveFeed &&
      "persistedLiveLaunches" in body.liveFeed &&
      body.trustSignals.noFakeData === true &&
      isRecord(body.trustSignals.coverage)
    );
  });

  await check("Trust Signals Live API returns proof/risk signals without fake data", async () => {
    const { res, body } = await json("/api/trust-signals/live?limit=12");
    if (res.status !== 200 || !isRecord(body)) return false;
    const signals = asArray(body.signals).filter(isRecord);
    const serialized = JSON.stringify(body).toLowerCase();
    return (
      body.noFakeData === true &&
      body.title === "Trust Signals Live" &&
      isRecord(body.coverage) &&
      isRecord(body.sourceLabels) &&
      signals.every((signal) => (
        typeof signal.mint === "string" &&
        typeof signal.status === "string" &&
        typeof signal.label === "string" &&
        typeof signal.href === "string" &&
        typeof signal.passportHref === "string" &&
        typeof signal.source === "string"
      )) &&
      !serialized.includes("pump") &&
      !serialized.includes("alpha call") &&
      !serialized.includes("financial advice")
    );
  });

  await check("Bags live feed fallback returns recent launch snapshot", async () => {
    const { res, body } = await json("/api/bags/live?limit=5");
    return (
      res.status === 200 &&
      isRecord(body) &&
      Array.isArray(body.launches) &&
      isRecord(body.restream) &&
      typeof body.generatedAt === "string"
    );
  });

  await checkStatus("invalid mint evidence rejects with 400", `/api/tokens/${INVALID_MINT}/evidence`, 400);
  await checkStatus("invalid mint passport rejects with 400", `/api/tokens/${INVALID_MINT}/passport`, 400);
  await checkStatus("public token trust invalid mint rejects with 400", `/api/public/token/${INVALID_MINT}/trust`, 400);
  await checkStatus("public token passport invalid mint rejects with 400", `/api/public/token/${INVALID_MINT}/passport`, 400);
  await checkStatus("invalid mint fee-loop rejects with 400", `/api/tokens/${INVALID_MINT}/fee-loop`, 400);
  await checkStatus("invalid mint social proof rejects with 400", `/api/tokens/${INVALID_MINT}/social-proof`, 400);
  await checkStatus("invalid mint social-events rejects with 400", `/api/tokens/${INVALID_MINT}/social-events`, 400);
  await checkStatus("invalid mint milestones rejects with 400", `/api/tokens/${INVALID_MINT}/milestones`, 400);
  await checkStatus("invalid mint claim history rejects with 400", `/api/tokens/${INVALID_MINT}/claims`, 400);
  await checkStatus("creator reputation invalid wallet rejects with 400", "/api/creators/bad-wallet/reputation", 400);
  await checkStatus("creator trust graph invalid wallet rejects with 400", "/api/creators/bad-wallet/trust-graph", 400);
  await checkStatus("creator treasury invalid wallet rejects with 400", "/api/creators/bad-wallet/treasury", 400);
  await checkStatus("public creator trust invalid wallet rejects with 400", "/api/public/creator/bad-wallet/trust", 400);
  await check("creator reputation valid wallet returns structured totals", async () => {
    const { res, body } = await json(`/api/creators/${DUMMY_WALLET}/reputation`);
    return (
      res.status === 200 &&
      isRecord(body) &&
      isRecord(body.creator) &&
      Array.isArray(body.tokens) &&
      isRecord(body.totals) &&
      isRecord(body.treasuryPlanner) &&
      typeof body.solPriceUsdt === "number"
    );
  });
  await check("creator trust graph valid wallet returns reliability structure", async () => {
    const { res, body } = await json(`/api/creators/${DUMMY_WALLET}/trust-graph`);
    if (res.status !== 200 || !isRecord(body)) return false;
    const tokens = asArray(body.tokens).filter(isRecord);
    const patterns = asArray(body.suspiciousPatterns).filter(isRecord);
    return (
      typeof body.wallet === "string" &&
      typeof body.reliabilityScore === "number" &&
      isRecord(body.scoreBreakdown) &&
      Array.isArray(body.linkedWallets) &&
      body.noFakeData === true &&
      tokens.every((token) => typeof token.passportHref === "string" && token.passportHref.startsWith("/passport/")) &&
      patterns.every((pattern) => typeof pattern.id === "string" && typeof pattern.severity === "string" && Array.isArray(pattern.evidence))
    );
  });
  await check("creator treasury valid wallet returns USDT planner and no payout execution", async () => {
    const { res, body } = await json(`/api/creators/${DUMMY_WALLET}/treasury`);
    if (res.status !== 200 || !isRecord(body)) return false;
    const fundingProofs = asArray(body.fundingProofs).filter(isRecord);
    return (
      body.previewOnly === true &&
      body.noFakeData === true &&
      typeof body.solPriceUsdt === "number" &&
      typeof body.usdtSource === "string" &&
      isRecord(body.totals) &&
      isRecord(body.planner) &&
      isRecord(body.safety) &&
      body.safety.automaticPayoutExecution === false &&
      fundingProofs.every((proof) => typeof proof.solscanHref === "string" && proof.solscanHref.startsWith("https://solscan.io/tx/"))
    );
  });
  await check("creator profile page renders compact fee loop context", async () => {
    const { res, body } = await html(`/profile/${DUMMY_WALLET}`);
    return res.status === 200 && body.includes("Recent Fee Loop Evidence") && body.includes("Creator Reliability Score") && body.includes("USDT Creator Treasury");
  });
  await check("docs page documents public trust API and embed", async () => {
    const { res, body } = await html("/docs");
    return (
      res.status === 200 &&
      body.includes("Public Trust API + Embed") &&
      body.includes("/api/public/token/[mint]/trust") &&
      body.includes("/api/public/creator/[wallet]/trust") &&
      body.includes("/embed/trust/[mint]") &&
      body.includes("/grant/status")
    );
  });

  await check("grant status API returns operational grant fields", async () => {
    const { res, body } = await json("/api/grant/status");
    if (res.status !== 200 || !isRecord(body)) return false;
    return (
      typeof body.generatedAt === "string" &&
      isRecord(body.bags) &&
      typeof body.bags.indexedTokens === "number" &&
      typeof body.bags.feedCount === "number" &&
      typeof body.bags.poolCount === "number" &&
      typeof body.bags.poolCoveragePercent === "number" &&
      typeof body.bags.creatorProofCoveragePercent === "number" &&
      typeof body.bags.source === "string" &&
      isRecord(body.fees) &&
      "latestSnapshotAt" in body.fees &&
      "snapshotAgeMinutes" in body.fees &&
      typeof body.fees.feeVelocityActiveCount === "number" &&
      typeof body.fees.baselineWarmingCount === "number" &&
      typeof body.fees.source === "string" &&
      isRecord(body.live) &&
      typeof body.live.restreamConfigured === "boolean" &&
      typeof body.live.restreamConnected === "boolean" &&
      "lastEventAt" in body.live &&
      typeof body.live.persistedLiveLaunches === "number" &&
      isRecord(body.social) &&
      typeof body.social.tokenLinkedPosts === "number" &&
      typeof body.social.officialUpdates === "number" &&
      typeof body.social.socialProofTokens === "number" &&
      isRecord(body.campaigns) &&
      typeof body.campaigns.planned === "number" &&
      typeof body.campaigns.funded === "number" &&
      typeof body.campaigns.plannedBudgetUsdt === "number" &&
      typeof body.campaigns.fundedBudgetUsdt === "number" &&
      isRecord(body.publicApi) &&
      body.publicApi.tokenTrustEndpoint === "available" &&
      body.publicApi.creatorTrustEndpoint === "available" &&
      body.publicApi.embedEndpoint === "available" &&
      isRecord(body.passports) &&
      typeof body.passports.availableCount === "number" &&
      isRecord(body.policies) &&
      body.policies.noFakeData === true &&
      body.policies.serverOnlyKeys === true &&
      body.policies.signatureAuthForWrites === true &&
      body.policies.rateLimits === true &&
      isRecord(body.links) &&
      body.links.tokenIndex === "/token" &&
      body.links.fees === "/fees" &&
      body.links.square === "/square" &&
      body.links.docs === "/docs" &&
      body.links.passportPattern === "/passport/[mint]" &&
      body.noFakeData === true
    );
  });

  await check("grant status page renders reviewer dashboard shell", async () => {
    const { res, body } = await html("/grant/status");
    return (
      res.status === 200 &&
      body.includes("SignalCred Grant Status") &&
      body.includes("Grant operations dashboard") &&
      body.includes("no-fake-data policy") &&
      body.includes('href="/docs"')
    );
  });
  await checkStatus("fee snapshots endpoint rejects without automation secret", "/api/fees/snapshots", 401, {
    method: "POST",
    body: JSON.stringify({ limit: 1 }),
  });
  await checkStatus("campaign creation rejects without wallet signature", apiToken("/campaigns"), 401, {
    method: "POST",
    body: JSON.stringify({ title: "Demo rewards", budgetUsdt: 50 }),
  });
  await checkStatus("token-less Square post rejects with 400", "/api/posts", 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({ content: "Token context required", postType: "update" }),
  });
  await checkStatus("Square post with invalid tokenMint rejects with 400", "/api/posts", 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({ content: "Invalid mint should fail", postType: "update", tokenMint: INVALID_MINT }),
  });
  await checkStatus("Square quote post without valid quotedPostId rejects with 400", "/api/posts", 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({ content: "Quote context required", postType: "quote", tokenMint: selectedMint, quotedPostId: "not-a-uuid" }),
  });
  await checkStatus("Square bookmark reaction rejects without wallet", `/api/posts/${FAKE_POST_ID}/react`, 401, {
    method: "POST",
    body: JSON.stringify({ kind: "bookmark" }),
  });
  await checkStatus("Square reaction rejects invalid post id before DB write", `/api/posts/${selectedMint}/react`, 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({ kind: "like" }),
  });
  await checkStatus("Square reaction rejects missing post without 500", `/api/posts/${FAKE_POST_ID}/react`, 404, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({ kind: "like" }),
  });
  await checkStatus("Square reaction rejects invalid JSON with user message", `/api/posts/${FAKE_POST_ID}/react`, 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET, "Content-Type": "application/json" },
    body: "{bad json",
  });
  await checkStatus("Square comment rejects invalid post id", `/api/posts/${selectedMint}/comment`, 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({ content: "gm" }),
  });
  await checkStatus("Square pin official update rejects invalid post id", `/api/posts/${selectedMint}/pin`, 400, {
    method: "POST",
  });
  await checkStatus("campaign funding proof rejects without wallet signature", apiToken("/campaigns/funding-proof"), 401, {
    method: "POST",
    body: JSON.stringify({ txSignature: "3".repeat(88) }),
  });
  await checkStatus("claim receipt rejects without wallet signature", `/api/fees/token/${selectedMint}/claim/receipt`, 401, {
    method: "POST",
    body: JSON.stringify({ txSignature: "3".repeat(88) }),
  });
  await checkStatus("restream ingest rejects without automation secret", "/api/bags/restream/ingest", 401, {
    method: "POST",
    body: JSON.stringify({ mint: selectedMint, symbol: selectedSymbol || "BAGS" }),
  });
  await checkStatus("trade quote without params rejects with 400", "/api/trade/quote", 400);
  await checkStatus("swap without wallet rejects with 401", "/api/trade/swap", 401, {
    method: "POST",
    body: JSON.stringify({ quoteResponse: {} }),
  });
  await checkStatus("launch without wallet rejects with 401", "/api/tokens/launch", 401, {
    method: "POST",
    body: JSON.stringify({ name: "Cheap Test", symbol: "TEST", imageUrl: "https://example.com/a.png" }),
  });
  await checkStatus("launch confirm without wallet rejects with 401", "/api/tokens/confirm", 401, {
    method: "POST",
    body: JSON.stringify({ mint: selectedMint, txSignature: "3".repeat(88) }),
  });
  await checkStatus("launch confirm missing fields rejects with 400", "/api/tokens/confirm", 400, {
    method: "POST",
    headers: { "x-wallet": DUMMY_WALLET },
    body: JSON.stringify({}),
  });
  await checkStatus("fee claim without wallet rejects with 401", `/api/fees/token/${selectedMint}/claim`, 401, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await checkStatus("partner fees without wallet rejects with 401", "/api/fees/partner", 401);
  await checkStatus("auth invalid wallet rejects with 400", "/api/auth/session", 400, {
    method: "POST",
    body: JSON.stringify({ wallet: "bad-wallet" }),
  });
  await check("auth dummy wallet creates safe session", async () => {
    const { res, body } = await json("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ wallet: DUMMY_WALLET }),
    });
    return res.status === 200 && isRecord(body);
  });

  console.log(`\nSelected token: ${selectedSymbol || "(unknown)"} ${selectedMint}`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailures:");
    for (const item of failures) console.log(`- ${item}`);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Test runner crashed:", error);
  process.exit(1);
});
