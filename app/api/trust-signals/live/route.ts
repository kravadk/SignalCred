import { NextRequest } from "next/server";
import { getTrustSignalsLive } from "@/lib/trust-signals-live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 24), 1), 60);
  const stream = req.nextUrl.searchParams.get("stream") === "1";

  if (!stream) {
    const snapshot = await getTrustSignalsLive(limit);
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sse("trust-signals-live", await getTrustSignalsLive(limit))));
        } catch {
          controller.enqueue(encoder.encode(sse("trust-signals-error", {
            error: "Trust signals unavailable",
            generatedAt: new Date().toISOString(),
          })));
        }
      };

      await send();
      const interval = setInterval(send, 20_000);
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
