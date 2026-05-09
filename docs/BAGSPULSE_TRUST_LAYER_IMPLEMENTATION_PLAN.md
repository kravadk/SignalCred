# BagsPulse Trust Layer Implementation Plan

## Core Positioning

BagsPulse should not be pitched as an alpha radar, a broad Bags terminal, or only a launchpad.

The product should be positioned as:

> BagsPulse is the trust layer for Bags. It turns every Bags token into a verifiable profile: source, pool proof, creator proof, lifetime fees, fee velocity, claim history, social proof, and USDT-denominated creator economics.

Every feature should answer one question:

> Can users trust this Bags token and creator before they trade?

## What To Borrow From Competitors

| Competitor | What to borrow | What not to copy | BagsPulse adaptation |
| --- | --- | --- | --- |
| Bags Alpha | Live ReStream ingestion and clear token tags | Alpha prediction, pump alerts, Telegram-first breakout calls | Use ReStream for live proof, not trading predictions |
| TokenSight AI | Multi-source score breakdown and risk labels | Broad any-Solana-token scanner scope | Make score Bags-specific: source, creator, fees, claims, social, market |
| Tend | Real fee-loop proof, receipts, fail-closed security language | Auto-payout risk as the main product | Show fee loop evidence and funded proof without unsafe auto-transfer |
| GitShipt | Idempotency, audit logs, strict auth narrative | GitHub repo tokenization | Apply the same seriousness to wallet signatures, server-only keys, and mutation safety |
| Blackhole / BagFlow | Campaigns, milestones, creator engagement mechanics | Generic quests or generic automation | Keep campaigns and milestones token-linked and proof-aware |

## Product Rules

1. Do not pitch BagsPulse as "we find pumps".
2. Do not pitch BagsPulse as "another Bags dashboard".
3. Do not pitch BagsPulse as only a launchpad.
4. Do not add generic social, generic portfolio, or generic trading bot surfaces.
5. Every metric must show source, freshness, and fallback state.
6. Every write action must use wallet signature auth where identity matters.
7. Every external proof should link to Bags, Solscan, DexScreener, Meteora, or another transparent source.
8. If data is missing, show pending/unavailable. Never fake market, fee, claim, or social data.

## Target UX

### 1. Token Index

Rename conceptually from "Bags Token Index" to "Bags Trust Index".

The table should prioritize:

- token identity;
- trust tags;
- source/proof status;
- price;
- market cap;
- lifetime fees;
- fee velocity;
- claimed fees;
- social proof;
- risk.

Recommended trust tags:

- `Bags Verified`;
- `Pool Verified`;
- `Creator Verified`;
- `Fee Active`;
- `Velocity Active`;
- `Claims Seen`;
- `Social Real`;
- `Campaign Planned`;
- `Stale Market`;
- `Needs Proof`;
- `Risk: High Social / Zero Fees`.

Avoid hype tags such as:

- `Breakout`;
- `Pump Soon`;
- `100x`;
- `Alpha Call`.

### 2. Token Detail Page

The first screen should be structured around a `Trust Profile`.

Recommended layout:

- top-left: token identity, price, 24h change, market cap, volume, liquidity;
- top-right: buy/sell panel with SOL and USDT mode;
- center: `Trust Profile`;
- below: evidence, fee loop, social proof, campaigns, milestones.

`Trust Profile` should include:

- total trust score;
- score breakdown;
- trust tags;
- risk labels;
- source labels;
- key proof links.

### 3. Trust Score Breakdown

Use explainable scoring, not AI magic.

Suggested formula:

| Dimension | Weight | Source |
| --- | ---: | --- |
| Bags source proof | 20 | Bags feed/import/pool |
| Creator proof | 20 | Bags creators/admin API |
| Fee evidence | 25 | lifetime fees + fee velocity snapshots |
| Claim evidence | 15 | Bags claim events + receipt proof |
| Social proof | 10 | official updates, unique wallets, anti-spam |
| Market proof | 10 | DexScreener/Birdeye/Meteora availability |

Risk flags should reduce or qualify the score:

- no creator proof;
- no pool proof;
- zero fees;
- high social with zero fees;
- stale market data;
- no claim events yet;
- social activity dominated by repeated wallet/text;
- unsupported or missing source.

### 4. Fee Loop Evidence

Convert claim history into a stronger story:

`Generated fees -> Claimable/claimed fees -> Solscan receipt -> Campaign/funding proof`.

UI blocks:

