# SignalCred Hackathon Submission Checklist

SignalCred is the trust and reputation layer for Bags tokens. It turns every Bags launch into a verifiable asset profile with Bags source proof, pool proof, creator/admin proof, market proof, fee loop evidence, claim receipts, token-linked social proof, USDT-denominated creator economics, public trust APIs, and shareable trust passports.

Status legend:

- ✅ готово
- ⚠️ частково
- ❌ не зроблено
- 🧪 треба протестити
- 📝 треба пояснити в README / demo video

Last local verification:

- ✅ `npm run typecheck`
- ✅ `npm run build`
- ✅ `npm run test:demo` — 99/99
- ✅ `npm run test:browser` — desktop + mobile smoke, no error shell
- ✅ Square no-cost social flow tested by API: post, comment, quote, like, repost, bookmark, detail
- ✅ Local fee snapshot endpoint tested with `AUTOMATION_SECRET`: scanned 12, written 12, failed 0
- ✅ Production automation templates added: hourly fee snapshots and 30-minute health checks via GitHub Actions

---

## 1. Problem And Product Value

- ✅ Конкретна проблема: Bags token buyers and creators do not have one trusted place to verify source, creator, fees, claims, market data, and social proof.
- ✅ User: Bags token traders, creators, communities, hackathon judges, and future ecosystem tools.
- ✅ Result after use: user can inspect a token passport before buying or promoting a Bags token.
- ✅ Web3 reason: source of truth is Bags/Solana/Bags fee data, Solscan receipts, wallet-signed actions, and token-linked proof.
- 📝 У pitch треба казати: `SignalCred is not an alpha radar; it is a trust layer for Bags tokens.`

## 2. Core Concept

- ✅ One-line concept: SignalCred turns every Bags token into a verifiable trust passport.
- ✅ Main loop: discover token -> inspect trust passport -> check before buying -> follow creator/social proof -> observe fee/claim/campaign history.
- ✅ Fits tracks: Bags API, Fee Sharing / Creator Reputation, Social Finance, Tether / USDT.
- ✅ Not over-scoped as generic DeFi/social/AI dashboard.

## 3. Main User Flow

- ✅ Landing explains product.
- ✅ User can open Trust Index.
- ✅ User can open token detail.
- ✅ User can open `/passport/[mint]`.
- ✅ User can open creator reputation profile.
- ✅ User can inspect fees, fee loop, social proof, campaigns, and proof links.
- ✅ Square is token-linked only.
- ⚠️ Wallet-signed launch/swap/claim not executed in local QA to avoid on-chain cost.

## 4. Wallet Interaction

- ✅ Wallet connect UI exists.
- ✅ Manual disconnect clears wallet persistence intent.
- ✅ Reload does not intentionally treat user as logged out.
- ✅ API write routes reject missing wallet/signature where needed.
- 🧪 Manual wallet QA still needed with Phantom/Solflare: connect, reload, disconnect, reject signature, reject tx.
- 📝 Explain in demo: no unsafe write action is accepted without wallet/signature.

## 5. Smart Contracts / On-Chain Logic

- ✅ SignalCred does not deploy a custom EVM contract.
- ✅ Uses Bags SDK/API and Solana wallet-signed transactions.
- ✅ Launch flow is Bags-native.
- ✅ Swap/quote flow is read/signed via Bags/Solana routes.
- ✅ Claims/receipts are represented through Bags fee APIs and Solscan tx links.
- ✅ USDT funding proof is attached as external SPL tx proof, not automatic payout.
- 📝 README should clearly state: no custom smart contract is required for the MVP.

## 6. Transactions

- ✅ Launch without wallet returns `401`.
- ✅ Launch confirm missing fields returns `400`.
- ✅ Swap without wallet returns `401`.
- ✅ Fee claim without wallet returns `401`.
- ✅ Claim receipt without signature rejects.
- ✅ Funding proof without wallet signature rejects.
- ⚠️ Real on-chain launch/swap/claim success path still needs final wallet QA.

## 7. Data Handling

- ✅ Bags token index uses real Bags/Dex/market/proof data.
- ✅ No fake market or fee values are injected.
- ✅ Missing data renders as pending/unavailable.
- ✅ Fee velocity is honest: active only after 24h snapshot baseline.
- ✅ Token avatars are normalized with fallbacks.
- ✅ Every important mint/wallet/tx has explorer link where possible.

## 8. Backend / API

