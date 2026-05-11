# SignalCred

> Bags launches tokens. SignalCred turns every Bags launch into a verified, tradable, reputation-backed asset profile.

SignalCred is the **trust and reputation layer for Bags tokens**. It combines a Bags-native launch flow, Bags-wide token index, Trust Passport, Creator Trust Graph, Fee Loop Evidence, Token Social Proof, USDT Creator Treasury, and public trust APIs that other Bags tools can embed.

Live app: https://signalcred.vercel.app

Demo video: [TODO — add Loom/YouTube link before submission]

## Why It Exists

Memecoin traders and communities move fast, but most token pages do not answer the questions that matter before someone buys, promotes, or builds around a token:

- Was this token actually found through Bags?
- Is there pool proof?
- Is the creator/admin wallet known?
- Are fees real, claimed, and traceable?
- Is social activity token-linked or just noise?
- Is creator income understandable in stable USDT terms?

SignalCred answers those questions with source-labeled evidence, explorer links, and public trust profiles.

## Tracks

1. **Bags API** - Bags launch/feed indexing, pool proof, creator/admin proof, lifetime fees, claim events, launch/trade/fee SDK flows, and Trust Passport evidence.
2. **Fee Sharing / Creator Reputation** - real Bags fees become token and creator reputation through lifetime fees, fee velocity, claim timeline, receipts, risk flags, and Creator Trust Graph.
3. **Social Finance** - Square is token-linked social validation: official updates, proof-ranked posts, milestones, campaigns, and social score without generic feed noise.
4. **Tether / USDT + QVAC** - creator economics are shown in USDT terms through treasury planning, campaign budgets, and attached SPL USDT funding proof. SignalCred also uses QVAC for private trust passport review. SignalCred does not execute automatic payouts.

Not primary tracks: generic AI agents, generic payments, privacy, yield vaults, multisig, referrals, calendars, airdrops, GameFi, DePIN, or custom EVM contracts.

## Core Loop

```txt
Bags launch/feed -> SignalCred Trust Index -> Token Page
      -> Trust Passport -> Creator Trust Graph
      -> Fee Loop Evidence -> Token Social Proof
      -> Public Trust API / Embed -> ecosystem reuse
```

## Product Surfaces

### `/`

SignalCred landing page: explains launch + trust + social finance in one flow.

### `/launch`

Bags-native launch flow:

- create token metadata;
- configure Bags fee share;
- create launch transaction;
- user signs in wallet;
- backend verifies launch before marking live;
- official first post and token page become part of the trust loop.

### `/token`

Bags Trust Index:

- indexed Bags tokens;
- market metrics when available;
- Trust Tags and Risk labels;
- Bags/pool/market/fee source labels;
- honest pending states for missing market or fee data.

### `/token/[mint]`

Canonical token page:

- token identity and market metrics;
- SOL/USDT buy/sell panel;
- chart or no-chart state;
- Trust Profile;
- Evidence;
- Fee Loop Evidence;
- Social Proof;
- Campaigns and milestones;
- links to Bags.fm, Solscan, DexScreener, Meteora, and Trust Passport.

### `/passport/[mint]`

Public Bags Trust Passport:

- Bags source proof;
- pool proof;
- creator/admin proof;
- market proof;
- Fee Loop Evidence;
- claim receipts;
- social proof;
- USDT campaign/funding proof;
- risk labels;
- score breakdown;
- public embed snippet.
- QVAC Trust Review for private passport explanation.

### `/profile/[wallet]`

Creator Trust Graph:

- creator reliability score;
- all known creator tokens;
- pool/creator/fee/social/campaign history;
- suspicious patterns;
- recent fee loop context;
- USDT Creator Treasury.

### `/fees`

Creator Reputation Hub:

- top tokens;
- top creators;
- fee velocity;
- verified creators;
- risky hype;
- lifetime fees, claimed fees, USDT equivalents, proof, and risk labels.

### `/square`

Token Social Proof layer:

- token-linked posts only in primary flow;
- official creator updates;
- campaign and milestone context;
- proof-ranked social activity;
- anti-spam and duplicate/rate-limit protection.
- optional QVAC proof-note drafting that creates a draft only, never an automatic post.

