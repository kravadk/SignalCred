# BagsPulse 10/10 Track Plan

## Product Positioning

BagsPulse is the trust, proof, and stable creator-reputation layer for every Bags token.

We should not pitch BagsPulse as only an alpha radar. Bags Alpha is strong in early signal discovery. Our winning lane is different:

- before buying, users verify whether a token is really Bags-native;
- creators show reputation through real fee generation, claim history, and social proof;
- Tether/USDT makes creator-token economics readable in stable value;
- Bags grows because users trust what they are trading.

Core pitch:

> Bags creates creator-token revenue through trading fees. BagsPulse makes that revenue verifiable, comparable, social, and understandable in USDT terms.

## Target Tracks

1. Bags API Track
2. Fee Sharing / Creator Reputation Track
3. Social Finance Track
4. Tether Frontier angle layered across all three tracks

The Tether integration should not become a separate app. It should make BagsPulse stronger by adding USDT trading, stable-value reputation, creator treasury planning, and rewards budgeting.

---

## 1. Bags API Track: 10/10

### Goal

Make BagsPulse the most reliable public index and proof layer for Bags tokens.

### Required Features

#### 1.1 ReStream / Live Ingestion

New Bags launches should appear within seconds, not only after polling.

Functional logic:

- connect a server worker to Bags ReStream if available;
- listen for new launch events;
- extract mint address and launch metadata;
- immediately insert/update token row in DB;
- trigger market/fees/proof enrichment in the background;
- push frontend updates by SSE or polling fallback.

Data sources:

- Bags ReStream / launch events;
- Bags feed API fallback;
- Bags token import by mint fallback.

UI:

- Token Index shows `Live` indicator;
- new tokens appear with a `new / hot` badge;
- if ReStream is disconnected, show `Live feed delayed - using cache`.

#### 1.2 Full Bags Universe Sync

Do not show "100 tokens" as if that is the full universe. The index must represent all Bags tokens available through API/pool sync.

Functional logic:

- use pagination where Bags API supports it;
- merge Bags feed + Bags pool endpoints;
- dedupe by mint;
- persist sync snapshots;
- expose `totalIndexed`, `feedCount`, `poolCount`, `lastSyncedAt`;
- support offset/limit in `/api/trending/tokens`.

UI:

- header copy: `Indexed Bags tokens`, not `100 tokens`;
- table has pagination/infinite load;
- stale cache banner if live sync fails.

#### 1.3 Evidence Page 2.0

Every token needs a transparent proof page.

Proof rows:

- Bags feed proof;
- Bags pool proof;
- Bags creators API proof;
- lifetime fees proof;
- claim events proof;
- market source proof;
- Solscan mint link;
- Solscan pool/config link;
- Bags.fm token link;
- DexScreener/Birdeye/Meteora link when available.

Functional logic:

- `/api/tokens/[mint]/evidence` returns normalized evidence rows;
- each row includes label, ok/pending state, value, source, href, timestamp;
- UI renders each proof row as a clickable source.

#### 1.4 Source Labels

Every market/fee/social value must show where it came from.

Labels:

- `Bags feed`;
- `Bags pool`;
- `DexScreener`;
- `Birdeye`;
- `Meteora`;
- `Solscan`;
- `stale cache`;
- `pending`.

Functional logic:

- every enriched token row has `metricSource`;
- frontend never silently displays fallback values as live data.

#### 1.5 DexScreener-Like Market Table

Token Index should look and behave like a serious market terminal.

Columns:

- token;
- mcap;
- price;
- age;
- txns;
- volume;
- traders if available;
- lifetime fees;
- claimed 24h;
- fee velocity;
- 5m / 1h / 6h / 24h change;
- liquidity;
- proof/source.

UI rules:

- sticky token column;
- clear horizontal scroll;
- green/red percentage colors;
- no clipped columns;
- broken avatars must fall back to initials/gradient;
- no fake market cap or fake chart values.

#### 1.6 Fast Token Page Loading

Token pages must open quickly.

Functional logic:

- load token identity first;
- fetch chart, fees, reputation, liquidity, social, and evidence in parallel;
- do not block the whole page on slow Bags endpoints;
- use skeletons and explicit pending states;
- cache expensive reads.

#### 1.7 Real Chart Path

Show real candles if available, otherwise show honest no-chart state.

Data sources:

- DexScreener pair/candles if available;
- Birdeye OHLCV if available;
- fallback: `No DEX chart yet`.

UI:

- never render fake line charts;
- show `Waiting for verified market candles` when no chart exists.

#### 1.8 API Health / Judge Debug Page

Add a judge-facing health/debug screen.

Data shown:

- Bags API status;
- Bags sync freshness;
- indexed token count;
- market data source health;
- fee snapshot freshness;
- ReStream status;
- cache status;
- last errors.

