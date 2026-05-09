# SignalCred Bags Domination Plan

Date: 2026-05-05

## Core Positioning

SignalCred should not be pitched as a broad launchpad, AI suite, DeFi suite, payments app, and privacy app.

The winning position for The Bags Hackathon is:

> Bags launches tokens. SignalCred keeps every Bags token alive after launch.

The product should become a Bags-wide post-launch layer:

1. Discover every Bags token, not only tokens launched through SignalCred.
2. Create a canonical Token Home for every Bags token.
3. Attach social activity, trading, fees, and creator reputation to each token.

## Tracks To Dominate

### 1. Bags API

Goal: SignalCred becomes the best public consumer interface built on top of Bags APIs.

Core features:
- Sync all Bags launches from `GET /token-launch/feed`.
- Sync all Bags pools from `GET /solana/bags/pools`.
- Resolve a token page by any Bags `tokenMint`.
- Fetch token creators from `GET /token-launch/creator/v3`.
- Fetch pool state from `GET /solana/bags/pools/token-mint`.
- Use Bags SDK for trade quotes and swap transaction creation.
- Keep SignalCred launch flow as a showcase, but not as the only data source.

Success signal for judges:
- Search any Bags mint.
- SignalCred opens a useful Token Home even if the token was not launched on SignalCred.
- The UI clearly shows which Bags endpoints power each section.

### 2. Social Finance

Goal: Every Bags token gets a social home and attention layer.

Core features:
- Token Home with official updates, community posts, chart, trade panel, fee panel, and creator card.
- Square feed that supports token-attached posts.
- Cashtag parsing: `$TOKEN` links to `/token/[mint]`.
- Trending ranking based on social activity plus market movement.
- Auto launch post only for SignalCred-created tokens, but every external Bags token can still receive posts and community activity.

Important distinction:
- SignalCred is not a generic social network.
- Every social action must be tied to a financial asset: token mint, creator wallet, fee reputation, or trade action.

### 3. Fee Sharing / Creator Reputation

Goal: Fees become reputation, not just a claim button.

Core features:
- Token fee panel using lifetime fees and claim events.
- Creator card showing royalty/fee split data from Bags creator endpoint.
- Leaderboard ranked by lifetime fees, recent claims, and social score.
- Fee claim dashboard for connected creators.
- Partner stats panel for SignalCred-owned partner config.

Success signal for judges:
- A creator can prove traction with real Bags fee data.
- A trader can compare tokens by creator quality and fee performance.

## What To De-Emphasize

Do not pitch these as primary tracks:

- Privacy: current code intentionally removed stealth jars/messages as risky.
- Yield vaults: removed because simulated APY is not real enough.
- Generic payments: keep only if tied to token/community tipping.
- Generic AI agents: use AI only to improve token pages, creator posts, and token analysis.
- Calendar, referrals, multisig, airdrop: keep as secondary or hide from hackathon demo.

## Data Architecture

### Tables To Add Or Extend

`bags_tokens`
- `mint` primary key
- `name`
- `symbol`
- `description`
- `image_url`
- `website_url`
- `twitter_url`
- `status`
- `launch_signature`
- `dbc_pool_key`
- `dbc_config_key`
- `damm_v2_pool_key`
- `source` = `bags_feed | signalcred_launch | manual_import`
- `first_seen_at`
- `last_synced_at`

`token_market_snapshots`
- `mint`
- `price_usd`
- `price_change_24h`
- `volume_24h`
- `market_cap`
- `liquidity_usd`
- `pair_address`
- `source` = `birdeye | dexscreener | meteora`
- `captured_at`

`token_creator_snapshots`
- `mint`
- `wallet`
- `provider`
- `provider_username`
- `pfp`
- `royalty_bps`
- `is_creator`
- `is_admin`
- `last_synced_at`

`token_fee_snapshots`
- `mint`
- `lifetime_fees_lamports`
- `claimed_24h_lamports`
- `claim_events_count`
- `last_claim_at`
- `last_synced_at`

`token_social_scores`
- `mint`
- `posts_count`
- `likes_count`
- `comments_count`
- `unique_wallets`
- `score`
- `calculated_at`

### Sync Jobs

`sync:baskets`
- Run every 1-5 minutes during demo.
- Fetch `token-launch/feed`.
- Upsert tokens.

`sync:pools`
- Run every 5-15 minutes.
- Fetch `solana/bags/pools`.
- Add pool keys to tokens.

`sync:token-details`
- Background queue per mint.
- Fetch creators, lifetime fees, claim events, market data, and chart availability.

`sync:market`
- Fetch price, 24h percent, volume, and pair/chart data from Birdeye first.
- Fall back to DexScreener if Birdeye does not have coverage.
- If neither source has data, show "price pending" instead of fake values.

## Token Page Logic

Route: `/token/[mint]`

Resolution order:
1. Look up mint in local DB.
2. If not found, call Bags pool-by-mint endpoint.
3. If Bags confirms the pool, create an imported token record.
4. Fetch metadata from Bags launch feed if available.
5. Fetch market overview from Birdeye/DexScreener.
6. Render page even with partial data.

States:
- `indexed`: full metadata, market data, creators, fees.
- `bags_verified`: Bags pool exists, but metadata/price still syncing.
- `market_pending`: token exists but no chart/24h data yet.
- `not_bags_token`: mint not found in Bags pools.

