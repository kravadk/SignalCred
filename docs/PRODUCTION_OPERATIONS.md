# SignalCred Production Operations

This document closes the production-only items that cannot be completed from a local workspace without deploying services.

## External ReStream Worker

Goal: keep `Trust Signals Live` fresh with the official Bags websocket instead of relying only on polling/SSE fallback.

Required env on the Next.js app:

```bash
RESTREAM_INGEST_SECRET=replace-with-long-random-secret
BAGS_RESTREAM_WORKER_URL=https://your-worker-service.example
```

Required env on the worker:

```bash
RESTREAM_INGEST_URL=https://your-app.com/api/bags/restream/ingest
RESTREAM_INGEST_SECRET=replace-with-the-same-secret
BAGS_RESTREAM_URL=wss://restream.bags.fm
```

Deploy options:

- Railway: deploy `Dockerfile.restream-worker` as a separate worker service.
- Fly: deploy with `fly.restream.toml`.
- Any VM/container runner: run `npm run worker:restream`.

Production checks:

- `/grant/status` shows `live.restreamConfigured = true`.
- `/hackathon/status` shows `restreamWorker.status = configured`.
- Worker logs show `[restream] connected`.
- Worker logs show `[restream] persisted <mint>` after new Bags launches.
- Ingest rejects requests without `RESTREAM_INGEST_SECRET`.

Alert rules:

- Alert if worker process exits.
- Alert if no ReStream event or fallback Bags feed update is seen for 30 minutes.
- Alert if ingest endpoint returns non-2xx more than 3 times in 5 minutes.
- Alert if `/api/bags/live` returns 5xx.

## Hourly Fee Snapshot Cron

Goal: make `Generated 24h` active from real Bags lifetime-fee deltas.

This repo includes the workflow template at `docs/github-workflows/fee-snapshots.yml`. Copy it into `.github/workflows/fee-snapshots.yml` when your GitHub token/account has permission to create workflow files. It runs the snapshot endpoint once per hour when GitHub Actions is enabled and these repository secrets exist:

```bash
SIGNALCRED_URL=https://your-app.com
AUTOMATION_SECRET=replace-with-the-production-secret
```

Cron request:

```bash
curl -X POST "https://your-app.com/api/fees/snapshots?limit=120" \
  -H "x-automation-secret: $AUTOMATION_SECRET"
```

Recommended schedule:

```txt
0 * * * *
```

Production checks:

- `/grant/status` shows a recent fee snapshot timestamp.
- Token fee cards show `Generated 24h` as active only after a 24h baseline exists.
- Before 24h, UI says baseline warming instead of showing fake generated fees.

Alert rules:

- Alert if latest snapshot is older than 2 hours.
- Alert if snapshot failure rate is above 20% for 3 consecutive runs.
- Alert if `/api/fees/snapshots` returns 401, because the cron secret is wrong.

## No-Fake-Data Policy

SignalCred must fail closed:

- no fake market caps;
- no fake generated fees;
- no fake claim amounts;
- no fake USDT campaign funding;
- no AI-only score without proof rows;
- missing source data renders as `pending`, `warming`, `unavailable`, or `no pair`.

## Wallet Rejection QA

Manual wallet QA should be done on the deployed URL with Phantom or Solflare:

1. Connect wallet.
2. Reload page and confirm the app reconnects or shows reconnecting state.
3. Start launch, reject signature, confirm the form returns to normal state.
4. Start swap, reject transaction, confirm the quote/action can be retried.
5. Start claim/funding proof action, reject signature, confirm no local proof is written.
6. Disconnect manually and confirm persistence marker is cleared.

Expected user-facing copy:

- `Transaction rejected in wallet. Nothing was changed.`
- `Launch cancelled in wallet. No token was created.`
- `Signature rejected. No proof was saved.`
- `Network was slow - refresh the quote and try again.`

## Demo-Day Runbook

This repo also includes the workflow template at `docs/github-workflows/production-health.yml`. Copy it into `.github/workflows/production-health.yml` when workflow file writes are enabled. It checks core production endpoints every 30 minutes when GitHub Actions is enabled and `SIGNALCRED_URL` is configured as a repository secret.

Before submitting or presenting:

```bash
npm run typecheck
npm run test:demo
npm run build
```

Do not run `next build` while `next dev` is active on the same `.next` directory — that can produce temporary 500/404 errors for `_next/static` chunks. Stop the dev server first, then run typecheck → test:demo → build in order.

Then manually open:

- `/`
- `/token`
- `/token/[mint]`
- `/passport/[mint]`
- `/profile/[wallet]`
- `/fees`
- `/square?token=[mint]`
- `/launch`
- `/grant/status`

Confirm no console errors except browser extension noise.

## Dependency Audit Policy

The project intentionally avoids `npm audit fix --force` during the final submission window. Current unresolved production audit findings are mostly upstream/transitive dependencies from Solana wallet adapters, Bags SDK, Meteora, Privy/WalletConnect, Drizzle, and related crypto packages.

Safe local fix applied:

- `next` updated to `14.2.35`.

Before applying breaking security upgrades in production, run a full regression pass:

```bash
npm run typecheck
npm run test:demo
npm run build
```

Then manually test wallet connect, launch signing, swap quote/signing, claim receipt, campaign funding proof, and Square social actions with Phantom/Solflare.