- lifetime fees;
- generated 24h;
- claimed 24h;
- recent claim events;
- claim receipt status;
- creator share estimate;
- platform share estimate;
- USDT equivalent.

Security copy should be explicit:

- no fake claimable balances;
- claims require wallet signature;
- receipts link to Solscan;
- failed/missing claim data shows pending/unavailable.

### 5. Creator Reputation

`/fees` should feel like the creator reputation product, not a generic dashboard.

Primary views:

- top tokens by lifetime fees;
- top tokens by fee velocity;
- top creators by real fees;
- verified creators;
- risky hype.

Creator profile should show:

- wallet and Solscan link;
- Bags creator/admin proof;
- all known creator tokens;
- total lifetime fees;
- generated fees 24h;
- claimed fees 24h;
- USDT equivalents;
- official updates;
- risk flags;
- recent claim events;
- campaign budget context.

### 6. Square

Square should not be a generic social network.

It should be:

> Token Social Proof.

Allowed tabs:

- `Proof Ranked`;
- `Official`;
- `Campaigns`;
- `Milestones`.

Every meaningful social object should be linked to a token mint.

Post-level badges:

- social score;
- milestone progress;
- campaign count/budget;
- official/creator proof;
- Solscan/Bags links when relevant.

Avoid:

- generic topics;
- generic challenges;
- unrelated memes;
- hype automation;
- engagement farming.

### 7. Campaigns And Milestones

Borrow the best part of Blackhole/BagFlow without becoming a quest platform.

Campaigns should be:

- token-linked;
- creator/admin verified;
- preview/funding-proof based;
- clearly labeled as no automatic payout unless explicitly implemented later.

Milestones should be derived from real data:

- Bags feed verified;
- pool verified;
- creator verified;
- first official update;
- first 10 holders;
- first 1 SOL lifetime fees;
- fee velocity active;
- first claim event;
- campaign planned/funded.

### 8. ReStream

Use ReStream as live proof, not alpha prediction.

Behavior:

- new Bags launches appear quickly;
- tag as `New Bags Launch`;
- persist launch events;
- show worker status in `/hackathon/status`;
- if worker is down, show polling fallback clearly.

Avoid:

- "breakout";
- "pump soon";
- price prediction language.

### 9. Judge Status

`/hackathon/status` should prove that the app is real and safe.

Show:

- Bags API reachability;
- indexed token count;
- proof coverage;
- market coverage;
- fee snapshot freshness;
- ReStream worker readiness;
- last live event age;
- persisted live launches;
- campaign count;
- no fake data policy;
- server-only key policy;
- wallet signature auth policy;
- rate-limit/idempotency notes.

## Implementation Order

### Phase 1: Copy And Navigation

- Update navigation labels to support the Trust Layer story.
- Rename copy from generic token index to trust index.
- Add concise pitch copy on index, token, fees, square, and status pages.

### Phase 2: Trust Profile

- Make `Trust Profile` the central token-page block.
- Add score breakdown.
- Add trust tags.
- Add risk labels.
- Link every proof item to its source.

### Phase 3: Index Trust Tags

- Add trust tag column to token index.
- Add risk column.
- Ensure missing values show pending/unavailable.
- Keep DexScreener-like readability without turning into a pure alpha terminal.

### Phase 4: Fee Loop Evidence

- Upgrade claim history into fee loop evidence.
- Show receipts, claim state, and USDT equivalents.
- Keep claim execution wallet-signed and receipt-based.

### Phase 5: Square Cleanup

- Keep only token-specific tabs.
- Add token proof badges to each post row.
- Ensure campaign/milestone cards always reference real token mints.

### Phase 6: Judge And Security Polish

- Strengthen `/hackathon/status`.
- Add source/freshness/security checklist.
- Highlight no fake data and fail-closed behavior.

### Phase 7: Demo Script

Judge demo should be:

1. Open Bags Trust Index.
2. Pick any token.
3. Show Trust Profile.
4. Open evidence rows.
5. Show fee loop evidence and claim receipts.
6. Show creator reputation.
7. Show token-linked Square proof.
8. Show USDT campaign/funding proof.
9. Show `/hackathon/status` live readiness.
10. Optional: launch a new token through Bags-native flow.

## Final Pitch

BagsPulse is the trust layer for Bags.

Before traders buy, before communities rally, and before creators ask users to believe in a token, BagsPulse shows the proof:

- where the token came from;
- whether the pool and creator are verified;
- whether fees are real;
- whether claims happened;
- whether social activity is organic;
- what the creator economy is worth in SOL and USDT.

Bags grows when users trust what they are trading.
