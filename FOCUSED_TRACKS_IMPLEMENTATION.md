# Focused Bags Hackathon Implementation

Date: 2026-05-05

## Product Scope

SignalCred now focuses on three tracks only:

1. Bags API
2. Social Finance
3. Fee Sharing / Creator Reputation

The visible product should not compete as a generic AI agent suite, payments app, privacy app, yield product, multisig app, or calendar/airdrop tool.

## What Was Removed From Primary Surface

Hidden/de-emphasized from the main navigation:

- Tools / agents
- Generic profile flow
- Privacy
- Generic payments
- Yield vaults
- Multisig
- Calendar
- Airdrop
- Referrals

These routes can still exist as secondary experiments, but they must not be part of the Bags Hackathon demo or pitch.

Main surfaces:

- `/token` - Bags-wide token index
- `/token/[mint]` - canonical Token Home
- `/square` - token-attached social feed
- `/fees` - creator claim dashboard + fee leaderboard
- `/launch` - SignalCred Bags launch flow
- `/hackathon` - focused judge narrative
- `/docs` - SDK/API proof

## Track 1: Bags API

### Goal

SignalCred should prove it is the best consumer interface on top of Bags data and SDK primitives.

### Data Sources

- `GET /token-launch/feed`
  - Recent Bags launches
  - Used by `/api/trending/tokens` via `syncRecentBagsLaunches`

- `GET /solana/bags/pools/token-mint?tokenMint=...`
  - Verifies whether any arbitrary mint is a Bags token
  - Used by `/api/tokens/import` and `/token/[mint]`

- `GET /token-launch/creator/v3?tokenMint=...`
  - Creator wallet/provider/royalty data
  - Used for Token Home and fee reputation

- `GET /token-launch/lifetime-fees?tokenMint=...`
  - Lifetime token fee data
  - Used for Fee Leaderboard

- Bags SDK:
  - `tokenLaunch.createTokenInfoAndMetadata`
  - `config.createBagsFeeShareConfig`
  - `tokenLaunch.createLaunchTransaction`
  - `trade.getQuote`
  - `trade.createSwapTransaction`
  - `fee.getAllClaimablePositions`
  - `fee.getClaimTransactions`

### Implemented Flow

1. `/api/trending/tokens` syncs a small batch of recent Bags launches.
2. Imported tokens are stored in the existing `tokens` table.
3. Bags metadata is stored inside `tokens.metadata.bags`.
4. `/token` displays indexed tokens with Bags verification and 24h market data if available.
5. `/api/tokens/import` imports an arbitrary mint with rate limits and base58 validation.
6. `/token/[mint]` imports on-demand if the token is not in the local DB.

### Future Hardening

Move `metadata.bags` into dedicated tables:

- `bags_tokens`
- `token_market_snapshots`
- `token_creator_snapshots`
- `token_fee_snapshots`

This is better for scale, but the current implementation is safer for fast hackathon iteration.

## Track 2: Social Finance

### Goal

Every Bags token gets a social home after launch.

### Product Logic

The social layer is not generic posting. Every post should attach to at least one financial object:

- token mint
- creator wallet
- Bags launch
- fee event
- trade idea

### Data Flow

1. User opens `/token`.
2. Token index shows Bags-wide discovery.
3. User opens `/token/[mint]`.
4. Token Home shows:
   - identity
   - price / 24h change / market pending state
   - chart or pending chart
   - trade panel
   - official updates
   - community posts
   - creator and economics panels
5. User posts in `/square` or token-specific components.
6. Posts are stored with `tokenMint`.
7. Social score is calculated from posts, likes, comments, reposts.

### Social Score

Current formula:

```txt
score = posts * 3 + likes * 1 + comments * 2 + reposts * 3
```

Future formula:

```txt
score =
  social_score * 0.35 +
  normalized_24h_volume * 0.25 +
  normalized_lifetime_fees * 0.25 +
  recency_boost * 0.15
```

### Anti-Fake Rules

- No fake chart data.
- No fake fees.
- No fake APY.
- If market data is missing, show `market pending`.
- If chart data is missing, show chart pending state.
- If Bags pool cannot be verified, do not show Bags verified badge.

## Track 3: Fee Sharing / Creator Reputation

### Goal

Turn Bags fee data into creator reputation.

### Product Logic

Fee sharing is not just a claim button. It should answer:

- Which creator/tokens earned real fees?
- Which tokens are socially active?
- Which creators repeatedly launch tokens that generate volume?

### Implemented Flow

1. `/fees` has `My Fees` and `Leaderboard`.
2. `My Fees` uses Bags SDK claimable positions and claim transactions.
3. `/api/leaderboard`:
   - syncs recent Bags launches
   - loads local live tokens
   - fetches Bags lifetime fees
   - fetches creator data
   - calculates social score
   - sorts by lifetime fees first, social score second

### Reputation Score

Current API includes:

```txt
reputationScore = lifetime_fees_SOL * 10 + socialScore
```

For judging, rank primarily by real lifetime fees. The score is secondary context.

## Security Guardrails

### External API Safety

- Public endpoints are rate-limited.
- Bags sync has timeouts to prevent page hangs.
- Market data has timeouts and graceful fallback.
- Import endpoint validates Solana base58 mint format.
- Import endpoint returns 404 if token cannot be verified by Bags or market data.

### URL Safety

Imported external URLs are sanitized:

- only `http:` and `https:`
- no localhost/private hosts
- no `javascript:`
- no `data:` URLs

### Image Safety

TokenHeader uses a normal lazy `img` with `onError` fallback instead of Next Image optimization for arbitrary token images. This prevents unconfigured external hosts from crashing token pages.

### Blockchain Safety

- User funds move only after wallet signature.
- Server creates transactions but does not custody user funds.
- Trade swap endpoint re-quotes server-side and blocks quote drift above tolerance.
- Launch confirm marks token live only after on-chain verification.
- Fee claims require connected wallet and signed transaction.

### Abuse Prevention

- `/api/trending/tokens` is rate-limited.
- `/api/leaderboard` is rate-limited and cached.
- `/api/tokens/import` is rate-limited.
- Import sync only pulls a small recent batch during page requests.
- Larger historical indexing should be a scheduled worker, not a public request.

## Final Judge Story

Demo sequence:

1. Open `/token`.
2. Show Bags-wide indexed tokens.
3. Show 24h market data when available and honest pending states when not.
4. Paste a Bags mint and import it.
5. Open Token Home.
6. Show token-attached posts and trading.
7. Open `/fees?tab=leaderboard`.
8. Show real lifetime fees as reputation.
9. Launch a new token through SignalCred.
10. Show that launch creates a token page and social context.

One-line pitch:

> Bags launches tokens. SignalCred keeps every Bags token alive with discovery, social context, trading, and fee reputation.
