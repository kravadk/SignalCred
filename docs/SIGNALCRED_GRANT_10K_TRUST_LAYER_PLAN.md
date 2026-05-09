# SignalCred Grant-Grade Trust Layer Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` or task-by-task implementation with tests after every slice. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn SignalCred from a hackathon demo into grant-grade Bags ecosystem infrastructure: every Bags token becomes a verified, tradable, reputation-backed asset profile.

**Architecture:** Build around one shared evidence model. Token pages, creator profiles, Square, public APIs, and grant dashboards should all read the same proof records, source labels, timestamps, external links, and fail-closed statuses.

**Tech Stack:** Next.js App Router, React, TypeScript, Drizzle DB, Bags API/SDK, Bags ReStream worker, Solscan links, DexScreener/Birdeye market data, Meteora pool links, SPL USDT proof, local fee snapshots.

---

## Core Grant Positioning

SignalCred should not be pitched as:

- another launchpad;
- an alpha radar;
- a generic social app;
- a generic dashboard.

Pitch it as:

> SignalCred is the trust and reputation layer for Bags tokens. It turns every launch into a verifiable passport with creator proof, fee evidence, claim receipts, social validation, and USDT-denominated creator economics.

The project should be evaluated as ecosystem infrastructure: something other Bags apps, trading tools, Telegram bots, creators, and communities can depend on.

---

## Shared Evidence Standard

Every feature below should use the same proof shape:

```ts
type TrustEvidenceRow = {
  id: string;
  label: string;
  status: "verified" | "pending" | "warming" | "warning" | "unavailable";
  source: string;
  value: string;
  timestamp: string | null;
  evidenceUrl: string | null;
  explanation: string;
  rawReference?: {
    endpoint?: string;
    account?: string;
    signature?: string;
    pairAddress?: string;
  };
};
```

Rules:

- If evidence is missing, show `pending`, `warming`, or `unavailable`.
- Never show fake market data, fake fee velocity, fake claim amounts, fake social proof, or fake campaign funding.
- Every mint, wallet, pool, and transaction should link to a real external verifier where possible.
- Every score must expose its formula and source labels.

---

## 1. Bags Trust Passport

### Goal

Create a public, shareable page for every Bags token:

`/passport/[mint]`

This page proves what is verified, what is warming up, what is risky, and where users can independently check the token.

### Why It Is Grant-Worthy

This is the strongest infrastructure primitive. Bags Alpha, TokenSight, and CreatorRadar mostly help users discover or score tokens. A Trust Passport becomes the standard proof link for any Bags token.

### User Flow

1. User opens token from `/token`, `/square`, Telegram, X, or an external widget.
2. User clicks `Trust Passport`.
3. Passport shows a top verdict: `Verified`, `Warming`, `Risk Review`, or `Unavailable`.
4. User sees the proof checklist.
5. User opens raw evidence drawers and external links.
6. User shares `/passport/[mint]`.

### Proof Checklist

Each passport must include:

- Bags source proof;
- pool proof;
- creator/admin proof;
- launch proof;
- market proof;
- fee loop proof;
- claim receipts;
- social proof;
- USDT campaign/funding proof;
- risk labels;
- score breakdown;
- all explorer links.

### Data Logic

- Bags source proof: Bags feed/import metadata or Bags pool discovery.
- Pool proof: Bags pool API, `dbcPoolKey`, `dammV2PoolKey`, Solscan account, Meteora link.
- Creator proof: Bags creators/admin API plus wallet signature for official actions.
- Launch proof: Bags launch/confirm metadata and transaction signature when available.
- Market proof: DexScreener/Birdeye pair, price, mcap, liquidity, volume; otherwise `No DEX pair yet`.
- Fee loop proof: Bags lifetime fees, hourly snapshots, claim events, submitted claim receipts.
- Social proof: token-linked Square posts, official updates, unique wallets, milestones, anti-spam.
- USDT proof: planned campaign, attached SPL USDT funding transaction, Solscan tx.

