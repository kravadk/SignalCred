# Bags Hackathon Competitor Memory

Use this as the working positioning memory for SignalCred.

## Our Position

SignalCred should not compete as a generic Bags dashboard or "alpha finder".
The sharp wedge is:

- Bags-native token evidence layer
- creator reputation from real Bags fees and pool proof
- token-specific official/community context
- safe launch/import flow that proves every displayed token is Bags-backed

Primary tracks:

- Bags API
- Social Finance
- Fee Sharing / Creator Reputation

Avoid drifting into broad DeFi, general payments, portfolio PnL, HFT bots, or generic discovery.

## Competitors

### Bags Alpha

Source: https://github.com/Zink0909/Bags-Alpha

Core logic:

- early signal radar for Bags tokens
- X/social signal + Bags fee data + Claude NLP
- Attention 30%, Conversion 40%, Momentum 30%
- labels tokens as Breakout, Stealth Gem, Fake Hype, No Signal
- uses ReStream, Supabase snapshots, Telegram alerts, Chrome extension

Threat level: high.

Why strong:

- very focused problem: find tokens before market prices them in
- strong data story: fees, social quality, coordination risk, realtime alerts
- clear extension/bot distribution

Do not copy:

- breakout/alpha prediction
- Telegram alpha alerts
- Chrome overlay as main pitch
- broad "which token will pump" framing

Our counter-position:

- we are not predicting alpha; we verify creator/token truth
- we explain Bags provenance, creator identity, lifetime fees, claims, pool proof, and official updates
- stronger for judges if we show exact API evidence and security/auth boundaries

### BagsPulse

Source: https://dorahacks.io/buidl/43706

Core logic from DoraHacks metadata:

- realtime social finance super dashboard
- aggregates active Bags tokens
- leaderboards, creator scorecards, portfolio PnL, swaps, launchpad
- PulseRouter fee-split protocol for app builders

Threat level: high for broad dashboard overlap.

Why strong:

- directly overlaps with our old broad-dashboard direction
- covers many surfaces judges may recognize quickly

Do not copy:

- "everything dashboard"
- portfolio PnL
- swaps-first UX
- broad launchpad + router protocol story

Our counter-position:

- narrower and deeper: one token evidence page + creator reputation page
- every number should show source/proof/fallback state
- less surface area, more trust

### GitShipt

Source: https://github.com/SYMBaiEX/gitshipt

Core logic:

- launch a Bags token for a GitHub repository
- compute contributor leaderboard from GitHub activity
- claim Bags fees into a pool
- pay contributors by rank
- strong auth/security posture: GitHub OAuth/App, SIWS, Redis idempotency, audit logs, workflows

Threat level: medium-high, but niche is different.

Why strong:

- serious engineering depth
- concrete fee-sharing use case for open-source contributors
- strong security/process story

Do not copy:

- GitHub repo tokenization
- contributor payout product

Our counter-position:

- creator-token reputation across Bags, not repo contributor payouts
- we can borrow the seriousness: idempotency, wallet signatures, audit-like proof blocks, explicit source states

### CreatorPass

Source: https://github.com/Ming7177/creatorpass

Core logic:

- payments-track prototype for creator payment links, fan passes, memberships
- token-gated checkout preview
- fee/royalty split calculator
- static prototype, simulated payments, Bags SDK/API planned but not implemented

Threat level: low-medium.

Why strong:

- clean judge demo flow
- obvious creator monetization use case

Weakness:

- no backend, wallet, DB, real on-chain tx, or live Bags API yet

Do not copy:

- payment links
- fan-pass checkout
- membership checkout

Our counter-position:

- real Bags data beats static checkout simulation
- stay away from payments unless it is directly fee/reputation evidence

### GhostAgent

Source: https://github.com/garib7/GhostAgent-BAGS-Hackathon

Core logic:

- autonomous HFT/scalping bot on Solana
- $GHOST hold-to-use access
- buy-back/burn and Bags LP distribution story
- Flask dashboard, Python strategy/risk modules

Threat level: low for our chosen tracks.

Why notable:

- bold narrative, trading/yield angle

Weakness:

- likely judged as risky/broad DeFi/HFT rather than Bags-native creator infra

Do not copy:

- HFT, trading bot, DCA/risk strategy, profit claims

Our counter-position:

- safer, Bags-native, evidence/reputation infra

### GhostComm

Source: https://github.com/garib7/GhostComm-BAGS-Hackathon

Core logic:

- social middleware for GhostAgent
- turns trading events/burns into social posts
- reads sentiment and routes it back to trading engine
- Node/Express webhook + N8N workflow idea

Threat level: low-medium for Social Finance.

Why notable:

- social automation story

Weakness:

- dependent on GhostAgent, less standalone Bags utility

Do not copy:

- automated hype posting
- agentic trading feedback loops

Our counter-position:

- official creator updates with wallet signature + Bags creator verification
- social context tied to token proof, not hype automation

## Strategic Rules For SignalCred

1. Avoid "alpha prediction"; Bags Alpha owns that lane better.
2. Avoid "super dashboard"; BagsPulse owns that broad framing.
3. Avoid generic payments; CreatorPass owns the payment-link demo lane.
4. Avoid HFT/bot/yield narratives; GhostAgent/GhostComm are already there and it is riskier.
5. Win by being the most trustworthy Bags token evidence layer.
6. Show exact proof blocks: Bags pool, creators, fees, claims, source, stale/fallback status.
7. Make Fee Reputation the hero, not a side card.
8. Make Social Finance about verified creator/community communication, not social hype.
9. Every page should answer: "Can I trust this Bags token and creator?"
10. Demo story: import any Bags mint -> verify proof -> read creator reputation -> inspect official/social context -> launch through Bags-native flow.

## What To Borrow And Improve

### From BagsPulse

Borrow:

- wider Bags token coverage
- visible token table metrics: price, market cap, 24h volume, lifetime fees, 24h fee signal
- creator scorecards and leaderboards
- launch/import flow that feels Bags-native

Improve:

- do not become a broad super-dashboard
- label every metric source: Bags API, Birdeye/DexScreener, local snapshot, fallback
- make every token row link to an evidence page, not just a market page
- separate "lifetime fees", "claimed fees 24h", and "fee velocity 24h" clearly

Implementation note:

- our current small token count comes from a local DB-first index and limited recent Bags sync
- expand index by syncing more Bags feed items and pool records
- enrich rows with market data from Birdeye/DexScreener
- compute true 24h fee velocity by storing hourly snapshots of lifetime fees and diffing against the nearest 24h-old snapshot
- claim-events time mode can power "claimed fees 24h", but it is not the same as generated fees 24h

### From Bags Alpha / CreatorRadar / TokenSight

Borrow:

- clear score dimensions
- explainability and anti-hype framing
- social signal quality controls

Improve:

- avoid prediction framing
- make the score a creator/token trust score, not an alpha score
- show raw proof beside the score

### From BagScan

Borrow:

- better coverage, boards, alerts, and Bags SDK launch seriousness

Improve:

- avoid terminal sprawl
- keep the demo path short: Index -> Evidence Page -> Reputation -> Official Updates -> Launch

### From GitShipt

Borrow:

- security posture: auth checks, idempotency, audit-like trails, typed external boundaries

Improve:

- apply that rigor to Bags creator verification and fee claims without adding GitHub contributor payouts

## Additional Competitor Scan

### TokenSight AI

Source: https://github.com/mrarindam/TokenSight-Ai

Lane: Solana/Bags token intelligence scanner.
Logic: multi-source token scanner using Helius, DexScreener, Birdeye, GeckoTerminal, Bags API, Jupiter, and Meteora; 0-100 Intelligence Score with quality, momentum, confidence, and risk cap.
Threat: high for generic token scoring.
Counter-position: SignalCred must avoid sounding like another scanner. Emphasize Bags-specific proof, creator reputation, source transparency, and token page evidence.

### BagScan

Source: https://github.com/nrlartt/bagscan

Lane: broad Bags discovery and launch terminal.
Logic: Discover, alpha boards, agents, launch, portfolio, alerts, official Bags SDK, partner monetization, notification engine.
Threat: high for broad terminal/dashboard overlap.
Counter-position: do not compete as a terminal. Stay narrower: verified evidence page + fee reputation + official social context.

### CreatorRadar

Source: https://github.com/anjolagithub/creatorradar

Lane: AI momentum scoring for creator tokens.
Logic: "Bloomberg Terminal for Bags.fm" with 0-100 momentum score across holder momentum, fee velocity, price strength, and volume health. Includes top holders/copy-trading angle.
Threat: high for AI score/creator token intelligence.
Counter-position: avoid copy-trading and momentum prediction. Focus on trust/reputation evidence.

### Bags Trust Layer

Source: https://github.com/rudimentall1/bags-trust-layer

