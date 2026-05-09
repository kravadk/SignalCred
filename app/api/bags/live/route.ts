import { NextRequest } from "next/server";
import { getBagsLaunchFeed, getBagsPools } from "@/lib/bags-index";
import { getRestreamReadiness } from "@/lib/restream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function getLiveSnapshot(limit: number) {
  const [feed, pools] = await Promise.all([
    withTimeout(getBagsLaunchFeed(), 4_500, []),
    withTimeout(getBagsPools(true), 4_500, []),
  ]);
  const poolMints = new Set(pools.map((pool) => pool.tokenMint).filter(Boolean));
  const launches = feed.slice(0, limit).map((item) => ({
    mint: item.tokenMint,
    name: item.name ?? `Bags ${item.tokenMint?.slice(0, 4) ?? ""}`,
    symbol: item.symbol ?? "BAGS",
    imageUrl: item.image ?? null,
    status: item.status ?? "live",
    launchSignature: item.launchSignature ?? null,
    poolVerified: item.tokenMint ? poolMints.has(item.tokenMint) : false,
    bagsTokenUrl: item.tokenMint ? `https://bags.fm/${item.tokenMint}` : null,
    source: "bags_feed",
  })).filter((item) => item.mint);

  return {
    launches,
    count: launches.length,
    feedCount: feed.length,
    poolCount: pools.length,
    restream: getRestreamReadiness(),
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 20), 1), 50);
  const stream = req.nextUrl.searchParams.get("stream") === "1";

  if (!stream) {
    const snapshot = await getLiveSnapshot(limit);
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        try {
          const snapshot = await getLiveSnapshot(limit);
          controller.enqueue(encoder.encode(sse("bags-live", snapshot)));
        } catch {
          controller.enqueue(encoder.encode(sse("bags-live-error", {
            error: "Bags live fallback unavailable",
            generatedAt: new Date().toISOString(),
          })));
        }
      };

      await send();
      const interval = setInterval(send, 15_000);
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
