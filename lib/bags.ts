import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey, VersionedTransaction, Transaction } from "@solana/web3.js";
import type { TradeQuoteResponse } from "@bagsfm/bags-sdk";

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "processed"
);

function requireBagsKey(): string {
  const k = process.env.BAGS_API_KEY;
  if (!k) {
    throw new Error(
      "BAGS_API_KEY is not set. Configure it in the deployment environment from https://bags.fm developer settings.",
    );
  }
  return k;
}

function createBagsSdk() {
  return new BagsSDK(
    requireBagsKey(),
    connection,
    "processed"
  );
}

type BagsClient = ReturnType<typeof createBagsSdk>;

let cachedSdk: BagsClient | null = null;

export function getBagsSdk() {
  cachedSdk ??= createBagsSdk();
  return cachedSdk;
}

export function isBagsApiConfigured() {
  return Boolean(process.env.BAGS_API_KEY);
}

export const sdk = new Proxy({} as BagsClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getBagsSdk(), prop, receiver);
  },
});

export { connection };

export const BAGS_API_BASE = "https://public-api-v2.bags.fm/api/v1";

export async function bagsRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.BAGS_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${BAGS_API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data: { success?: boolean; error?: string; response?: unknown };
  try {
    data = await res.json();
  } catch {
    // Bags API may return HTML on 5xx
    throw new Error(`Bags API ${res.status} ${res.statusText} (non-JSON response)`);
  }

  if (!data.success) {
    throw new Error(data.error || `Bags API error (HTTP ${res.status})`);
  }

  return data.response as T;
}

export async function createTokenInfoAndMetadata(params: {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}): Promise<{ tokenMint: string; tokenMetadata: string }> {
  const result = await getBagsSdk().tokenLaunch.createTokenInfoAndMetadata({
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    imageUrl: params.imageUrl,
    website: params.websiteUrl,
    twitter: params.twitterUrl,
    telegram: params.telegramUrl,
  });
  return { tokenMint: result.tokenMint, tokenMetadata: result.tokenMetadata };
}

export async function getTradeQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}): Promise<TradeQuoteResponse> {
  return getBagsSdk().trade.getQuote({
    inputMint: new PublicKey(params.inputMint),
    outputMint: new PublicKey(params.outputMint),
    amount: params.amount,
    slippageBps: params.slippageBps ?? 100,
  });
}

export async function createSwapTx(
  quote: TradeQuoteResponse,
  userPublicKey: PublicKey
): Promise<VersionedTransaction> {
  const result = await getBagsSdk().trade.createSwapTransaction({
    quoteResponse: quote,
    userPublicKey,
  });
  return result.transaction;
}

export async function getClaimablePositions(wallet: string) {
  return getBagsSdk().fee.getAllClaimablePositions(new PublicKey(wallet));
}

export async function getClaimTxsForToken(
  wallet: string,
  tokenMint: string
): Promise<Transaction[]> {
  return getBagsSdk().fee.getClaimTransactions(
    new PublicKey(wallet),
    new PublicKey(tokenMint)
  );
}

export function serializeVersionedTx(tx: VersionedTransaction): string {
  return Buffer.from(tx.serialize()).toString("base64");
}

export function serializeLegacyTx(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false }).toString("base64");
}

export { SOL_MINT } from "./constants";