## Feed And Trending Logic

New main product surface:

`/tokens`
- Shows all Bags tokens.
- Filters: New, Trending, Fee Leaders, Social, Gainers, Migrated.
- Each row/card shows:
  - image, symbol, name
  - 24h percent
  - volume/liquidity if available
  - social score
  - lifetime fees
  - creator username/provider

Trending score:

```txt
score =
  social_score * 0.35 +
  normalized_24h_volume * 0.25 +
  normalized_lifetime_fees * 0.25 +
  recency_boost * 0.15
```

Avoid fake precision:
- If no 24h data, display `--` and reduce market component weight.
- Do not invent prices.
- Do not show chart if no OHLCV data exists.

## Chart Strategy

Primary:
- Birdeye OHLCV for token candles and 24h stats.

Fallback:
- DexScreener token pairs for price, 24h change, volume, and pair chart if available.

Fallback UI:
- If no OHLCV exists, show a compact launch timeline:
  - first seen
  - Bags status
  - pool keys
  - recent claim events
  - recent posts

This is better than showing a broken or fake chart.

## Demo Flow For Bags Judges

1. Open `/tokens`.
2. Show that tokens were imported from Bags-wide feed, not only SignalCred.
3. Open an external Bags token page.
4. Show creator data, pool keys, 24h change, chart if available, fee data, and Square posts.
5. Create a post attached to that token.
6. Execute or preview a Bags trade quote.
7. Open Fee Leaders leaderboard.
8. Launch a new token through SignalCred.
9. Show it instantly appears in `/tokens`, `/square`, and `/token/[mint]`.

## Implementation Roadmap

### Phase 0: Submission Focus

- Rename pitch around `post-launch layer`.
- Hide or de-emphasize off-track nav items in hackathon flow.
- Fix typecheck scope so unrelated `_analysis` folders do not break `npm run typecheck`.
- Update README to stop claiming removed privacy/yield features.

### Phase 1: Bags-Wide Token Index

- Add `bags_tokens` table or safely extend current `tokens` table with `source`.
- Add `/api/bags/feed-sync` internal endpoint or script.
- Add `/api/bags/pools-sync` internal endpoint or script.
- Add `/api/tokens/import/[mint]` for on-demand token page hydration.
- Update `/api/trending/tokens` to include imported Bags tokens.

### Phase 2: Market + 24h Change

- Replace misleading `lib/birdeye.ts` naming if still using DexScreener.
- Add real Birdeye client behind `BIRDEYE_API_KEY`.
- Add market cache table.
- Enrich `/tokens` and `/token/[mint]` with price, 24h change, volume, liquidity.
- Add clean pending states.

### Phase 3: Token Home

- Rebuild `/token/[mint]` as the canonical Bags token page.
- Top section: price, 24h, creator, pool verification, trade CTA.
- Middle: chart or launch timeline.
- Social: token-attached Square posts.
- Fees: lifetime fees, claim events, claimable positions if connected creator.

### Phase 4: Fee Reputation

- Build `/leaderboard?tab=fees`.
- Rank by lifetime fees, recent claim events, and creator consistency.
- Add creator profile pages aggregating all created Bags tokens.

### Phase 5: Polish For Winning

- Add `/hackathon/bags` or improve `/hackathon`.
- Add endpoint proof panel with live green checks.
- Record a 3-5 minute demo with one external Bags token and one SignalCred-created token.

## Installed Skills / Plugins From Provided Links

Installed into `C:\Users\Leonid\.codex\skills`.
Restart Codex to pick them up.

### midudev/autoskills
- `next-best-practices`: Next.js architecture and routing quality.
- `react-best-practices`: React component/state quality.
- `tailwind-css-patterns`: Tailwind UI consistency.
- `typescript-advanced-types`: safer TypeScript modeling.

### affaan-m/everything-claude-code
- `documentation-lookup`: structured doc research.
- `market-research`: competitive and positioning work.
- `product-capability`: feature-to-capability planning.
- `security-review`: security review before submission.
- `strategic-compact`: sharper strategy summaries.
- `verification-loop`: implementation verification discipline.
- `frontend-patterns`: frontend implementation patterns.

### nextlevelbuilder/ui-ux-pro-max-skill
- `ui-ux-pro-max`: UI/UX polish.
- `design-system`: design system consistency.
- `ui-styling`: visual styling improvements.

### obra/superpowers
- `writing-plans`: clear implementation planning.
- `systematic-debugging`: debugging workflow.
- `verification-before-completion`: pre-delivery verification.
- `test-driven-development`: TDD workflow.
- `receiving-code-review`: handling review feedback.

### mattpocock/skills
- `grill-with-docs`: challenge implementation claims against docs.
- `improve-codebase-architecture`: architecture cleanup.
- `triage`: prioritize issues.
- `tdd`: practical TDD workflow.
- `to-prd`: convert ideas into product specs.
- `zoom-out`: strategic product/code review.

### thedotmack/claude-mem
- `learn-codebase`: codebase learning workflow.
- `make-plan`: planning workflow.
- `smart-explore`: targeted exploration workflow.
- `timeline-report`: timeline/progress reporting.

Not installed directly:
- `hesreallyhim/awesome-claude-code`: awesome list/reference repo, not a direct skill/plugin package.
- `hkuds/lightrag`: full RAG project/service, not a drop-in Codex skill. Useful later if we build persistent docs/code memory.