Lane: explainable trust/risk scoring.
Logic: Trust Score 0-100, risk level, recommended action, and human-readable reasons.
Threat: high for "trust score" naming overlap.
Counter-position: our score should be grounded in concrete Bags API artifacts: pool, creators, fees, claims, official creator auth, and stale/fallback state.

### BagOS

Source: https://github.com/edycutjong/BagOS

Lane: AI operating system / MCP for Bags creator finance.
Logic: natural-language trade, claim, and launch workflows using Bags SDK.
Threat: medium-high for AI-native creator finance.
Counter-position: do not become command-center AI OS. Keep UI-led evidence and reputation workflow.

### BagFlow

Source: https://github.com/Eniola3321/BagFlow

Lane: automation engine for creator tokens.
Logic: rule-based "if this happens -> do this" automation for trades, alerts, rewards, and holder engagement.
Threat: medium for Social Finance/creator utility.
Counter-position: avoid generic automation. If adding actions, make them proof/auth driven and token-specific.

### BagsFuel

Source: https://github.com/minalkharat-cmd/bagsfuel

Lane: autonomous creator fee growth flywheel / Claude Skill.
Logic: claim creator fees, buy back token, reward holders.
Threat: medium for Fee Sharing.
Counter-position: we should expose fee/claim/reputation truth, not automate buybacks or rewards as the core product.

### Patronage

Source: https://github.com/joachimber/patronage

Lane: token-gated memberships for Bags tokens.
Logic: creators define holding tiers/perks; holders sign wallet messages; balances are checked live; creator ownership verified against Bags SDK.
Threat: medium for creator utility.
Counter-position: not our lane. Avoid membership/perks; use holder verification only if needed for reputation or official updates.

### Blackhole

Source: https://github.com/YousufAziz1/Blackhole

Lane: token-gated quests and campaigns.
Logic: Galxe/Zealy-style Bags campaign platform with wallet login, quest creation, rewards, holder verification, submissions.
Threat: medium for Social Finance.
Counter-position: do not build campaign launcher/quest platform. Our social layer should be token-specific verified context.

### Bags Campaign Launcher

Source: https://github.com/Dev-In-Crypt/Bags_Campaign_Launcher

Lane: campaign launcher scaffold.
Logic: Next.js app, worker, Prisma/Postgres, Redis, Bags client wrapper.
Threat: low-medium; more scaffold than finished product.
Counter-position: avoid campaign tooling unless it directly supports official updates/proof.

### The Bags AI Token Launchpad

Source: https://github.com/mrcodexter/The-Bags-AI-Token-Launchpad

Lane: broad AI token launchpad.
Logic: AI token creation, token preview, multi-wallet support, bonding curve config, MEV/privacy options, analytics, AI agents.
Threat: medium for launch surface, low if broad/unverified.
Counter-position: keep launch Bags-native and evidence-first; avoid overclaiming AI/trading agents.

### Memerush Arena Demo

Source: https://github.com/jesspoex/memerusharenademo

Lane: PvP trading battle platform.
Logic: gamified trading battles, leaderboards, social competition.
Threat: low for our chosen tracks.
Counter-position: avoid trading game mechanics.

### Bags Trading Bot

Source: https://github.com/vanvan95/bags-trading-bot

Lane: unclear trading bot; README is still default React/Vite template.
Threat: low from available evidence.
Counter-position: ignore unless it becomes a real Bags execution bot.

### BagsBlitz

Source: https://github.com/Artem1981777/bagsblitz

Lane: unclear; README is default React/Vite template.
Threat: low from available evidence.

### TrustLink Pay

Source: https://github.com/bigdreamsweb3/trustlink-pay

Lane: phone-number/WhatsApp stablecoin payments on Solana.
Logic: escrow and identity routing through phone-number UX.
Threat: low for Bags tracks unless payments are judged broadly.
Counter-position: avoid generic payments.

### Aura Confidential Creator Fund

Source: https://github.com/dakshrawat298-gif/Aura-Confidential-Creator-Fund

Lane: confidential creator funding / stealth transfers.
Logic: Solana privacy funding with stealth routing and Jupiter pricing; appears more Colosseum/frontier than Bags-native.
Threat: low for Bags track positioning.
Counter-position: avoid privacy/funding scope.

### Unavailable Or Ambiguous

- https://github.com/iam25th1/BagsBrain returned 404 in quick GitHub API scan.
- https://github.com/RedGnad/Tend returned 404 in quick GitHub API scan.
- https://github.com/kaminovaglobal did not reveal an obvious public Bags repo in quick account scan.