### `/grant/status`

Grant reviewer dashboard:

- indexed Bags tokens;
- pool/creator proof coverage;
- fee snapshot freshness;
- ReStream readiness;
- social proof coverage;
- USDT campaign coverage;
- public API/embed status;
- QVAC review readiness;
- no-fake-data, signature auth, server-only key, and rate-limit policies.

## Tether QVAC Integration

SignalCred integrates QVAC as a **private trust review layer** behind the SignalCred API gateway. The browser fetches real SignalCred proof data, normalizes it, and sends only public evidence JSON through `/api/qvac`. QVAC then explains what the user should inspect before trading.

Configure the QVAC service endpoint:

```bash
QVAC_SERVICE_URL=https://your-qvac-service.example
QVAC_ENABLED=true
QVAC_MOCK=false
```

QVAC service runtime variables:

```bash
QVAC_HOST=0.0.0.0
QVAC_PORT=10000
QVAC_LLM_MODEL_SRC=
QVAC_LLM_MODEL_TYPE=llm
QVAC_LLM_CTX_SIZE=4096
QVAC_EMBED_MODEL_SRC=
QVAC_EMBED_MODEL_TYPE=embeddings
QVAC_TRANSLATION_MODEL_SRC=
QVAC_TRANSLATION_MODEL_TYPE=nmt
```

If `QVAC_LLM_MODEL_SRC` is empty, the companion loads the bundled QVAC `LLAMA_3_2_1B_INST_Q4_0` descriptor.

### Judge quick start — QVAC demo mode

Set `QVAC_MOCK=true` in Vercel environment variables to enable inline demo mode.
The Next.js API route (`app/api/qvac/[...path]/route.ts`) handles mock responses directly — no companion process needed on the server.
Mock responses are grounded in real token evidence rows and never invent proof.

To run real local inference:

```bash
# Terminal 1 — start QVAC companion (loads LLAMA_3_2_1B locally)
npm run qvac:companion

# Terminal 2 — Next.js dev server
npm run dev

# Open: http://localhost:3000/passport/94rNUftdQYXdiYzpkiM6Stdc9bZrxLNasEYeCM8oBAGS
# Click "Summarize passport" to trigger QVAC trust review
```

Validate QVAC:

```bash
npm run test:qvac                              # mock mode
$env:QVAC_REQUIRE_REAL="true"; npm run test:qvac  # real model
```

Optional smoke-test mode (companion only):

```bash
$env:QVAC_MOCK="1"; npm run qvac:companion
npm run test:qvac
```

Real-mode validation:

```bash
$env:QVAC_REQUIRE_REAL="true"; npm run test:qvac
```

QVAC product surfaces:

- `/passport/[mint]` - QVAC Trust Review summarizes passport evidence and risk labels.
- `/token/[mint]` - Before You Buy can be explained with QVAC.
- `/profile/[wallet]` - Creator Risk Review explains creator graph evidence.
- `/square` - QVAC drafts token-linked proof notes, but does not auto-post.
- `/grant/status` - shows QVAC review readiness and privacy policy.

QVAC capabilities used:

- QVAC LLM inference for trust passport summaries;
- evidence embeddings/RAG for “ask about proof” search when an embedding model is configured;
- translation of trust summaries through a QVAC translation model, or through the loaded LLM if no NMT model is configured;
- proof-note drafting grounded in evidence row IDs.

Privacy and safety:

- no wallet custody;
- no seed phrase requests;
- no automatic wallet signing, custody, or payout execution;
- wallet secrets, private keys, RPC URLs, and API keys are blocked before QVAC review;
- QVAC explains evidence, it does not replace SignalCred’s trust score or create fake proof.
- production fails closed: if the real QVAC model is unavailable, SignalCred shows `QVAC unavailable` instead of a fake review.

## Public Trust API

Read-only, cacheable endpoints for ecosystem integrations:

```txt
GET /api/public/token/[mint]/trust
GET /api/public/token/[mint]/passport
GET /api/public/creator/[wallet]/trust
GET /embed/trust/[mint]
```

