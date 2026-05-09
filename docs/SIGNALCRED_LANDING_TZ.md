# SignalCred Landing + Wallet Persistence TZ

## Positioning

SignalCred is the Bags-native launch, trust, and social finance layer.

The landing page should sell one clear story: a creator launches through Bags, then immediately gets a verified token page, official creator post, fee loop evidence, creator reputation, token social proof, and a USDT campaign layer.

## Landing Requirements

- Replace the `/` redirect with a real product landing page.
- Use `SignalCred` as the brand everywhere on the landing.
- Do not use competitor branding in landing copy.
- Hero headline: `Launch Bags tokens people can actually trust`.
- Hero copy: `Create a Bags-native token, publish verified creator updates, prove fees and claims, and turn community activity into token reputation.`
- Primary CTA: `Launch Token` -> `/launch`.
- Secondary CTA: `Explore Trust Index` -> `/token`.
- Status CTA: `View Hackathon Status` -> `/hackathon/status`.

## Visual Direction

Concept: `SignalCred Trust Observatory`.

The hero should feel like a premium trust terminal, not an NFT cartoon clone:

- A full-bleed Three.js launch core/token scene.
- Orbiting proof nodes: Bags API, Creator Proof, Fee Loop, Claim Receipt, Social Proof, USDT Campaign.
- Dense but readable information hierarchy.
- No fake stats. Use capability labels and real system links unless live values are already available.

## Required Sections

1. Preloader: `Preparing SignalCred trust layer`.
2. Hero with 3D trust observatory scene.
3. Source strip: Bags API, Solscan, DexScreener, Meteora, USDT, Fee Snapshots.
4. Product pillars:
   - Bags-native Launch
   - Trust Index
   - Fee Loop Evidence
   - Token Social Proof
5. Interactive preview tabs:
   - Launch
   - Trust
   - Fees
   - Social
6. How it works:
   - Launch through Bags
   - Token page created
   - Official creator post published
   - Fees, claims, and social proof build reputation
7. Track section:
   - Bags API
   - Fee Sharing / Creator Reputation
   - Social Finance
   - Tether / USDT
8. Final CTA and footer.

## Wallet Persistence

Use the localStorage key:

```txt
signalcred.wallet.autoconnect
```

Behavior:

- After a successful wallet connection, store the key as `"true"`.
- On reload, preserve reconnect intent and show `Reconnecting...` while wallet adapter autoConnect attempts recovery.
- Manual `Disconnect` clears the key.
- A reload should not visually look like a deliberate logout.

## Test Coverage

The demo suite should verify:

- `/` returns `200`, not a redirect.
- Landing includes `SignalCred`.
- Landing includes `Launch Bags tokens people can actually trust`.
- Landing includes `Launch Token`.
- Landing includes `Explore Trust Index`.
- Landing includes `Fee Loop Evidence`.
- Landing includes `Token Social Proof`.
- Landing links include `/launch`, `/token`, `/fees`, `/square`, and `/hackathon/status`.
