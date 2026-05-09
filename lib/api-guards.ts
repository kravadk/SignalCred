import { NextRequest, NextResponse } from "next/server";

export const BASE58_WALLET = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function jsonError(error: string, status: number, errorType: string, userMessage = error) {
  return NextResponse.json({ error, errorType, userMessage }, { status });
}

export function readWallet(req: NextRequest) {
  const wallet = req.headers.get("x-wallet")?.trim() ?? "";
  return BASE58_WALLET.test(wallet) ? wallet : null;
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
