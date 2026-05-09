import { PublicKey } from "@solana/web3.js";
import { connection } from "@/lib/bags";

export interface VerifiedLaunchTransaction {
  signature: string;
  mint: string;
  creatorWallet: string;
  slot: number;
  confirmationStatus: "confirmed" | "finalized";
}

function normalizeStatus(status: string | null | undefined): "confirmed" | "finalized" | null {
  if (status === "confirmed" || status === "finalized") return status;
  return null;
}

export async function verifyLaunchTransaction(params: {
  signature: string;
  mint: string;
  creatorWallet: string;
}): Promise<VerifiedLaunchTransaction> {
  const signature = params.signature.trim();
  const mint = new PublicKey(params.mint);
  const creator = new PublicKey(params.creatorWallet);

  const { value } = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });
  const status = value[0];
  const confirmationStatus = normalizeStatus(status?.confirmationStatus);
  if (!status || status.err) throw new Error("Launch transaction is missing or failed");
  if (!confirmationStatus) throw new Error("Launch transaction is not confirmed yet");

  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) throw new Error("Launch transaction could not be read");

  const signedByCreator = tx.transaction.message.accountKeys.some(
    (account) => account.signer && account.pubkey.equals(creator)
  );
  if (!signedByCreator) throw new Error("Launch transaction was not signed by the creator wallet");

  // Mint must be a writable account (i.e. created/initialized in this tx),
  // not a no-op read-only reference inside e.g. a Memo instruction.
  const mintKey = tx.transaction.message.accountKeys.find(
    (account) => account.pubkey.equals(mint)
  );
  if (!mintKey) {
    throw new Error("Launch transaction does not reference the expected token mint");
  }
  if (!mintKey.writable) {
    throw new Error("Launch transaction does not initialize the expected mint (mint is read-only)");
  }

  // Confirm the mint account was actually created/initialized in this tx.
  // 1) Either pre-balance was 0 and post-balance > 0 (newly created), OR
  // 2) An spl-token initializeMint/initializeMint2 instruction targets this mint.
  const accountKeysList = tx.transaction.message.accountKeys.map((a) => a.pubkey);
  const mintIdx = accountKeysList.findIndex((k) => k.equals(mint));
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];
  const newlyFunded = mintIdx >= 0 && (preBalances[mintIdx] ?? 0) === 0 && (postBalances[mintIdx] ?? 0) > 0;

  type ParsedIx = { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } };
  const allIxs: ParsedIx[] = [
    ...(tx.transaction.message.instructions as ParsedIx[]),
    ...((tx.meta?.innerInstructions ?? []).flatMap((i) => i.instructions as ParsedIx[])),
  ];
  const initsThisMint = allIxs.some((ix) => {
    if (ix.program !== "spl-token") return false;
    const t = ix.parsed?.type;
    if (t !== "initializeMint" && t !== "initializeMint2") return false;
    return String(ix.parsed?.info?.mint ?? "") === mint.toBase58();
  });

  if (!newlyFunded && !initsThisMint) {
    throw new Error("Mint was not initialized in this transaction — not a real launch");
  }

  return {
    signature,
    mint: mint.toBase58(),
    creatorWallet: creator.toBase58(),
    slot: tx.slot,
    confirmationStatus,
  };
}
