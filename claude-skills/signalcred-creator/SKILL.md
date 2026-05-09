# SignalCred Creator Skill

**Skill ID:** `signalcred-creator`
**Version:** 1.0.0
**Author:** SignalCred
**Live UI:** [https://signalcred.vercel.app](https://signalcred.vercel.app)

---

## Description

The SignalCred Creator Skill helps creators launch, analyze, and grow Bags creator token communities on Solana. It provides structured AI workflows for the full creator token lifecycle: drafting token identity, analyzing community health, composing social posts, and building creator profiles.

This skill is designed to work inside Claude and integrates with the SignalCred API backend.

---

## Auth

All API calls require the Phantom wallet public key in the request header:

```
x-wallet: <phantom-wallet-public-key>
```

No additional login is needed. Wallet address acts as the creator identity.

---

## Base URL

```
https://signalcred.vercel.app/api/ai
```

---

## Workflows

### 1. `token_draft`

**Purpose:** Generate a complete token identity package from a minimal creator brief.

**Trigger phrases:**
- "Draft a token for me"
- "Help me launch a token called..."
- "Generate token metadata for..."

**Input:**

```json
{
  "name": "string — token name, e.g. 'PixelPunk'",
  "symbol": "string — ticker, e.g. 'PXPK'",
  "idea": "string — brief creator concept, 1-3 sentences"
}
```

**API endpoint:** `POST https://signalcred.vercel.app/api/ai/token-draft`

**Expected output:**

```json
{
  "description": "string — max 200 chars, suitable for token metadata",
  "lore": "string — immersive multi-sentence backstory for the token community",
  "launchPost": "string — tweet-length launch announcement, max 280 chars",
  "pitch": "string — investor-friendly one-liner, max 120 chars",
  "tags": ["string"] ,
  "riskChecklist": [
    "string — risk item 1",
    "string — risk item 2",
    "string — risk item 3",
    "string — risk item 4",
    "string — risk item 5"
  ]
}
```

**Field constraints:**
- `description`: exactly ≤ 200 characters. Written as a punchy summary.
- `lore`: 2–5 sentences. Immersive world-building tone. No financial promises.
- `launchPost`: ≤ 280 characters. Written for Twitter/X. Include `$SYMBOL` cashtag.
- `pitch`: ≤ 120 characters. Written for an investor or judge one-pager.
- `tags`: 3–5 tags as plain lowercase strings (e.g. `["art", "gaming", "solana"]`).
- `riskChecklist`: exactly 5 items. Honest and creator-protective. Not legal advice.

**Claude behavior:**
- If the idea is vague, infer genre/theme and fill in creatively.
- Do not hallucinate financial returns.
- Tone: energetic but grounded.
- Prefer Solana-native cultural references when appropriate.

---

### 2. `token_analysis`

**Purpose:** Analyze a token's market and community signals and return a structured health report.

**Trigger phrases:**
- "Analyze this token for me"
- "What's the community health for $TOKEN?"
- "Give me a token analysis for mint..."

**Input:**

```json
{
  "mint": "string — Solana token mint address",
  "communityData": {
    "postCount": "number",
    "likeCount": "number",
    "commentCount": "number",
    "holderCount": "number",
    "recentPosts": ["string — up to 10 recent post texts"],
    "priceChange24h": "number — percentage",
    "volume24h": "number — USD"
  }
}
```

**API endpoint:** `POST https://signalcred.vercel.app/api/ai/token-analysis`

**Expected output:**

```json
{
  "sentiment": "bullish | bearish | neutral",
  "score": "number — 1 to 10, integer",
  "summary": "string — 2-3 sentence plain-language summary",
  "positiveSignals": ["string — up to 5 items"],
  "redFlags": ["string — up to 5 items"],
  "recommendation": "string — 1 sentence action guidance for community members",
  "communityHealth": "healthy | growing | quiet | dead"
}
```

**Field definitions:**
- `sentiment`: overall directional read based on price momentum and social activity.
- `score`: composite health score. 1 = near-dead, 10 = thriving community + strong price.
- `summary`: accessible language, no jargon. Written for a new token visitor.
- `positiveSignals`: what is working (engagement, price, creator activity).
- `redFlags`: honest risks (low volume, inactive creator, concentration of holders).
- `recommendation`: one neutral-toned suggestion (e.g. "Consider engaging the creator before buying in.").
- `communityHealth`:
  - `healthy` — active posts, engaged holders, stable or rising price
  - `growing` — increasing holders and posts, but price may lag
  - `quiet` — token exists but community is not posting or interacting
  - `dead` — no activity in 7+ days, volume near zero

**Claude behavior:**
- Do not give explicit buy/sell advice.
- Use `redFlags: []` if no red flags are present rather than inventing risks.
- If community data is sparse, reflect that in a lower `score` and note it in `summary`.

---

### 3. `post_composer`

**Purpose:** Draft an engaging social post for a token community under 320 characters.

**Trigger phrases:**
- "Write a post for my token"
- "Draft an update for $TOKEN"
- "Compose a meme post for..."

**Input:**

```json
{
  "tokenContext": {
    "name": "string",
    "symbol": "string",
    "description": "string",
    "recentActivity": "string — optional, 1-2 sentences about recent events"
  },
  "postType": "update | meme | analysis | trade"
}
```

**API endpoint:** `POST https://signalcred.vercel.app/api/ai/post-draft`

**Expected output:**

```json
{
  "post": "string — the composed post, max 320 chars",
  "tone": "string — descriptor of the tone used, e.g. 'hype', 'analytical', 'playful'",
  "hashtags": ["string — 1-3 suggested hashtags, no # prefix"]
}
```

**Post type tone guide:**
- `update` — informative, creator-first tone. Community announcement style.
- `meme` — playful, punchy, internet-native humor. Include `$SYMBOL`.
- `analysis` — measured, data-referencing. Written like a micro-thesis.
- `trade` — direct, action-oriented. Neutral on outcome.

**Claude behavior:**
- Always include `$SYMBOL` cashtag in the post.
- Stay under 320 characters for the `post` field.
- Do not use financial advice language ("buy", "guaranteed", "moon", "100x") in `update` or `analysis` types.
- Meme posts may use community-appropriate hype language but must stay tasteful.

---

### 4. `creator_bio`

**Purpose:** Write a compelling creator profile bio and social links copy based on wallet history and launched tokens.

**Trigger phrases:**
- "Write my creator bio"
- "Help me set up my creator profile"
- "Generate a bio for my wallet"

**Input:**

```json
{
  "walletAddress": "string — Solana wallet public key",
  "launchedTokens": [
    {
      "name": "string",
      "symbol": "string",
      "description": "string",
      "launchedAt": "string — ISO date"
    }
  ],
  "creatorHandle": "string — optional Twitter/X handle",
  "focusAreas": ["string — optional, e.g. ['gaming', 'art', 'defi']"]
}
```

**API endpoint:** `POST https://signalcred.vercel.app/api/ai/creator-bio`
*(endpoint is live at https://signalcred.vercel.app — also accessible via interactive UI)*

**Expected output:**

```json
{
  "bio": "string — creator bio, max 280 chars, suitable for profile page",
  "extendedBio": "string — longer version, 2-3 sentences, for the full profile card",
  "socialLinksCopy": {
    "twitterBio": "string — suggested Twitter/X bio text, max 160 chars",
    "linkedinHeadline": "string — professional headline, max 120 chars"
  },
  "creatorTags": ["string — 3-5 tags describing this creator's niche"]
}
```

**Claude behavior:**
- Derive personality and focus from the launched token names, descriptions, and dates.
- If `focusAreas` is provided, lean into those themes.
- Do not fabricate token performance or claim financial success.
- Tone: professional but creator-friendly. Not corporate. Not cringe.
- If only one token has been launched, focus the bio on the creator's niche and vision, not their track record.

---

## Response Format

All endpoints return `application/json`. On error:

```json
{
  "error": "string — human-readable error message",
  "code": "string — machine-readable error code"
}
```

Common error codes:
- `MISSING_WALLET` — `x-wallet` header not provided
- `INVALID_MINT` — mint address could not be resolved
- `RATE_LIMITED` — too many requests from this wallet in the current window
- `INCOMPLETE_INPUT` — required fields missing from request body

---

## Interactive UI

All four workflows are also available as interactive web UI at:

**[https://signalcred.vercel.app](https://signalcred.vercel.app)**

Creators who prefer a no-code experience can use the Launch Studio to run `token_draft`, view AI-generated token analysis on any token page, compose posts from the Square feed, and build their creator profile — all without calling the API directly.

---

## Installation Notes

To use this skill inside Claude:

1. Reference this file as your skill manifest.
2. Provide your Phantom wallet public key when prompted.
3. Invoke any workflow by name or trigger phrase.
4. Claude will call the corresponding API endpoint and return a structured result.

This skill is stateless. No session or cookie management is required. Each request is authenticated via the `x-wallet` header.

---

## Example: token_draft invocation

**User prompt:**
> Draft a token called "SolCat" with symbol "SCAT". The idea is a community around cat memes on Solana, with a charitable angle where a portion of fees goes to cat shelters.

**Claude calls:**
```
POST https://signalcred.vercel.app/api/ai/token-draft
x-wallet: <phantom-public-key>

{
  "name": "SolCat",
  "symbol": "SCAT",
  "idea": "A community around cat memes on Solana with a charitable angle where a portion of fees goes to cat shelters."
}
```

**Claude returns:**
```json
{
  "description": "SolCat is the Solana memecoin with a heart — cat culture, onchain vibes, and real shelter donations baked into every trade.",
  "lore": "In the early days of the Solana blockchain, a colony of stray cats wandered the mempool. No one fed them. Then SolCat arrived. Now every swap fills the bowl — for cats onchain and off.",
  "launchPost": "Introducing $SCAT — the cat meme coin that actually does something. Every trade helps real shelter cats. Join the colony. 🐱 #Solana #SolCat",
  "pitch": "SolCat turns cat meme trading into verifiable shelter donations on Solana.",
  "tags": ["meme", "charity", "cats", "solana", "community"],
  "riskChecklist": [
    "Meme coins are highly speculative — only invest what you can afford to lose.",
    "Charitable fee routing depends on ongoing partner agreements with shelters.",
    "Token price may not reflect community activity or donation volume.",
    "Liquidity may be limited in early trading phases.",
    "Smart contract interactions carry inherent technical risk — verify before signing."
  ]
}
```

---

---

## Workflow 5: holder_analysis

**Endpoint:** `POST https://signalcred.vercel.app/api/ai/holder-analysis`
**Purpose:** Analyze holder concentration risk and rug potential.

**Request body:**
```json
{
  "mint": "<token-mint-address>",
  "holders": [{ "address": "...", "pct": 12.5, "rank": 1, "amount": 125000000 }]
}
```

**Response fields:** `concentration` (low/medium/high/extreme), `top5Pct`, `rugRisk`, `distributionHealth`, `insight`, `warning`

**Example response:**
```json
{
  "analysis": {
    "concentration": "high",
    "top5Pct": 67,
    "rugRisk": "high",
    "distributionHealth": "whale-dominated",
    "insight": "Top 5 wallets control 67% of supply — significant dump risk if any whale exits",
    "warning": "Top holder at 34% poses extreme single-wallet rug risk"
  }
}
```

---

## Workflow 6: raid_brief

**Endpoint:** `POST https://signalcred.vercel.app/api/ai/raid-brief`
**Purpose:** Generate a community raid campaign for a token.

**Request body:**
```json
{
  "symbol": "DUST",
  "description": "The dust from failed VC pitches",
  "targetUrl": "https://x.com/bagsdotfm",
  "platform": "Twitter"
}
```

**Response fields:** `callToAction`, `tweetTemplate`, `hashtags`, `raidGoal`, `energy`

**Example response:**
```json
{
  "brief": {
    "callToAction": "Drop your $DUST — it's our time to shine",
    "tweetTemplate": "VC bags got heavy? $DUST turns your L's into alpha ⚡ Launching on @bagsdotfm — join the revolution #DUST #Solana #SignalCred",
    "hashtags": ["#DUST", "#Solana", "#SignalCred", "#CreatorToken", "#Bags"],
    "raidGoal": "200 likes + 100 retweets on the launch tweet",
    "energy": "degen"
  }
}
```

---

## Workflow 7: fee_report

**Endpoint:** `POST https://signalcred.vercel.app/api/ai/fee-report`
**Purpose:** Generate a shareable creator earnings narrative.

**Request body:**
```json
{
  "symbol": "DUST",
  "totalFeesSol": 1.25,
  "claimedSol": 0.8,
  "unclaimedSol": 0.45,
  "period": "7d"
}
```

**Response fields:** `headline`, `creatorEarnings`, `trend`, `recommendation`, `milestone`, `shareableText`

**Example response:**
```json
{
  "report": {
    "headline": "$DUST generated 1.25 SOL in creator fees this week",
    "creatorEarnings": "1.25 SOL (~$104 at current prices)",
    "trend": "growing",
    "recommendation": "Claim your 0.45 SOL unclaimed fees and run a raid to push volume above the 2 SOL weekly milestone",
    "milestone": "2 SOL/week — needs ~1,600 more trades at average size",
    "shareableText": "My $DUST token earned 1.25 SOL in fees this week 🔥 That's passive income from community trading. Built on @bagsdotfm #CreatorEconomy"
  }
}
```

---

*SignalCred Creator Skill — built for The Bags Hackathon, Claude Skills track.*