- ✅ Health endpoint works.
- ✅ Token summary, evidence, passport, fees, fee-loop, social-proof, milestones, campaigns work.
- ✅ Public trust API exists:
  - `/api/public/token/[mint]/trust`
  - `/api/public/token/[mint]/passport`
  - `/api/public/creator/[wallet]/trust`
- ✅ Write endpoints validate wallet/signature/rate limits.
- ✅ Social post creation blocks token-less posts.
- ✅ Reaction storage fixed with `reactions` table migration.
- ⚠️ Old generic `test:api` script still includes outdated routes/expectations and should not be used as the submission source of truth.

## 9. Anti-Abuse

- ✅ Token-less Square posts blocked.
- ✅ Duplicate post prevention exists.
- ✅ Rate limits exist for posts/comments and sensitive actions.
- ✅ Official updates require creator/admin proof.
- ✅ Campaign funding proof requires wallet signature.
- ✅ No fake USDT payout execution.
- 🧪 Manual spam-click QA should be repeated before final submit.

## 10. Frontend UX

- ✅ Internal app moved toward compact terminal layout.
- ✅ Trust Index table is the primary first screen.
- ✅ Token page has compact proof sections and right-side trade/checklist panel.
- ✅ Passport is shareable and proof-first.
- ✅ Square is token social proof, not generic Twitter clone.
- ⚠️ Desktop/mobile browser smoke passed. Final human 1920x911 visual review is recommended, but no blocking layout/runtime errors were found.

## 11. Judge UX

- ✅ `/hackathon/status` exists.
- ✅ `/grant/status` exists.
- ✅ Trust Passport exists.
- ✅ Demo flow is clear:
  1. Landing
  2. Trust Index
  3. Token page
  4. Passport
  5. Creator profile
  6. Fees
  7. Square
  8. Launch
  9. Status
- 📝 Demo video should follow this order.

## 12. Track Integration

- ✅ Bags API Track: token index, evidence rows, Bags links, launch flow, ReStream-ready status.
- ✅ Fee Sharing / Creator Reputation: fee loop, lifetime fees, generated 24h baseline, claimed fees, creator graph, risk labels.
- ✅ Social Finance: token-linked Square, official updates, campaigns, milestones, social proof scoring.
- ✅ Tether / USDT: USDT values, treasury planner, campaign budgets, funding proof model.
- ⚠️ External ReStream worker not deployed yet.

## 13. Testing

- ✅ `npm run typecheck`
- ✅ `npm run build`
- ✅ `npm run test:demo`
- ✅ `npm run test:browser`
- ✅ API social action flow manually tested.
- 🧪 Real wallet signature and tx rejection flow needs manual wallet testing.

## 14. README

- DONE: README includes final SignalCred positioning.
- DONE: README includes local run instructions, env vars, demo script, and track mapping.
- DONE: README mentions no-fake-data policy.
- DONE: README explains preview-only actions and no automatic USDT payouts.

## 15. Demo Video

- ❌ Final demo video not confirmed in this checklist.
- 📝 Required structure:
  1. Problem
  2. Landing
  3. Trust Index
  4. Token detail
  5. Trust Passport
  6. Creator Reputation
  7. Fee Loop Evidence
  8. Square Social Proof
  9. Launch flow
  10. Status dashboard

## 16. GitHub / Repository

- 🧪 Need final check before submit:
  - repo public/private as required
  - no `.env.local`
  - no private keys
  - README current
  - demo video link added
  - live demo link added
  - correct project name: SignalCred

## 17. Deployment

- ✅ Production build works locally.
- ✅ Next.js patched to `14.2.35`.
- ⚠️ Live deployment URL still must be checked separately.
- ⚠️ Production env vars must be configured.
- ⚠️ External ReStream worker deploy assets are ready (`Dockerfile.restream-worker`, Railway/Fly configs, worker script); real deployment still needs Railway/Fly credentials and production secrets.
- ⚠️ Hourly fee snapshot workflow template is added in `docs/github-workflows/fee-snapshots.yml`; production activation still needs copying it to `.github/workflows/`, enabling GitHub Actions, plus `SIGNALCRED_URL` and `AUTOMATION_SECRET` repository secrets.
- 🧪 Refresh and deep links must be tested on production URL.

## 18. Bug Prevention

- ✅ No-wallet states tested.
- ✅ Invalid mint/wallet rejects.
- ✅ Missing body rejects.
- ✅ Token-less social rejects.
- ✅ Campaign creation rejects without signature.
- ✅ Claim receipt rejects without signature.
- ✅ Square reactions bug found and fixed.
- 🧪 Real double-click tx actions need manual wallet QA.

