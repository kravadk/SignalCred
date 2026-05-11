# SignalCred — Project Plan

> Bags launches tokens. SignalCred turns every Bags launch into a verified, tradable, reputation-backed asset profile.

## Idea & Problem

Bags makes launching creator tokens easy, but after launch there is no clear trust layer. Traders see a flood of new tokens and cannot quickly verify the things that actually matter before they buy, promote, or build around one:

- Was this token actually found through Bags?
- Is there pool proof?
- Is the creator / admin wallet known?
- Are the fees real, claimed, and traceable?
- Is social activity token-linked, or just noise?
- Is creator income understandable in stable (USDT) terms?

Today these answers are scattered across Bags, DexScreener, Solscan, Telegram/X, fee-claim tools, and creator profiles — so decisions get made on hype. SignalCred answers all of them in one place, with source-labeled evidence and explorer links.

## Approach

SignalCred indexes Bags data (launch feed, migrated pools, creators API v3, lifetime fees, claim events), market data (Birdeye / DexScreener), and token-linked social activity, and turns it into a public **Trust Passport** per token: source proof, pool proof, creator/admin proof, market proof, fee loop evidence, claim receipts, social proof, USDT funding proof, risk labels, a score breakdown, and an embeddable snippet. Data that does not yet exist is shown as `pending`, `warming`, or `unavailable` — never fabricated.

For the Tether track, SignalCred uses **QVAC** as a private, on-device trust-review layer: the browser fetches real SignalCred proof data, strips anything sensitive (wallet secrets, private keys, RPC URLs) and sends only public evidence JSON to QVAC running locally via the QVAC SDK with LLAMA. QVAC cites evidence IDs, explains the risk labels, and tells the user what to verify — it explains evidence, never invents proof, never replaces the trust score, and in production fails closed (`QVAC unavailable` instead of fake output). Creator economics are shown in USDT terms throughout.

## Key Features

- **Bags Trust Index** — a Bags-wide token universe (not a fixed local list), each row with source labels and risk labels; honest pending states.
- **Token page** — identity, market metrics, SOL/USDT buy-sell panel (re-quotes before swap; funds move only after wallet signature), Evidence block, Fee Loop Evidence, Social Proof, milestones, campaigns, explorer links.
- **Trust Passport** — public, embeddable proof profile per token, with a score breakdown and an `<iframe>` embed snippet other Bags tools can drop in.
- **Creator Trust Graph** — creator reliability score, all known creator tokens, pool/fee/social/campaign history, suspicious patterns, USDT Creator Treasury.
- **Fee Reputation Hub** — top tokens, top creators, fee velocity, verified creators, risky hype — with USDT equivalents and proof links.
- **Token Social Proof (Square)** — token-linked posts only, official creator updates, proof-ranked activity, anti-spam.
- **USDT Creator Treasury / campaign planner** — creator economics and campaign budgets in USDT, with SPL USDT funding proof.
- **Public Trust API + embed widget** — read-only `GET /api/public/token/[mint]/trust|passport`, `GET /api/public/creator/[wallet]/trust`, `GET /embed/trust/[mint]`.
- **Bags-native launch flow** — create metadata → configure Bags fee share → create launch transaction → user signs → backend verifies before marking live.
- **QVAC private trust review** — on `/passport/[mint]`, `/token/[mint]` (Before You Buy), `/profile/[wallet]`, `/square`, `/grant/status`.
- **3 Claude Skills** — token analysis, post composer, creator bio (Anthropic SDK).

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- `@bagsfm/bags-sdk` (token launch / trade / fee claiming), `@solana/web3.js`, `@solana/wallet-adapter-react` (Phantom)
- Bags API (launch feed, pools, creators v3, lifetime fees, claim events), Birdeye (price/charts)
- Neon Postgres + Drizzle ORM
- `@anthropic-ai/sdk` (claude-sonnet) for the 3 Claude Skills
- `@qvac/sdk` for the on-device QVAC trust review (local LLM with LLAMA; embeddings/RAG and NMT translation when configured)
- `lightweight-charts` for OHLCV charts
- Deployed on Vercel; hourly fee-snapshot cron + an external ReStream worker keep fee velocity and live trust signals fresh

## Expected User Outcome

Before buying, promoting, or integrating a Bags token, a user sees in one screen: whether the source is real, whether there is a pool, who the creator is, how much real fee revenue has been collected and claimed, whether social activity is token-linked, and which risk flags apply — each linked to Bags.fm / Solscan / DexScreener / Meteora. Creators build transparent, long-term reputation instead of relying on noise. Other Bags tools embed the Trust Passport or query the public Trust API to reuse this data.

## Roadmap (post-ideathon)

- On-chain trust attestations (signed score / Verifiable Credentials) so the passport is cryptographically verifiable
- Webhook / push alerts (new claim, fee velocity drop, risk flag, milestone)
- Watchlist + portfolio trust health view, with score history over time
- Token comparison view across all proof signals
- Browser extension overlay (Trust Passport badge on bags.fm / DexScreener / X)
- Creator verification flow (wallet-signed ownership) and official-update gating
- QVAC RAG "ask about proof" search over evidence rows
- Public API key tiers for external integrators
- Lightweight `<img>` trust-score badge endpoint