### Files

- Create: `app/passport/[mint]/page.tsx`
- Create: `app/api/tokens/[mint]/passport/route.ts`
- Create: `components/passport/TrustPassportPage.tsx`
- Create: `components/passport/PassportVerdict.tsx`
- Create: `components/passport/PassportProofChecklist.tsx`
- Create: `components/passport/PassportRawEvidenceDrawer.tsx`
- Modify: `components/token/TokenHero.tsx`
- Modify: `components/token/TrustProfileCard.tsx`
- Modify: `components/token/EvidencePanel.tsx`

### API Response

`GET /api/tokens/[mint]/passport`

```ts
type TokenPassportResponse = {
  mint: string;
  verdict: "verified" | "warming" | "risk_review" | "unavailable";
  trustScore: number;
  scoreBreakdown: Record<string, number>;
  evidence: TrustEvidenceRow[];
  riskLabels: Array<{ id: string; label: string; severity: "low" | "medium" | "high"; evidenceIds: string[] }>;
  links: {
    tokenPage: string;
    bags: string;
    solscanMint: string;
    dexScreener?: string | null;
    meteora?: string | null;
  };
  noFakeData: true;
  generatedAt: string;
};
```

### Tests

- [ ] Invalid mint returns `400`.
- [ ] Valid Bags mint returns `noFakeData: true`.
- [ ] Every external link uses an allowlisted domain: Bags.fm, Solscan, DexScreener, Meteora.
- [ ] Passport page renders `Trust Passport`.
- [ ] Missing market data renders `No DEX pair yet`, not fake mcap.
- [ ] Missing 24h fee baseline renders `Baseline warming`.

### Acceptance Criteria

- [ ] `/passport/[mint]` is shareable and useful without wallet connection.
- [ ] Token page has a visible `Trust Passport` action.
- [ ] Passport rows are source-labeled and timestamped.
- [ ] Every risk label points to the evidence row that caused it.

---

## 2. Creator Trust Graph

### Goal

Upgrade creator profile from a token list into a creator reputation graph:

`/profile/[wallet]`

The page should answer: "Has this creator launched trustworthy Bags tokens before?"

### Why It Is Grant-Worthy

Memecoin markets have weak creator reputation. A creator trust graph creates defensibility because the historical reputation data compounds over time.

### User Flow

1. User opens a token.
2. User clicks creator wallet.
3. Creator profile shows reliability score, all known tokens, fee history, claim behavior, social quality, campaign history, and repeated admin/wallet patterns.
4. User can inspect suspicious patterns and linked tokens.

### Creator Reliability Inputs

- total launched tokens;
- verified Bags creator/admin proofs;
- tokens with verified pools;
- tokens with market pairs;
- total lifetime fees;
- fee velocity active/warming count;
- claim events and receipts;
- official updates;
- campaigns planned/funded;
- repeated wallets/admins;
- tokens with high social but zero fees;
- dead/stale launches.

### Files

- Modify: `app/profile/[wallet]/page.tsx`
- Create: `app/api/creators/[wallet]/trust-graph/route.ts`
- Create: `components/profile/CreatorTrustGraph.tsx`
- Create: `components/profile/CreatorReliabilityScore.tsx`
- Create: `components/profile/LinkedTokenNetwork.tsx`
- Create: `components/profile/SuspiciousPatternPanel.tsx`

### API Response

`GET /api/creators/[wallet]/trust-graph`

```ts
type CreatorTrustGraphResponse = {
  wallet: string;
  reliabilityScore: number;
  scoreBreakdown: {
    creatorProof: number;
    poolSurvival: number;
    feeGeneration: number;
    claims: number;
    socialQuality: number;
    campaignReliability: number;
    riskPenalty: number;
  };
  tokens: Array<{
    mint: string;
    name: string;
    symbol: string;
    passportHref: string;
    lifetimeFeesLamports: number;
    feeVelocityStatus: "active" | "pending" | "unavailable";
    poolVerified: boolean;
    creatorProof: boolean;
    riskLabels: string[];
  }>;
  linkedWallets: Array<{ wallet: string; role: "creator" | "admin" | "claimer" | "campaign_funder"; tokenCount: number }>;
  suspiciousPatterns: Array<{ id: string; label: string; severity: "low" | "medium" | "high"; evidence: string[] }>;
  noFakeData: true;
};
```

