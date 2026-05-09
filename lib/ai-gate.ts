import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";

/**
 * Standard auth + rate-limit gate for AI endpoints.
 * Returns a NextResponse on rejection, or the wallet string on success.
 */
export function gateAI(req: NextRequest, max = 30, windowMs = 60_000): NextResponse | string {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Compose key with IP so a forged x-wallet still hits the IP's bucket
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "anon";
  const rl = rateLimit(`ai:${wallet}:${ip}`, max, windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit (try again in ${Math.ceil(rl.retryAfterMs/1000)}s)` },
      { status: 429 }
    );
  }
  return wallet;
}