---

## 2. Fee Sharing / Creator Reputation: 10/10

### Goal

Make `/fees` and creator profiles the strongest unique part of BagsPulse.

### Required Features

#### 2.1 Hourly Fee Snapshots

Current lifetime fees are useful, but true 24h generated fees require snapshots.

Functional logic:

- every hour store `mint`, `lifetimeFeesLamports`, `timestamp`;
- compute `feeVelocity24h = currentLifetimeFees - lifetimeFeesFrom24hAgo`;
- if no 24h baseline exists, show `pending`;
- never fake generated fees.

DB:

- `fee_snapshots`;
- optional unique key: `mint + hourBucket`.

UI:

- token card: `Generated 24h`;
- fees leaderboard filter: `Fee Velocity`;
- pending state: `Collecting 24h baseline`.

#### 2.2 Claim Events Timeline

Show actual claim activity.

Data:

- claim timestamp;
- claimant wallet;
- claimed amount;
- transaction/explorer link if available;
- source API.

UI:

- token page `Claim History`;
- creator profile `Recent Claims`;
- evidence page proof row links to claim events.

#### 2.3 Creator Reputation Profile

Profile should not be portfolio/privacy. It should be creator reputation.

Sections:

- creator wallet;
- Bags creator/admin proof;
- all creator tokens;
- total lifetime fees;
- generated fees 24h;
- claimed fees 24h;
- unclaimed estimate;
- social score;
- risk flags;
- official updates;
- USDT-denominated earnings.

Functional logic:

- resolve creator from Bags creators API;
- fallback to local creator only if Bags creator data unavailable;
- aggregate fees and social across creator tokens.

#### 2.4 Creator Leaderboard

Rank creators, not only tokens.

Filters:

- top lifetime fees;
- top fee velocity;
- most consistent creators;
- verified creators;
- new earners;
- risky hype.

Formula:

- lifetime fee score;
- velocity score;
- verified creator score;
- social score;
- risk penalties;
- data freshness penalty.

#### 2.5 Token Fee Card Upgrade

Token page fee card must show:

- lifetime fees;
- generated 24h;
- claimed 24h;
- unclaimed estimate;
- creator share estimate;
- platform share estimate;
- claim history link;
- creator reputation link;
- Bags proof link.

#### 2.6 Risk Flags

Risk flags should explain why a token is trusted or questionable.

Flags:

- no creator proof;
- no pool proof;
- zero fees;
- high social / zero fees;
- stale market data;
- suspicious fee velocity;
- no claim events;
- no official updates;
- creator has many zero-fee tokens.

#### 2.7 Formula Transparency

No black-box reputation score.

UI:

- score breakdown panel;
- exact weights;
- source labels;
- risk penalties listed plainly.

Example:

- 40% lifetime fees;
- 25% fee velocity;
- 15% creator verification;
- 15% social validation;
- 5% market proof;
- penalties for stale/missing data.

#### 2.8 Claim UX Hardening

Already started with wallet signature auth. Finish the UX.

Required:

- signed wallet message for claim actions;
- clear `No claimable fees` state;
- transaction explorer links after claim;
- duplicate click protection;
- idempotency key;
- readable wallet errors.

---

## 3. Social Finance: 10/10

### Goal

Turn Square into verified token context, not generic social posting.

### Required Features

#### 3.1 Token-Specific Social Feed

Every token page should have social context attached to that token.

Content types:

- official creator updates;
- community posts;
- milestones;
- fee events;
- launch posts;
- reward campaign posts.

UI:

- token page social feed;
- Square filters only Bags tokens;
- no generic off-track feed in demo.

#### 3.2 Creator-Only Official Updates

Already mostly implemented. Polish it.

Rules:

- user signs message with wallet;
- server verifies signature;
- server checks Bags creators API;
- only creator/admin can post official update;
- local creator fallback only when Bags API unavailable.

UI:

- show why user can/cannot post;
- error: `Only verified Bags creator/admin can post official updates`;
- official posts have proof badge.

#### 3.3 Social Score Formula

Social score should be tied to token context.

Signals:

- official updates count;
- unique posting wallets;
- reactions;
- comments;
- reposts;
- holders;
- fee velocity alignment;
- launch recency;
- spam/duplicate penalties.

Avoid:

- generic likes as the main metric;
- social score without fee/holder validation.

#### 3.4 Anti-Spam Rules

Required protections:

- rate limits;
- duplicate post prevention;
- repeated text detection;
- max media size/type;
- max post length;
- wallet signature where needed;
- token mint validation;
- no arbitrary unsafe media URLs.

#### 3.5 Community Milestones

Milestones make social finance feel alive.

Examples:

- first 10 holders;
- first 1 SOL fees;
- new pool verified;
- creator posted update;
- fee velocity became active;
- first claim event;
- campaign funded in USDT.

Functional logic:

- derive from real token/fee/social data;
- show completed/pending state;
- milestones feed into social score.

#### 3.6 Raid / Challenge Cleanup

Keep only social features tied to proof or reputation.

Remove or hide:

- generic engagement fluff;
- challenges not tied to token data;
- off-track growth mechanics.

Keep:

- verified campaigns;
- creator announcements;
- milestone-based community actions;
- USDT reward budget campaigns.

#### 3.7 Launch Creates First Official Post

After launch transaction is verified on-chain:

- create token page;
- create official first post;
- mark it as launch post;
- link to Bags token and Solscan mint;
- include token proof state.

#### 3.8 Token Social Evidence

Add `Why this social activity is real` block.

Signals:

- official creator wallet proof;
- unique wallets;
- fee alignment;
- holder alignment;
- no duplicate spam pattern;
- recent verified milestones.

#### 3.9 Optional AI Summary

AI can summarize token/community/fees, but only grounded in real data.

Rules:

- no hallucinated predictions;
- include source values;
- show `AI summary generated from Bags fees, market data, and Square posts`.

---

## 4. Tether / USDT Integration

### Goal

Use USDT to make Bags creator-token economics understandable, tradable, and stable.

This should strengthen all three Bags tracks without changing the product focus.

### 4.1 USDT Trading Mode

The Buy/Sell panel already has USDT mode. Finish it as a headline Tether feature.

UX:

- label: `Buy any Bags token with USDT on Solana`;
- show `You pay USDT`;
- show `You receive token`;
- show route;
- show slippage;
- show price impact;
- show USDT wallet balance;
- show transaction result with explorer link.

Functional logic:

- read USDT balance through server API;
- quote route with USDT mint as input;
- validate quote server-side;
- execute wallet-signed swap;
- never expose RPC/API keys client-side.

Data:

- USDT SPL mint;
- Jupiter/Bags trade quote;
- server wallet balance endpoint;
- Solana transaction confirmation.

### 4.2 USDT-Denominated Reputation

Show SOL and approximate USDT everywhere fees matter.

Fields:

- lifetime fees: `5.2 SOL ~= 780 USDT`;
- fee velocity 24h: `0.3 SOL ~= 45 USDT`;
- claimed 24h: `0.1 SOL ~= 15 USDT`;
- market cap in USDT;
- volume in USDT;
- liquidity in USDT.

Functional logic:

- fetch SOL/USDT price server-side;
- normalize all fee values;
- include `approx` label;
- cache price value;
- show price timestamp/source.

### 4.3 Creator Earnings In USDT

Creator profile should make income readable in stable value.

UI examples:

- `Creator earned 5.2 SOL ~= 780 USDT`;
- `Generated 24h fees ~= 42 USDT`;
- `Claimed 24h ~= 10 USDT`;
- `Unclaimed estimate ~= 120 USDT`.

Why it matters:

- strengthens Fee Sharing;
- makes creator economy legible for Tether judges;
- makes reputation comparable across SOL price changes.

### 4.4 USDT Fee Payout Simulation / Planner

Build a planner first, without risky automatic on-chain actions.

Inputs:

- current claimable fees;
- creator share estimate;
- percent to convert to USDT;
- percent to keep as SOL;
- percent to allocate to rewards/campaigns.

Outputs:

- estimated retained SOL;
- estimated USDT treasury;
- reward budget;
- buyback budget;
- warning if claimable fees are too low.

UI:

- `Creator Treasury Planner`;
- sliders or segmented controls;
- `Preview only - no transaction executed`;
- later: optional execute flow.

### 4.5 Stable Treasury Widget

Add to token page or creator profile.

Sections:

- Hold as SOL;
- Convert to USDT;
- Use USDT for rewards;
- Use USDT for campaign budget;
- Use USDT for stable creator treasury.

Narrative:

USDT makes creator-token income less volatile and easier to reuse.

### 4.6 USDT Rewards / Campaign Budget

Add Social Finance campaign layer.

Creator can announce:

- `Top community contributors split 50 USDT`;
- `Reward budget funded by creator fees`;
- `Official update verified by creator wallet`.

Functional logic:

- campaign has budget amount in USDT;
- campaign links to token mint;
- campaign can be `planned`, `funded`, `completed`;
- initial version can be planner/proof only;
- future version can execute SPL USDT transfers.

Security:

- creator/admin signature required;
- validate reward amount;
- rate limit campaign creation;
- no automatic distribution without explicit wallet signing.

### 4.7 USDT Risk Lens

Add stable-value risk analysis.

Examples:

