/**
 * External Bags ReStream worker scaffold.
 *
 * Deploy this on Railway/Fly, not inside the Next.js runtime:
 *   RESTREAM_INGEST_URL=https://your-app.com/api/bags/restream/ingest
 *   RESTREAM_INGEST_SECRET=...
 *   node --experimental-strip-types scripts/restream-worker.ts
 */

import { config } from "dotenv";

config({ path: ".env.local", override: false, quiet: true });
config({ override: false, quiet: true });

const RESTREAM_ENDPOINT = process.env.BAGS_RESTREAM_URL || "wss://restream.bags.fm";
const RESTREAM_EVENT = "launchpad_launch:BAGS";
const INGEST_URL = process.env.RESTREAM_INGEST_URL;
const INGEST_SECRET = process.env.RESTREAM_INGEST_SECRET || process.env.AUTOMATION_SECRET;

type LaunchPayload = {
  mint?: string;
  tokenMint?: string;
  symbol?: string;
  name?: string;
  imageUrl?: string;
  creatorWallet?: string;
  launchId?: string;
  status?: string;
};

function normalizePayload(raw: unknown): LaunchPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const root = raw as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data)
    ? root.data as Record<string, unknown>
    : root;
  const token = data.token && typeof data.token === "object" && !Array.isArray(data.token)
    ? data.token as Record<string, unknown>
    : data;
  const mint = token.mint || token.tokenMint || data.mint || data.tokenMint;
  if (typeof mint !== "string") return null;
  return {
    mint,
    symbol: typeof token.symbol === "string" ? token.symbol : undefined,
    name: typeof token.name === "string" ? token.name : undefined,
    imageUrl: typeof token.imageUrl === "string" ? token.imageUrl : undefined,
    creatorWallet: typeof data.creatorWallet === "string" ? data.creatorWallet : undefined,
    launchId: typeof data.launchId === "string" ? data.launchId : undefined,
    status: typeof data.status === "string" ? data.status : "live",
  };
}

async function ingest(payload: LaunchPayload) {
  if (!INGEST_URL || !INGEST_SECRET) {
    throw new Error("RESTREAM_INGEST_URL and RESTREAM_INGEST_SECRET/AUTOMATION_SECRET are required");
  }
  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-restream-secret": INGEST_SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ingest failed ${res.status}: ${text}`);
  }
}

function connect() {
  const WebSocketCtor = globalThis.WebSocket;
  if (!WebSocketCtor) throw new Error("Global WebSocket is unavailable. Use Node 20+ or add a WebSocket runtime.");
  const ws = new WebSocketCtor(RESTREAM_ENDPOINT);

  ws.addEventListener("open", () => {
    console.log(`[restream] connected ${RESTREAM_ENDPOINT}`);
    ws.send(JSON.stringify({ type: "subscribe", event: RESTREAM_EVENT }));
  });

  ws.addEventListener("message", async (event) => {
    try {
      const parsed = JSON.parse(String(event.data));
      const payload = normalizePayload(parsed);
      if (!payload) return;
      await ingest(payload);
      console.log(`[restream] persisted ${payload.mint}`);
    } catch (error) {
      console.error("[restream] message failed", error);
    }
  });

  ws.addEventListener("close", () => {
    console.warn("[restream] disconnected, reconnecting in 5s");
    setTimeout(connect, 5_000);
  });

  ws.addEventListener("error", (event) => {
    console.error("[restream] websocket error", event);
  });
}

connect();
