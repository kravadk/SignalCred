# Bags Three-Track Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn SignalCred into a focused Bags-native token reputation and social finance layer for the Bags Hackathon.

**Architecture:** Keep the product centered on `/token`, `/token/[mint]`, `/square`, `/fees`, `/launch`, `/hackathon`, and `/docs`. Bags API is the source of truth for token identity, creators, pools, lifetime fees, claim data, and launch flow; local DB enriches those tokens with social activity and user actions.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle, Solana web3.js, Bags SDK/API, DexScreener/Birdeye-style market data, wallet-adapter.

---

### Task 1: Clean Visible Demo Flow

**Files:**
- Modify: `components/square/Feed.tsx`
- Modify: `app/launch/page.tsx`
- Modify: `components/token/TradePanel.tsx`

- [ ] **Step 1: Remove off-track Square links**

Replace the Square rail links with only hackathon-relevant surfaces:

```ts
const items = [
  { icon: Search, href: "/token", label: "Tokens" },
  { icon: Flame, href: "/square", label: "Square", active: true },
  { icon: Coins, href: "/fees", label: "Fees" },
  { icon: Rocket, href: "/launch", label: "Launch" },
  { icon: Trophy, href: "/hackathon", label: "Pitch" },
];
```

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

- [ ] **Step 2: Hide launch calendar from the main demo**

Make `/launch` default to `LaunchStudio` only. Do not show the `Upcoming` calendar tab in the hackathon flow because it competes with Bags API launch logic.

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

- [ ] **Step 3: Remove DCA from token trade panel**

Remove the visible `Now / DCA` schedule selector and force swaps to immediate mode. Keep the trade panel focused on Bags token trading, not generic DeFi automation.

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

---

### Task 2: Make Fees Page a Creator Reputation Hub

**Files:**
- Modify: `app/fees/page.tsx`
- Modify: `components/leaderboard/LeaderboardView.tsx`
- Create: `components/fees/CreatorReputationHub.tsx`
- Use existing: `app/api/leaderboard/route.ts`

- [ ] **Step 1: Create a hub component**

Create `CreatorReputationHub` that fetches `/api/leaderboard` and shows:

```ts
type Row = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  creatorWallet: string | null;
  totalFeesLamports: number;
  socialScore: number;
  reputationScore: number;
  poolVerified: boolean;
  priceChange24hPercent?: number | null;
  volume24h?: number | null;
};
```

The UI must include:
- top token by reputation;
- top creator wallet;
- total lifetime fees;
- table columns: token, creator, lifetime fees, social score, 24h, reputation, Bags proof.

- [ ] **Step 2: Make `/fees` default to reputation**

Change tabs to:
- `Reputation`
- `My Claimable Fees`

Default tab must be `reputation`.

- [ ] **Step 3: Keep claimable fees secondary**

Keep `FeesDashboard` available for wallet users, but do not make it the first impression.

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

---

### Task 3: Fix Token Fees API

**Files:**
- Modify: `app/api/tokens/[mint]/fees/route.ts`
- Use existing: `lib/bags-index.ts`
- Use existing: `app/api/tokens/[mint]/reputation/route.ts`

- [ ] **Step 1: Replace stale Bags path**

Remove this stale request:

```ts
bagsRequest<LifetimeFeeResponse>(`/tokens/${params.mint}/fees/lifetime`)
```

Use:

```ts
getBagsLifetimeFees(params.mint)
getBagsCreators(params.mint)
```

- [ ] **Step 2: Validate mint**

Use:

```ts
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
if (!BASE58.test(params.mint)) {
  return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
}
```

- [ ] **Step 3: Return a normalized split**

Response shape:

```ts
{
  events,
  lifetimeFeesLamports,
  creators,
  split: {
    totalFeeLamports,
    creatorFeeLamports,
    platformFeeLamports
  }
}
```

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

---

### Task 4: Add Risk Flags to Reputation

**Files:**
- Modify: `app/api/tokens/[mint]/reputation/route.ts`
- Modify: `components/token/FeeReputationCard.tsx`

- [ ] **Step 1: Add backend risk flags**

Return:

```ts
riskFlags: Array<{
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
}>
```

Rules:
- no Bags proof -> high
- no creator -> medium
- zero social score -> low
- zero lifetime fees -> low
- market data unavailable -> low

- [ ] **Step 2: Show risk flags in card**

Add a compact “Risk flags” section under pool proof. Do not alarm users when there are no flags; show “No major flags from available data”.

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

---

### Task 5: Add Signature Auth for Sensitive Actions

**Files:**
- Create: `lib/wallet-auth.ts`
- Modify: `app/api/fees/token/[mint]/claim/route.ts`
- Modify: `app/api/raids/route.ts`
- Modify: `app/api/tokens/[mint]/milestones/route.ts`
- Modify: `components/fees/FeesDashboard.tsx`
- Modify: `components/token/CommunityPanel.tsx`

- [ ] **Step 1: Add server wallet auth helper**

Create a helper that reads:
- `x-wallet`
- `x-signature`
- `x-message`

and verifies the signature with `tweetnacl`.

- [ ] **Step 2: Require signed wallet for claim**

Reject unsigned claim requests with:

```ts
return NextResponse.json({ error: "Wallet signature required" }, { status: 401 });
```

- [ ] **Step 3: Require signed wallet for creator-only social actions**

Apply the helper to raids and milestones where the action mutates creator/community state.

- [ ] **Step 4: Add client signing**

Use wallet adapter `signMessage` before calling protected endpoints.

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` exits 0.

---

### Task 6: Verify Demo

**Files:**
- No code files unless verification exposes a bug.

- [ ] **Step 1: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 2: Build**

```powershell
$env:NEXT_DIST_DIR='.next-build-focused'; npm run build
```

Expected: exit 0.

- [ ] **Step 3: Smoke test**

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/token
Invoke-WebRequest -UseBasicParsing http://localhost:3000/fees
Invoke-WebRequest -UseBasicParsing http://localhost:3000/square
Invoke-WebRequest -UseBasicParsing http://localhost:3000/launch
Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/tokens/94rNUftdQYXdiYzpkiM6Stdc9bZrxLNasEYeCM8oBAGS/reputation
```

Expected: all status codes are `200`.

---

### Completion Definition

The work is done when:
- visible product flow only supports the three hackathon tracks;
- `/fees` sells creator reputation first, claimable wallet fees second;
- token fees API uses current Bags helper logic;
- token reputation includes risk flags;
- claim and creator-only mutations require wallet signatures;
- typecheck, production build, and smoke tests pass.
