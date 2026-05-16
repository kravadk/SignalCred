# SignalCred ReStream Worker Deploy

This worker is the final production step for the Bags API / Trust Signals Live layer. It keeps a persistent connection to `wss://restream.bags.fm`, listens for `launchpad_launch:BAGS`, and writes launches into the SignalCred ingest endpoint.

## Required Services

- Next.js app deployed with database access.
- Separate worker service on Railway or Fly.
- Same ingest secret configured on both services.

## Next.js App Env

```bash
RESTREAM_INGEST_SECRET=replace-with-long-random-secret
BAGS_RESTREAM_WORKER_URL=https://your-worker-service.example
```

## Worker Env

```bash
RESTREAM_INGEST_URL=https://your-next-app.com/api/bags/restream/ingest
RESTREAM_INGEST_SECRET=replace-with-the-same-secret
BAGS_RESTREAM_URL=wss://restream.bags.fm
```

## Local Smoke Test

With the Next app running:

```bash
npm run worker:restream
```

The worker exits if `RESTREAM_INGEST_URL` or `RESTREAM_INGEST_SECRET` is missing.

## Railway

Create a separate Railway service from this repo and use `Dockerfile.restream-worker`.

```bash
railway up --dockerfile Dockerfile.restream-worker
```

Set worker env vars in Railway dashboard. Keep the Next app as a separate service.

## Fly

```bash
fly launch --config fly.restream.toml --no-deploy
fly secrets set RESTREAM_INGEST_URL=https://your-next-app.com/api/bags/restream/ingest
fly secrets set RESTREAM_INGEST_SECRET=replace-with-the-same-secret
fly deploy --config fly.restream.toml
```

## Judge / Grant Status

After deploy, `/grant/status` and `/hackathon/status` should show:

- `live.restreamConfigured = true`
- `restreamWorker.status = configured`
- `restreamWorker.envReady = true`
- `liveFeed.persistedLiveLaunches > 0` after new launches arrive
- `liveFeed.lastEventAgeSeconds` from the Bags feed or worker-fed cache

Until the worker is deployed, the app should honestly show a polling/SSE fallback instead of pretending the websocket worker is live.
