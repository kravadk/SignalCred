import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { USDT_MINT } from "@/lib/usdt";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "processed");

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "local";
}

function parsePublicKey(value: string | null, label: string) {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${label}`);
  }
}

async function getMintDecimals(mint: PublicKey | null) {
  if (!mint) return 6;
  const info = await connection.getParsedAccountInfo(mint);
  const data = info.value?.data;
  if (data && typeof data === "object" && "parsed" in data) {
    const decimals = data.parsed?.info?.decimals;
    if (typeof decimals === "number") return decimals;
  }
  return 6;
}

async function getTokenBalance(owner: PublicKey | null, mint: PublicKey | null) {
  if (!owner || !mint) return null;
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });
  return accounts.value.reduce((sum, account) => {
    const uiAmount = account.account.data.parsed?.info?.tokenAmount?.uiAmount;
    return sum + (typeof uiAmount === "number" ? uiAmount : 0);
  }, 0);
}

async function getSolBalance(owner: PublicKey | null) {
  if (!owner) return null;
  const lamports = await connection.getBalance(owner, "processed");
  return lamports / 1e9;
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(`wallet-balances:${clientKey(req)}`, 90, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Rate limited", retryAfterMs: limited.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const wallet = parsePublicKey(searchParams.get("wallet"), "wallet");
    const tokenMint = parsePublicKey(searchParams.get("tokenMint"), "token mint");
    const usdtMint = new PublicKey(USDT_MINT);

    const [tokenDecimals, solBalance, tokenBalance, usdtBalance] = await Promise.all([
      getMintDecimals(tokenMint),
      getSolBalance(wallet),
      getTokenBalance(wallet, tokenMint),
      getTokenBalance(wallet, usdtMint),
    ]);

    return NextResponse.json({
      tokenDecimals,
      solBalance,
      tokenBalance,
      usdtBalance,
      source: "server-rpc",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load wallet balances";
    return NextResponse.json({ error: message }, { status: message.startsWith("Invalid") ? 400 : 502 });
  }
}
