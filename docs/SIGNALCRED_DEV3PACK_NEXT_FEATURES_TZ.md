# SignalCred Dev3pack Resource Expansion TZ

## Summary

This document captures the next product additions that make sense for SignalCred based on the Dev3pack / Solana resource links.

The goal is not to copy every external tool. The goal is to strengthen SignalCred as **trust and reputation infrastructure for Bags tokens**.

SignalCred should not become a generic AI app, generic launchpad, or alpha radar. Every new feature should reinforce:

- Bags Trust Passport;
- Creator Reputation;
- Fee Loop Evidence;
- Token Social Proof;
- USDT Creator Economy;
- Public Trust API / Embed.

---

## 1. SignalCred Agent Skill / Agent API

### Sources

- `https://solana.com/skills`
- `https://solanaskills.com`
- `https://github.com/solana-foundation/solana-dev-skill`
- `https://github.com/solana-foundation/awesome-solana-ai`

### Idea

Make SignalCred useful beyond the web app: AI agents, Telegram bots, wallets, launch tools, and trading terminals should be able to ask SignalCred for trust context.

### MVP

Add an agent-readable API / skill spec:

- `scan_bags_token(mint)`
- `get_trust_passport(mint)`
- `explain_risk_flags(mint)`
- `get_creator_reputation(wallet)`
- `before_you_buy(mint)`
- `get_fee_loop(mint)`
- `get_social_proof(mint)`

### Behavior

- API is read-only.
- No fake data.
- Every response includes source labels.
- Every proof item includes an explorer or product link when available.
- AI summaries are optional and evidence-backed only.

### UI

Add a `/docs` section:

- `Agent / Bot Integration`;
- request examples;
- sample JSON response;
- clear note that SignalCred scores are not AI-only.

### Why It Matters

This makes SignalCred ecosystem infrastructure, not just a frontend. Other Bags tools can call SignalCred as their trust layer.

---

## 2. Paid / Metered Trust API

### Sources

- `https://solana.com/x402`
- `https://pay.sh`

### Idea

Add a future monetization path without weakening the core demo:

- free public trust summary;
- paid deep passport API;
- paid monitoring;
- paid trust alerts;
- paid creator reputation export.

### MVP

Do not execute payments in the current demo. Add the model to roadmap / docs:

- `Free tier`: public trust summary.
- `Paid tier`: deep passport, monitoring, webhooks.
- `Agent tier`: x402/pay.sh style pay-per-request trust checks.

### Potential Endpoints

- `GET /api/public/token/[mint]/trust`
- `GET /api/public/token/[mint]/passport`
- `GET /api/public/creator/[wallet]/trust`
- `GET /api/public/token/[mint]/watch`
- `POST /api/public/webhooks/trust-alerts`

### UI

In `/grant/status`, show:

- `Public Trust API: available`;
- `Paid API: planned`;
- `x402/pay.sh integration: roadmap`.

### Why It Matters

This gives SignalCred a real business model: trust API access for wallets, bots, launchpads, trading tools, and agent workflows.

---

## 3. Swig Creator Treasury

### Source

- `https://build.onswig.com`

### Idea

The current USDT Creator Treasury Planner is preview-only. The next level is a permissioned creator treasury.

### MVP

Roadmap feature:

- creator treasury policy;
- USDT campaign budget permissions;
- team-safe spending rules;
- campaign wallet with limits;
- no automatic payout without proof;
- funding proof + spending proof.

### Data Model Direction

Possible future tables:

- `creator_treasuries`;
- `treasury_policies`;
- `campaign_spend_receipts`;
- `authorized_spenders`.

### UI

On creator profile:

- `Treasury Policy`;
- `USDT campaign budget`;
- `Authorized spenders`;
- `Funding proof`;
- `Spending receipts`.

### Why It Matters

This strongly improves the Tether / USDT angle: creator income becomes stable, governed, measurable, and reusable for community growth.

---

## 4. Privy Onboarding Mode

### Source

- `https://docs.privy.io/welcome`

### Idea

Make SignalCred easier for creators who do not want to start with Phantom/Solflare complexity.

### MVP

Roadmap, not P0:

- email/social login;
- embedded wallet;
- creator onboarding;
- external wallet connect later;
- safer onboarding copy.

### Constraints

- Do not replace the current wallet adapter flow for the hackathon demo.
- Do not store private keys.
- Explain the custody model clearly.
- All on-chain actions still require explicit approval.

### Why It Matters

This makes SignalCred more mainstream for creator economy users, not only crypto-native traders.

---

## 5. Better Grant Pitch Comparison Block

### Sources

- `https://colosseum.com/copilot`
- `https://colosseum.com/agent-hackathon/projects`
- `https://superteam.fun/build/ideas`
- `https://superteam.fun/build/past-hackathon-winners`
- `https://ideas.sendai.fun`
- `https://x.com/RadiantsDAO/status/2049549104175268000`

### Idea

In `/grant/status` and `/docs`, make the positioning block sharper.

SignalCred is not:

- not an alpha radar;
- not a generic launchpad;
- not a social app;
- not a dashboard;
- not an AI-only scorer.

SignalCred is:

- trust passport for every Bags token;
- creator reputation graph;
- fee loop evidence layer;
- token-linked social proof network;
- USDT-denominated creator economy layer;
- public trust API for the Bags ecosystem.

### MVP

Add a compact block:

- `What we are`;
- `What we are not`;
- `Why this matters for Bags`;
- `Why this can become infrastructure`.

### Why It Matters

Judges and grant reviewers should understand within 30 seconds why SignalCred is not a duplicate of Bags Alpha, CreatorRadar, BagScan, or launchpad projects.

---

## Priority

### P0 - Strongest Next Slice

1. SignalCred Agent Skill / Agent API.
2. Better Grant Pitch Comparison Block.

### P1 - Grant / Business Model Polish

1. Paid / Metered Trust API roadmap.
2. Swig Creator Treasury roadmap.

### P2 - Post-Hackathon Mainstream UX

1. Privy Onboarding Mode.
2. Paid trust alerts and webhooks.
3. Creator treasury policy engine.

---

## Implementation Notes

- Do not introduce fake metrics.
- Do not execute x402/pay.sh payments in the current demo.
- Do not execute automated USDT payouts.
- Keep all write actions wallet-signed.
- Keep public APIs read-only unless explicitly authenticated.
- Every trust claim must map back to Bags, Solscan, fee snapshots, claim events, campaigns, or token-linked social proof.