Example embed:

```html
<iframe src="https://signalcred.app/embed/trust/MINT" width="420" height="520"></iframe>
```

## Bags Integrations

Data and SDK surfaces used:

- `GET /token-launch/feed`
- `GET /solana/bags/pools/token-mint`
- `GET /solana/bags/pools?onlyMigrated=true`
- `GET /token-launch/creator/v3`
- `GET /token-launch/lifetime-fees`
- Bags claim events
- `sdk.tokenLaunch.createTokenInfoAndMetadata`
- `sdk.config.createBagsFeeShareConfig`
- `sdk.tokenLaunch.createLaunchTransaction`
- `sdk.trade.getQuote`
- `sdk.trade.createSwapTransaction`
- `sdk.fee.getAllClaimablePositions`
- `sdk.fee.getClaimTransactions`

## Data Integrity Rules

- No fake market data.
- No fake fee velocity.
- No fake claim amounts.
- No fake campaign funding.
- Missing data renders as pending, warming, unavailable, or no pair.
- Fee Velocity 24h becomes active only after an hourly snapshot baseline older than 24 hours exists.
- Every mint, wallet, pool, and transaction links to Bags.fm, Solscan, DexScreener, or Meteora where possible.

## Security Rules

- Server-only Bags/API/private keys.
- Solana mint and wallet validation.
- URL sanitization and private host rejection.
- Rate limits on public and write-sensitive APIs.
- Wallet signature/session auth for creator-only and fee/campaign actions.
- Public Trust API is read-only.
- Trade flow re-quotes before creating swap transactions.
- User funds move only after wallet signature.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run dev
```

Required env lives in `.env.example`. Production deployments also need:

- `AUTOMATION_SECRET` for hourly fee snapshots;
- `RESTREAM_INGEST_SECRET` and `BAGS_RESTREAM_WORKER_URL` for the external ReStream worker;
- server-only `SOLANA_RPC_URL`, Bags keys, database URL, and app URL.

## Verification

```bash
npm run typecheck
npm run test:demo
npm run test:qvac
npm run build
npm run check:docs
npm run check:submit
```

`check:submit` runs the docs check, typecheck, demo suite, and production build.

## Demo Script

1. Open `/grant/status` and show no-fake-data policy, public API readiness, indexed tokens, fee snapshot freshness, and ReStream readiness.
2. Open `/token` and select a token with market/proof data.
3. Open `/token/[mint]` and show buy/sell, Evidence, Fee Loop Evidence, Social Proof, and Trust Passport link.
4. Open `/passport/[mint]` and show source/pool/creator/market/fee/social/USDT proof with explorer links.
5. Open QVAC Trust Review and ask “What should I inspect before trading?” to show evidence-grounded AI.
6. Open `/profile/[wallet]` and show Creator Trust Graph + USDT Creator Treasury + creator review.
7. Open `/fees` and show creator/token reputation.
8. Open `/square?token=[mint]` and show token-linked social proof plus QVAC proof-note draft.
9. Open `/launch` and explain Bags-native token creation.

## Known Production Steps

- Deploy the external ReStream worker and set `RESTREAM_INGEST_URL` / `RESTREAM_INGEST_SECRET`.
- Schedule hourly fee snapshots with `AUTOMATION_SECRET`.
- Add production monitoring/alerts for worker uptime and last event age.
- Publish public API versioning docs if external partners start integrating.

Operational runbooks:

- ReStream worker: `docs/RESTREAM_WORKER_DEPLOY.md`
- Fee snapshot cron: `docs/FEE_SNAPSHOT_CRON.md`
- Production monitoring and wallet rejection QA: `docs/PRODUCTION_OPERATIONS.md`

## Final Pitch

SignalCred is not a pump finder, not a generic social app, and not only a launchpad. It is the trust and reputation layer for Bags tokens: every launch becomes a verifiable asset profile with source proof, pool proof, creator/admin proof, market proof, Fee Loop Evidence, claim receipts, social validation, USDT Creator Treasury, Public Trust API, and an embeddable Bags Trust Passport.