## 19. Security Basics

- ✅ API keys stay server-side.
- ✅ Public RPC credentials warning exists for client env.
- ✅ Write actions use wallet/signature where needed.
- ✅ Public trust APIs are read-only.
- ✅ No automatic USDT payout execution.
- ⚠️ Production security review should check CORS, rate limits, env, logs, and deployment config.
- ⚠️ `npm audit --omit=dev` still reports upstream/transitive Solana, Bags SDK, Meteora, Privy, WalletConnect, Drizzle, and Next advisories. Do not use `npm audit fix --force` before submit without a full wallet/launch regression pass, because it proposes breaking adapter/database upgrades.

## 20. Error Handling

- ✅ Missing wallet states return explicit `401`.
- ✅ Invalid input returns `400`.
- ✅ Missing market/fee data shows pending/unavailable.
- ✅ Fee velocity says baseline warming / pending instead of fake values.
- ⚠️ Wallet rejection copy is clearer in launch/trade/liquidity flows; real wallet rejection still needs final manual QA.

## 21. Product Clarity

- ✅ Product is positioned as trust/reputation layer.
- ✅ Not positioned as generic launchpad, alpha radar, or social app.
- ✅ Before You Buy checklist makes value obvious.
- ✅ Passport makes proof shareable.

## 22. Core Loop

- ✅ Creator launches or imports token.
- ✅ Token gets indexed.
- ✅ Proof rows accumulate.
- ✅ Fees/claims/social/campaigns improve reputation.
- ✅ Users inspect before buying.
- ✅ Communities share passport links.

## 23. Data Architecture

- ✅ On-chain/source: Bags, Solana, Solscan, Meteora/Dex sources.
- ✅ Off-chain DB: indexed tokens, posts, reactions, comments, campaigns, fee snapshots, receipts.
- ✅ Frontend: renders proof and pending states, not source of truth.
- ✅ Public API: exposes read-only trust summaries and passport data.
- 📝 README should document this source-of-truth model.

## 24. Observability / Logs

- ✅ Basic action logs exist for posts, reactions, comments, auth errors, and validation errors.
- ✅ Browser QA found no new console errors.
- ⚠️ Production monitoring runbook is documented in `docs/PRODUCTION_OPERATIONS.md`; real notifications must be configured in GitHub/Railway/Fly/Vercel.
- ✅ GitHub Actions health workflow template is added in `docs/github-workflows/production-health.yml` for `/api/health`, `/api/grant/status`, `/api/bags/live`, and `/api/trust-signals/live`.
- ✅ Deployment log/alert rules for ReStream worker and fee snapshot cron are documented.

## 25. Network Config / Addresses

- ✅ Solana/Bags/Solscan links are used.
- ✅ Token mints link to explorer.
- ✅ Bags.fm token links are visible.
- ✅ No custom contract address required.
- ⚠️ Production env must not expose credentialed RPC in client bundle.

## 26. Environment Variables

- ⚠️ Need final `.env.example` audit.
- ✅ Server-only sensitive usage exists.
- ⚠️ Production must configure:
  - `DATABASE_URL`
  - `BAGS_API_KEY`
  - `BAGS_PARTNER_KEY`
  - `SOLANA_RPC_URL`
  - `AUTOMATION_SECRET`
  - optional ReStream env
- ⚠️ External ReStream env is documented and locally smoke-testable; production proof requires deploying the worker with real secrets.

## 27. Build And Local Run

- ✅ `npm run dev` works.
- ✅ `npm run build` works.
- ✅ `npm run typecheck` works.
- ✅ `npm run test:demo` works.
- ✅ `npm run test:browser` works.
- ⚠️ Do not run build and dev/API tests in parallel while deleting `.next`; it can temporarily break dev server.
- ✅ `npm run check:submit` now runs the safe sequence: docs -> typecheck -> dev demo tests -> stop dev -> clean `.next` -> production build.

## 28. Judge Pitch

- ✅ Strong pitch:
  > SignalCred is the trust and reputation layer for Bags tokens. It turns every Bags launch into a verifiable passport with source proof, creator proof, market proof, fee loop evidence, claim receipts, social proof, and USDT creator economics.
- 📝 Avoid:
  - “we find pumps”
  - “we are another Bags terminal”
  - “we are just a launchpad”

## 29. Technical Honesty