### Tests

- [ ] Invalid wallet returns `400`.
- [ ] Valid creator returns reliability score and score breakdown.
- [ ] Linked token rows include passport links.
- [ ] Suspicious patterns are rule-based, not AI-only.
- [ ] Creator profile still renders when Bags creators API is delayed.

### Acceptance Criteria

- [ ] Creator profile shows "Creator Reliability Score".
- [ ] Every token in the graph links to `/passport/[mint]`.
- [ ] Repeated wallet/admin patterns are visible.
- [ ] Users can distinguish a new creator from a known creator.

---

## 3. Trust Signals Live

### Goal

Build a live Bags radar that is not an alpha radar.

Feature name:

`Trust Signals Live`

It should show when a token becomes more trustworthy, not when it might pump.

### Why It Is Grant-Worthy

Bags Alpha is strong at live discovery and alerts. SignalCred should use ReStream differently: live proof changes, not trading predictions.

### Live Signal Tags

- `new creator`;
- `known creator`;
- `fees started`;
- `pool verified`;
- `first official update`;
- `first 10 holders`;
- `USDT campaign planned`;
- `risk: no creator proof`;
- `risk: social spike no fees`;
- `baseline warming`;
- `claim event seen`;
- `passport ready`.

### Files

- Modify: `worker/restream-worker.ts` or create if missing.
- Modify: `app/api/bags/restream/ingest/route.ts`
- Create: `app/api/trust-signals/live/route.ts`
- Create: `components/token/TrustSignalsLive.tsx`
- Modify: `components/token/LiveBagsFeed.tsx`
- Modify: `app/hackathon/status/page.tsx`

### Data Logic

- ReStream worker listens for Bags launch events.
- Ingest endpoint validates `RESTREAM_INGEST_SECRET`.
- New launch creates/updates token row.
- Background enrichment computes proof tags.
- Frontend uses SSE if connected and polling fallback if not.

### Signal Model

```ts
type TrustSignal = {
  id: string;
  mint: string;
  type:
    | "new_launch"
    | "pool_verified"
    | "creator_verified"
    | "fees_started"
    | "official_update"
    | "claim_event"
    | "campaign_planned"
    | "risk_detected"
    | "passport_ready";
  label: string;
  severity: "positive" | "neutral" | "warning";
  source: string;
  timestamp: string;
  href: string;
};
```

### Tests

- [ ] Ingest rejects missing secret.
- [ ] Ingest stores launch event idempotently.
- [ ] Live endpoint returns signals sorted newest first.
- [ ] Status page shows ReStream connected, last event age, and persisted live launches.
- [ ] UI labels avoid alpha/pump language.

### Acceptance Criteria

- [x] Live feed says `Trust Signals Live`.
- [x] No `buy`, `pump`, `alpha call`, or financial-advice wording.
- [x] Every signal links to a token, passport, or external proof.
- [x] `/api/trust-signals/live` returns proof/risk signals with `noFakeData: true`.
- [x] `/hackathon/status` reports trust-signal coverage and SSE endpoint.

---

## 4. Proof-Based Social Layer

### Goal

Turn Square into a token social validation engine, not a generic feed.

### Why It Is Grant-Worthy

Social Finance track becomes credible when social activity is proof-backed, token-linked, and spam-resistant. This makes social activity a reputation primitive.

### Social Event Types

- official creator updates;
- community proof notes;
- campaign posts;
- milestone posts;
- fee event posts;
- claim receipt posts;
- proof-ranked comments;
- risk/spam penalties.

