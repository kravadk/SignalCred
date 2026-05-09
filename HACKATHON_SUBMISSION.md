# SignalCred Hackathon Submission

## One-liner

SignalCred is the trust and reputation layer for Bags tokens: it turns every Bags launch into a verifiable asset profile with source proof, creator history, fee evidence, token-linked social validation, and USDT-denominated creator economics.

## What Judges Should Remember

SignalCred is not a pump finder, a generic terminal, or a generic social app. It is reusable Bags ecosystem infrastructure:

- traders inspect proof before buying;
- creators build reputation across launches;
- communities share a public Trust Passport;
- other Bags tools can embed the public trust widget.

## Tracks

### 1. Bags API

Implemented:

- Bags launch feed indexing.
- Migrated pool discovery and arbitrary mint pool proof.
- Bags creators/admin proof.
- Bags lifetime fees.
- Bags claim events.
- Bags-native launch flow through SDK/API patterns.
- Bags trade quote/swap flow.
- Trust Passport for every indexed/imported Bags token.
- Public Trust API and embeddable trust widget.

### 2. Fee Sharing / Creator Reputation

Implemented:

- Lifetime fee ranking.
- Claimed fees 24h from claim events.
- Hourly fee snapshot storage.
- Fee Velocity 24h from lifetime-fee deltas.
- `Baseline warming` state when no 24h baseline exists.
- Fee Loop Evidence: generated fees, claimed fees, Solscan receipts, campaign funding proof.
- Creator Trust Graph and reliability score.
- Creator USDT Treasury and stable-value economics.

### 3. Social Finance

Implemented:

- Square as Token Social Proof, not a generic feed.
- Token-linked posts in the primary flow.
- Creator/admin official updates with wallet signature and Bags creator proof.
- Social proof score with source labels and anti-spam/risk penalties.
- Campaign and milestone context.
- Token social events endpoint.

### 4. Tether / USDT

Implemented:

- USDT-denominated lifetime fees, fee velocity, claimed fees, and creator estimates.
- USDT Creator Treasury planner.
- USDT campaign budget planning.
- SPL USDT funding proof as attached external tx signature.
- Explicit no automatic payout execution.

## Main Demo Flow

1. Open `/grant/status`.
   - Show indexed token count, pool/creator coverage, fee snapshot freshness, public API readiness, ReStream readiness, and no-fake-data policies.

2. Open `/token`.
   - Show the Bags Trust Index with market metrics, Trust Tags, Risk labels, proof states, and honest pending states.

3. Open a token page.
   - Show buy/sell, market metrics, Trust Profile, Evidence, Fee Loop Evidence, Social Proof, Campaigns, and Passport action.

4. Open `/passport/[mint]`.
   - Show Bags source proof, pool proof, creator proof, market proof, fees, claim receipts, social proof, USDT campaign/funding proof, risk labels, and explorer links.

5. Open `/profile/[wallet]`.
   - Show Creator Trust Graph, linked tokens, suspicious patterns, recent fee loop evidence, and USDT Creator Treasury.

6. Open `/fees`.
   - Compare top tokens/creators by real Bags fee signals, fee velocity, USDT value, proof, and risk.

7. Open `/square?token=[mint]`.
   - Show Token Social Proof with official updates, proof-ranked activity, campaigns, and milestones.

8. Open `/launch`.
   - Explain the Bags-native launch flow and how a launched token enters the trust loop.

## Data Integrity Rules

- No local mock token rows in core production flows.
- No invented market data.
- No invented fee velocity.
- No invented claim amounts.
- No invented campaign funding.
- Missing external data renders as pending, warming, unavailable, or no pair.
- Fee Velocity 24h becomes active only after an hourly snapshot baseline older than 24 hours exists.
- Every key object links to a verifier when possible: Bags.fm, Solscan, DexScreener, Meteora.

## Security Rules

- Server-only keys for Bags/RPC/private credentials.
- Public APIs are read-only and rate-limited.
- Invalid mints/wallets return safe 400 responses.
- Creator-only actions require wallet signature/session and Bags creator/admin proof.
- Fee/campaign actions require wallet authorization.
- Trade flow re-quotes before creating swap transactions.
- User funds move only after wallet signature.
- USDT campaigns are preview/proof based; SignalCred does not execute automatic payouts.

## Competitive Positioning

### Bags Alpha

Bags Alpha is strong at early discovery and alerts. SignalCred does not try to be a better pump predictor. SignalCred tracks when a token becomes more trustworthy: pool proof, creator proof, fee activity, claim receipts, social proof, and campaign funding proof.

### TokenSight / CreatorRadar

Multi-source scoring is useful, but SignalCred makes the score inspectable through a public Trust Passport and creator history. Scores are evidence-backed, not “AI magic”.

### BagScan / Claim tools

Claim scanning is useful, but SignalCred turns fee evidence into a full reputation loop: token page, passport, creator graph, public API, and social proof.

### Generic AI launchpads

SignalCred avoids broad AI-launchpad sprawl. Its wedge is Bags-native trust after launch.

## Known Limitations

- Fee Velocity 24h becomes active only after hourly snapshots have run for at least 24 hours.
- Production should schedule `/api/fees/snapshots` hourly with `AUTOMATION_SECRET`.
- ReStream worker config exists, but production still needs an external Railway/Fly worker deployment and `RESTREAM_INGEST_URL` / `RESTREAM_INGEST_SECRET`.
- DexScreener coverage depends on whether a token has an indexed pair.
- USDT campaign funding proof is an attached tx proof, not an automatic payout engine.
- Production monitoring/alerts are a post-hackathon step.

## Verification Commands

```bash
npm run check:docs
npm run typecheck
npm run test:demo
npm run build
npm run check:submit
```

## Judge Checklist

- `/grant/status`: operational readiness and policies.
- `/token`: Bags Trust Index.
- `/token/[mint]`: token market, buy/sell, proof, fee loop, social proof.
- `/passport/[mint]`: shareable Bags Trust Passport.
- `/profile/[wallet]`: Creator Trust Graph and USDT Treasury.
- `/fees`: Fee Reputation Hub.
- `/square`: Token Social Proof.
- `/launch`: Bags-native launch flow.
- `/docs`: public API, integrations, security, grant operations.