- ✅ ReStream worker is readiness/scaffold unless deployed externally.
- ✅ USDT campaigns are preview/funding-proof based, no automatic payout.
- ✅ Fee velocity requires 24h baseline.
- ✅ AI is optional/helper, not the core proof engine.
- ✅ Trust score is evidence-backed, not AI magic.

## 30. Future Plans

- ✅ External ReStream worker with persistent websocket.
- ✅ Hourly fee snapshot cron.
- ✅ Public trust embed adoption by other Bags tools.
- ✅ Wallet/mobile QA.
- ✅ More creator trust graph analytics.
- ✅ Funded campaign proof UX.

## 31. Submission Form

- ✅ Project name: SignalCred.
- ✅ Category suggestion: Data & Analytics or Developer Infrastructure. If only one, choose Data & Analytics for judge clarity.
- ✅ Brief description:
  > SignalCred is the trust and reputation layer for Bags tokens. It turns every Bags launch into a verifiable asset profile with source proof, pool proof, creator/admin proof, fee loop evidence, claim receipts, token-linked social proof, and USDT-denominated creator economics.
- ⚠️ Need live website URL.
- ⚠️ Need GitHub URL.
- ⚠️ Need demo video URL.
- ⚠️ Need final track selection text.

## 32. Minimal Must-Have Before Submit

- ✅ Working local app.
- ✅ Working build.
- ✅ Trust Index.
- ✅ Token detail.
- ✅ Passport.
- ✅ Creator profile.
- ✅ Fees/Reputation.
- ✅ Square.
- ✅ Launch page.
- ✅ Status page.
- ✅ No fake data policy.
- ⚠️ Live deploy URL.
- ⚠️ Demo video.
- ⚠️ README final pass.

## 33. Final 15-Minute Check

- 🧪 Live demo opens.
- 🧪 Wallet connect works.
- 🧪 Main flow works after refresh.
- 🧪 Console has no real errors.
- 🧪 GitHub link public/accessible.
- 🧪 Demo video opens.
- 🧪 No `.env` leaked.
- 🧪 No localhost links in submission.
- 🧪 Judge can understand product in 1 minute.

## 34. Evaluation Chain

SignalCred should show this chain clearly:

Problem -> Bags token trust action -> protocol/API proof -> normalized data -> public passport -> before-buy trust decision -> anti-abuse/security -> clear demo.

- ✅ This chain is visible in current product.
- ⚠️ It must be repeated in README, demo video, and submission text.

---

## SignalCred Grant-Grade Features

### Bags Trust Passport

- ✅ `/passport/[mint]`
- ✅ Public token passport API
- ✅ Proof rows and explorer links
- ✅ No fake data flag

### Creator Trust Graph

- ✅ `/profile/[wallet]`
- ✅ Creator reputation API
- ✅ Public creator trust API
- ✅ Fee loop context

### Trust Signals Live

- ✅ Live/fallback trust signals API
- ✅ UI strip on Index
- ⚠️ External ReStream worker not deployed yet; deploy assets and local worker config are ready.

### Fee Loop Evidence

- ✅ `/api/tokens/[mint]/fee-loop`
- ✅ Generated fees, claimed fees, receipts, campaigns
- ✅ Solscan links when signatures exist
- ✅ Wallet-submitted receipt support

### USDT Creator Treasury

- ✅ Creator treasury planner
- ✅ USDT-denominated fee/reputation values
- ✅ Campaign budgets and funding proof model
- ❌ No automatic payout execution by design

### Public Trust API / Embed

- ✅ Public token trust API
- ✅ Public creator trust API
- ✅ Public passport API
- ✅ Embed page
- ⚠️ API docs/versioning need final README polish

### Grant Status Dashboard

- ✅ `/grant/status`
- ✅ Operational fields for indexed tokens, policies, ReStream readiness, public API, and trust passports
- ⚠️ Production uptime/monitoring not implemented

---

## Submission Priority

### P0 — Must Have Before Submit

- Live demo URL
- Public/accessible GitHub URL
- Final README
- Demo video
- Final wallet QA
- Check no secrets in repo
- Check no localhost links in submission

### P1 — Strong Grant Polish

- External ReStream worker deployed with real Railway/Fly logs
- Hourly fee snapshot cron active in GitHub Actions or another production scheduler
- Production `/grant/status` showing fresh data and ReStream/cron readiness
- Public API docs and embed examples
- Manual mobile screenshots

### P2 — Post-Hackathon Roadmap

- More integrations with Bags ecosystem tools
- Advanced creator trust graph
- More campaign/funding proof UX
- Better production monitoring
- Public SDK/widget for trust badges
