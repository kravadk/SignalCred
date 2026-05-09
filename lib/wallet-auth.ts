import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const MAX_MESSAGE_AGE_MS = 5 * 60_000;

export type WalletAuthResult =
  | { ok: true; wallet: string; message: string }
  | { ok: false; response: NextResponse };

function fail(message: string, status = 401): WalletAuthResult {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status }),
  };
}

function readMessageValue(message: string, key: string) {
  const line = message.split(/\n|\|/).find((entry) => entry.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim() : null;
}

export function createWalletAuthMessage(input: {
  wallet: string;
  action: string;
  mint?: string;
  timestamp?: number;
}) {
  return [
    "SignalCred wallet verification",
    `wallet:${input.wallet}`,
    `action:${input.action}`,
    input.mint ? `mint:${input.mint}` : null,
    `timestamp:${input.timestamp ?? Date.now()}`,
  ].filter(Boolean).join("|");
}

export function verifyWalletRequest(
  req: NextRequest,
  options: { action: string; mint?: string; maxAgeMs?: number }
): WalletAuthResult {
  const wallet = req.headers.get("x-wallet")?.trim();
  const signature = req.headers.get("x-signature")?.trim();
  const message = req.headers.get("x-message")?.trim();

  if (!wallet || !signature || !message) {
    return fail("Wallet signature required");
  }

  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(wallet);
  } catch {
    return fail("Invalid wallet address", 400);
  }

  const messageWallet = readMessageValue(message, "wallet");
  const action = readMessageValue(message, "action");
  const mint = readMessageValue(message, "mint");
  const timestamp = Number(readMessageValue(message, "timestamp"));

  if (messageWallet !== wallet) return fail("Wallet message mismatch");
  if (action !== options.action) return fail("Wallet action mismatch");
  if (options.mint && mint !== options.mint) return fail("Wallet mint mismatch");
  if (!Number.isFinite(timestamp)) return fail("Invalid wallet timestamp", 400);

  const age = Math.abs(Date.now() - timestamp);
  if (age > (options.maxAgeMs ?? MAX_MESSAGE_AGE_MS)) {
    return fail("Wallet signature expired");
  }

  try {
    const ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      publicKey.toBytes()
    );
    if (!ok) return fail("Invalid wallet signature");
  } catch {
    return fail("Invalid wallet signature", 400);
  }

  return { ok: true, wallet, message };
}