- `Fees are high in SOL, but stable USDT value changed with SOL price`;
- `Stable fee estimate is low despite high social activity`;
- `Token has social hype, but generated less than 5 USDT in fees`;
- `Creator has consistent USDT-denominated fee history`.

This differentiates us from alpha tools. Bags Alpha helps users find early movers; BagsPulse helps users understand stable creator economics and trust.

---

## 5. UX / Demo Quality

### Token Page Redesign

Top of page:

- token identity;
- buy/sell;
- price;
- mcap;
- volume;
- liquidity;
- fees;
- creator proof.

Below:

- chart;
- evidence;
- fee reputation;
- creator profile preview;
- social context;
- liquidity/pool.

Mobile:

- buy/sell visible early;
- proof visible early;
- no huge empty panels;
- no hidden important actions.

### Index Table Polish

Required:

- no hidden columns;
- sticky token column;
- obvious horizontal scroll;
- DexScreener-like colors;
- clear filters;
- source/proof badges;
- avatars always render or fall back.

### Fees Page

Make `/fees` the main Creator Reputation product.

Default view:

- top Bags tokens by lifetime fees;
- top creators by fees;
- top creators by velocity;
- risk-aware leaderboard;
- USDT-denominated values.

### Square Page

Simplify to Bags-only social layer.

Keep:

- token-linked posts;
- official updates;
- campaigns;
- milestones;
- proof badges.

Hide:

- generic social app noise;
- off-track topics;
- terminal/portfolio unrelated links.

### Launch Page

Clean Bags-native flow.

Required:

- every launch goes through Bags SDK/API;
- partner key server-side;
- after launch, token page is created;
- official first post is created;
- proof state starts as pending and updates after verification;
- no misleading controls.

### Loading / Error States

Every API state should be visible.

States:

- loading skeleton;
- pending proof;
- no pair yet;
- stale cache;
- Bags API rate-limited;
- market source unavailable;
- no claimable fees;
- wallet signature required.

---

## 6. Security / Reliability

### Required Security Work

- remove or hide remaining off-track routes from demo;
- keep API keys server-only;
- add rate limits to write endpoints;
- add rate limits to expensive read endpoints;
- use signature auth wherever wallet identity matters;
- add idempotency for launch, claim, post, campaign actions;
- validate all mint, wallet, URL, amount, and media inputs;
- no mock/local fake data in production flow;
- no fake market data;
- no silent fallbacks presented as live values.

### Critical Endpoints To Test

- `/api/trending/tokens`;
- `/api/tokens/[mint]/evidence`;
- `/api/tokens/[mint]/fees`;
- `/api/tokens/[mint]/reputation`;
- `/api/tokens/[mint]/chart`;
- `/api/tokens/[mint]/pool`;
- `/api/wallet/balances`;
- `/api/posts`;
- `/api/fees/token/[mint]/claim`;
- `/api/trade/quote`;
- `/api/trade/swap`;
- `/api/tokens/launch`;
- `/api/tokens/confirm`.

### UI Smoke Test

Cover:

- token index;
- token detail;
- fees;
- square;
- launch;
- mobile token page;
- invalid mint;
- no wallet;
- wallet connected read state.

---

## 7. Demo Script

1. Open Token Index.
2. Show indexed Bags tokens with market + fee columns.
3. Show source labels and stale/live status.
4. Open a token.
5. Buy/Sell is visible immediately, including USDT mode.
6. Show chart or honest no-chart state.
7. Open Evidence Page / proof summary.
8. Show Fee Reputation card.
9. Show Creator Reputation profile.
10. Show USDT-denominated creator earnings.
11. Show Stable Treasury Planner.
12. Show official update/social proof.
13. Show launch flow creating a Bags-native token.
14. Show first official post after on-chain confirmation.

Winning angle:

> Bags grows when users trust what they are trading. BagsPulse gives every Bags token a proof page, a fee reputation score, creator history, social validation, and stable USDT-denominated economics.

---

## 8. Implementation Order

### Phase 1: Highest Impact

1. Fee snapshots and true fee velocity 24h.
2. Creator Reputation Profile.
3. Token page redesign with buy/sell top.
4. USDT-denominated fees and creator earnings.
5. Evidence Page 2.0.

### Phase 2: Strong Differentiation

1. Stable Treasury Planner.
2. USDT reward/campaign planner.
3. Social score tied to verified token context.
4. Community milestones.
5. Creator leaderboard filters.

### Phase 3: Beat Top Competitors

1. ReStream live ingestion.
2. Full Bags universe sync.
3. SSE live frontend updates.
4. Judge health/debug page.
5. UI smoke tests and final demo polish.

### Phase 4: Optional Stretch

1. Actual USDT reward distribution with wallet-signed SPL transfers.
2. Chrome extension / Bags.fm overlay.
3. Telegram alerts.
4. AI grounded summary.
5. Historical pattern analysis.
