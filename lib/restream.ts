export const RESTREAM_ENDPOINT = "wss://restream.bags.fm";
export const RESTREAM_EVENT = "launchpad_launch:BAGS";

export function getRestreamReadiness() {
  return {
    endpoint: RESTREAM_ENDPOINT,
    event: RESTREAM_EVENT,
    status: "polling-fallback" as const,
    beta: true,
    sdkAvailable: true,
    workerRuntime: "external-worker-recommended",
    sseFallback: "/api/bags/live",
    note: "Installed Bags SDK does not expose ReStream helpers, so BagsPulse uses a Next.js SSE polling fallback now and keeps the websocket worker as the next external-runtime step.",
  };
}