### Files

- Modify: `components/square/Feed.tsx`
- Modify: `app/api/posts/route.ts`
- Modify: `app/api/posts/[id]/comment/route.ts`
- Create: `app/api/tokens/[mint]/social-events/route.ts`
- Create: `components/square/ProofRankedPostCard.tsx`
- Create: `components/square/SocialValidationPanel.tsx`
- Modify: `lib/token-social-proof.ts`

### Social Scoring Rules

- Official update from verified creator/admin: high positive weight.
- Token-linked community proof note: positive weight.
- Unique wallet participation: positive weight.
- Reactions/comments: capped positive weight.
- Milestone-linked post: positive weight.
- Fee/claim/campaign event post: positive weight.
- Duplicate content: penalty.
- Repeated wallet spam: penalty.
- High social with zero fees: penalty.
- Token-less posts: excluded from ranking.

### API Behavior

- New posts require `tokenMint`.
- Official posts require wallet signature and Bags creator/admin proof.
- Comments inherit token context from parent post.
- `/api/posts?tab=proof` only returns token-linked posts.
- `/api/tokens/[mint]/social-events` returns official, community, milestone, campaign, fee, and claim events.

### Tests

- [ ] Token-less post creation rejects with `400`.
- [ ] Official update rejects non-creator wallet.
- [ ] Duplicate post rejects or rate-limits.
- [ ] Proof-ranked feed excludes generic posts.
- [ ] Token social events include source labels.
- [ ] Social score formula is returned in API.

### Acceptance Criteria

- [x] `/square` is visibly titled around token social proof.
- [x] Every post card shows token badge and proof context.
- [x] Social score can be explained without "AI magic".
- [x] `/api/tokens/[mint]/social-events` returns official, community, milestone, campaign, fee, and claim evidence.
- [x] Comments inherit token context from parent token-linked posts.

---

## 5. USDT Creator Treasury

### Goal

Make Tether/USDT a real creator finance layer, not only a converted subtitle.

Positioning:

> SignalCred makes memecoin creator income stable, measurable, and reusable for community growth.

### Why It Is Grant-Worthy

This directly fits Tether Frontier: creator fees become stable-value treasury, campaigns, rewards, and funding proofs.

### Features

- creator fees in SOL;
- stable value in USDT;
- treasury split planner;
- campaign budget;
- funding proof;
- rewards budget;
- buyback/reserve simulation;
- creator runway in USDT.

### Files

- Modify: `app/profile/[wallet]/page.tsx`
- Modify: `components/token/CampaignPlannerCard.tsx`
- Create: `components/profile/CreatorTreasuryPanel.tsx`
- Create: `components/profile/RunwayEstimator.tsx`
- Create: `app/api/creators/[wallet]/treasury/route.ts`
- Modify: `app/api/tokens/[mint]/campaigns/funding-proof/route.ts`

### Treasury Logic

- Estimate creator earnings from lifetime fees and fee share.
- Convert SOL to USDT using existing SOL/USDT price source.
- Show price source and fallback state.
- Planned campaign budget is preview-only until a funding transaction is attached.
- Funding proof is an external SPL USDT transaction signature.
- No automatic payout execution in this phase.

### API Response

`GET /api/creators/[wallet]/treasury`

```ts
type CreatorTreasuryResponse = {
  wallet: string;
  solPriceUsdt: number;
  usdtSource: string;
  approximate: boolean;
  totals: {
    lifetimeFeesSol: number;
    lifetimeFeesUsdt: number;
    estimatedCreatorShareSol: number;
    estimatedCreatorShareUsdt: number;
    claimed24hSol: number;
    claimed24hUsdt: number;
    plannedCampaignBudgetUsdt: number;
    fundedCampaignBudgetUsdt: number;
  };
  planner: {
    keepSolPercent: number;
    convertUsdtPercent: number;
    rewardsPercent: number;
    retainedSol: number;
    treasuryUsdt: number;
    rewardBudgetUsdt: number;
    runwayDays: number | null;
  };
  fundingProofs: Array<{ campaignId: string; txSignature: string; solscanHref: string; asset: "USDT-SPL" }>;
  previewOnly: true;
};
```

