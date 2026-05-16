# SignalCred Fee Snapshot Cron

Fee Velocity 24h is intentionally not fabricated. It becomes `active` only when SignalCred has a lifetime-fee snapshot baseline at least 24 hours old.

## Endpoint

```txt
POST /api/fees/snapshots?limit=120
Header: x-automation-secret: $AUTOMATION_SECRET
```

The endpoint:

- scans live indexed Bags tokens with Bags proof;
- reads lifetime fees from Bags;
- upserts hourly rows in `fee_snapshots`;
- returns `scanned`, `written`, `failed`, and `lastSnapshotHour`;
- never creates fake generated fees.

## Required Env

```bash
AUTOMATION_SECRET=replace-with-long-random-secret
```

## Vercel Cron Example

Add this to `vercel.json` or the Vercel dashboard:

```json
{
  "crons": [
    {
      "path": "/api/fees/snapshots?limit=120",
      "schedule": "0 * * * *"
    }
  ]
}
```

Vercel Cron cannot set custom headers directly from `vercel.json`, so use one of these production-safe options:

1. Put the call behind a small serverless wrapper that injects `x-automation-secret`.
2. Use GitHub Actions, Railway cron, Trigger.dev, or another scheduler that supports custom headers.
3. Keep Vercel Cron disabled and run a worker/cron service next to the ReStream worker.

## GitHub Actions Example

```yaml
name: fee-snapshots
on:
  schedule:
    - cron: "0 * * * *"
jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - name: Record fee snapshots
        run: |
          curl -X POST "${{ secrets.SIGNALCRED_URL }}/api/fees/snapshots?limit=120" \
            -H "x-automation-secret: ${{ secrets.AUTOMATION_SECRET }}"
```

## Judge / Grant Status

After this has run for 24 hours:

- `/grant/status` should show fresh `fees.latestSnapshotAt`;
- `fees.feeVelocityActiveCount` should increase;
- token/fees pages should show `active` instead of `Baseline warming` where enough data exists.

Before 24 hours, `Baseline warming` is the correct honest state.