### Tests

- [ ] Treasury endpoint rejects invalid wallet.
- [ ] Treasury endpoint returns USDT source.
- [ ] Funding proof requires wallet signature.
- [ ] Funding proof requires campaign id.
- [ ] UI labels preview-only actions clearly.
- [ ] No endpoint performs automatic USDT payout.

### Acceptance Criteria

- [x] Creator profile has `USDT Creator Treasury`.
- [x] Campaign funding proofs link to Solscan.
- [x] Users can see SOL income and stable USDT planning in one view.
- [x] `/api/creators/[wallet]/treasury` returns creator share, runway, campaign budget, funding proofs, and `previewOnly: true`.
- [x] Treasury UI states that no USDT transaction is executed by SignalCred.

---

## 6. Trust API / Embed

### Goal

Make SignalCred useful outside its own frontend through public trust APIs and embeddable widgets.

### Why It Is Grant-Worthy

This changes the project from "site" to infrastructure. Other Bags tools, bots, launch pages, and trading interfaces can display SignalCred trust data.

### Public APIs

- `GET /api/public/token/[mint]/trust`
- `GET /api/public/creator/[wallet]/trust`
- `GET /api/public/token/[mint]/passport`

### Embed Widget

```html
<iframe src="https://signalcred.app/embed/trust/MINT"></iframe>
```

### Files

- Create: `app/api/public/token/[mint]/trust/route.ts`
- Create: `app/api/public/token/[mint]/passport/route.ts`
- Create: `app/api/public/creator/[wallet]/trust/route.ts`
- Create: `app/embed/trust/[mint]/page.tsx`
- Create: `components/embed/TrustEmbedCard.tsx`
- Create: `lib/public-api-cache.ts`

### Public API Rules

- Read-only only.
- No wallet-specific private data.
- Rate-limited.
- Cacheable with explicit `generatedAt`.
- Includes `noFakeData: true`.
- Includes source labels and fallback statuses.
- Does not expose API keys, partner keys, or raw secrets.

### Public Token Trust Response

```ts
type PublicTokenTrustResponse = {
  mint: string;
  symbol: string;
  name: string;
  trustScore: number;
  verdict: "verified" | "warming" | "risk_review" | "unavailable";
  badges: string[];
  riskLabels: string[];
  sourceLabels: Record<string, string>;
  passportHref: string;
  links: {
    bags: string;
    solscan: string;
    dexScreener?: string | null;
  };
  noFakeData: true;
  generatedAt: string;
};
```

### Tests

- [x] Public trust endpoint rejects invalid mint.
- [x] Public creator endpoint rejects invalid wallet.
- [x] Public endpoints are read-only.
- [x] Embed page renders in a small viewport.
- [x] Embed response includes `X-Frame-Options` or frame policy suitable for intended embedding.
- [x] Public API never returns server secrets.

### Acceptance Criteria

- [x] Any token has a copyable embed URL.
- [x] Embed card shows trust score, verdict, top proof badges, and passport link.
- [x] Public APIs are documented on `/docs`.

---

## 7. Judge / Grant Dashboard

### Goal

Create a grant-facing operational dashboard:

`/grant/status`

It should prove that SignalCred is live, sourced, operationally serious, and not using fake data.

### Why It Is Grant-Worthy

Grant reviewers need confidence that the system is real infrastructure. A grant dashboard shows coverage, freshness, uptime, live ingestion, and no-fake-data policy in one place.

### Dashboard Metrics

- indexed Bags tokens;
- verified pool coverage;
- creator proof coverage;
- fee snapshot freshness;
- live ReStream status;
- trust passport count;
- social proof count;
- campaigns planned/funded;
- public API uptime;
- no fake data policy;
- server-only key policy;
- signature auth policy;
- rate-limit policy.

### Files

- Create: `app/grant/status/page.tsx`
- Create: `app/api/grant/status/route.ts`
- Create: `components/grant/GrantStatusDashboard.tsx`
- Modify: `app/hackathon/status/page.tsx`
- Modify: `app/docs/page.tsx`

### API Response

`GET /api/grant/status`

```ts
type GrantStatusResponse = {
  generatedAt: string;
  bags: {
    indexedTokens: number;
    feedCount: number;
    poolCount: number;
    poolCoveragePercent: number;
    creatorProofCoveragePercent: number;
  };
  fees: {
    latestSnapshotAt: string | null;
    snapshotAgeMinutes: number | null;
    feeVelocityActiveCount: number;
    baselineWarmingCount: number;
  };
  live: {
    restreamConfigured: boolean;
    restreamConnected: boolean;
    lastEventAt: string | null;
    persistedLiveLaunches: number;
  };
  social: {
    tokenLinkedPosts: number;
    officialUpdates: number;
    socialProofTokens: number;
  };
  campaigns: {
    planned: number;
    funded: number;
    plannedBudgetUsdt: number;
    fundedBudgetUsdt: number;
  };
  publicApi: {
    tokenTrustEndpoint: "available" | "unavailable";
    creatorTrustEndpoint: "available" | "unavailable";
    embedEndpoint: "available" | "unavailable";
  };
  policies: {
    noFakeData: true;
    serverOnlyKeys: true;
    signatureAuthForWrites: true;
    rateLimits: true;
  };
};
```

### Tests

- [x] `/grant/status` renders.
- [x] `/api/grant/status` returns every field above.
- [x] Dashboard shows `no fake data` policy.
- [x] Dashboard shows ReStream connected/configured state.
- [x] Dashboard links to `/passport`, `/token`, `/fees`, `/square`, and `/docs`.
- [x] Build has no metadata warnings.

### Acceptance Criteria

- [x] Grant reviewer can see system health in under 30 seconds.
- [x] Every metric has source/freshness context.
- [x] No operational metric is invented when unavailable.

---

## Recommended Build Order

1. **Bags Trust Passport**
   - Highest pitch value.
   - Reuses existing evidence, fee-loop, social-proof, and campaign APIs.

2. **Creator Trust Graph**
   - Builds defensibility through creator history.
   - Reuses passport links and creator reputation data.

3. **Trust Signals Live**
   - Shows infrastructure maturity.
   - Depends on ReStream worker deployment.

4. **USDT Creator Treasury**
   - Makes Tether angle concrete.
   - Depends on fee and campaign data.

5. **Proof-Based Social Layer**
   - Turns Square into a reputation primitive.
   - Depends on token-linked post enforcement and social events.

6. **Trust API / Embed**
   - Makes the product ecosystem infrastructure.
   - Depends on stable passport/trust response shape.

7. **Judge / Grant Dashboard**
   - Makes the grant pitch operationally credible.
   - Depends on all core coverage metrics.

---

## Demo Script For Grant Review

1. Open `/grant/status`.
2. Show live coverage, policies, ReStream status, and no-fake-data guarantee.
3. Open `/token`.
4. Pick a token with real market/proof data.
5. Open `/passport/[mint]`.
6. Show Bags source, pool proof, creator proof, fee loop, claim receipts, social proof, USDT proof.
7. Open creator profile.
8. Show Creator Trust Graph and reliability score.
9. Open Trust Signals Live.
10. Show new proof/risk events without alpha/pump language.
11. Open public embed.
12. Explain that other Bags apps can integrate SignalCred trust.

---

## Success Definition

SignalCred is grant-ready when a reviewer can say:

> This is not just a hackathon frontend. It is a live trust infrastructure layer that makes Bags tokens safer to inspect, easier to verify, and more useful for creators and ecosystem partners.
