import { PublicKey, type ParsedInstruction, type PartiallyDecodedInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { connection } from "@/lib/bags";
import { USDT_MINT, USDT_PUBKEY, USDT_DECIMALS } from "@/lib/usdt";

type ParsedIx = ParsedInstruction | PartiallyDecodedInstruction;

export type PaymentToken = "SOL" | "USDT";

export interface VerifiedPayment {
  signature: string;
  payerWallet: string;
  recipientWallet: string;
  amount: string;
  token: PaymentToken;
  slot: number;
}

function isParsed(ix: ParsedIx): ix is ParsedInstruction {
  return "parsed" in ix && typeof ix.parsed === "object" && ix.parsed !== null;
}

function tokenAmountToNative(amount: string | number, decimals: number): bigint {
  const [wholeRaw, fracRaw = ""] = String(amount).trim().split(".");
  const whole = wholeRaw || "0";
  const frac = fracRaw.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(frac || "0");
}

async function assertConfirmed(signature: string) {
  const { value } = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });
  const status = value[0];
  if (!status || status.err) throw new Error("Payment transaction is missing or failed");
  if (!["confirmed", "finalized"].includes(status.confirmationStatus ?? "")) {
    throw new Error("Payment transaction is not confirmed yet");
  }
}

export async function verifyPaymentTransaction(params: {
  signature: string;
  payerWallet: string;
  recipientWallet: string;
  expectedAmount: string | number;
  token: PaymentToken;
}): Promise<VerifiedPayment> {
  const signature = params.signature.trim();
  const payer = new PublicKey(params.payerWallet);
  const recipient = new PublicKey(params.recipientWallet);

  await assertConfirmed(signature);

  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) throw new Error("Payment transaction could not be read");

  if (params.token === "SOL") {
    const expectedLamports = tokenAmountToNative(params.expectedAmount, 9);
    const matched = tx.transaction.message.instructions.some((ix) => {
      if (!isParsed(ix) || ix.program !== "system") return false;
      const parsed = ix.parsed as { type?: string; info?: Record<string, unknown> };
      if (parsed.type !== "transfer") return false;
      const info = parsed.info ?? {};
      return (
        String(info.source) === payer.toBase58() &&
        String(info.destination) === recipient.toBase58() &&
        BigInt(String(info.lamports ?? "0")) >= expectedLamports
      );
    });
    if (!matched) throw new Error("SOL transfer does not match payer, recipient, or amount");
  } else {
    const expectedNative = tokenAmountToNative(params.expectedAmount, USDT_DECIMALS);
    const recipientAta = getAssociatedTokenAddressSync(USDT_PUBKEY, recipient);
    const matched = tx.transaction.message.instructions.some((ix) => {
      if (!isParsed(ix) || ix.program !== "spl-token") return false;
      const parsed = ix.parsed as { type?: string; info?: Record<string, unknown> };
      if (!["transfer", "transferChecked"].includes(parsed.type ?? "")) return false;
      const info = parsed.info ?? {};
      const mintOk = !info.mint || String(info.mint) === USDT_MINT;
      const authorityOk = String(info.authority ?? info.owner ?? "") === payer.toBase58();
      const destinationOk = String(info.destination) === recipientAta.toBase58();
      const rawAmount =
        typeof info.amount === "string"
          ? BigInt(info.amount)
          : tokenAmountToNative(
              String((info.tokenAmount as { uiAmountString?: string } | undefined)?.uiAmountString ?? "0"),
              USDT_DECIMALS
            );
      return mintOk && authorityOk && destinationOk && rawAmount >= expectedNative;
    });
    if (!matched) throw new Error("USDT transfer does not match payer, recipient, or amount");
  }

  return {
    signature,
    payerWallet: payer.toBase58(),
    recipientWallet: recipient.toBase58(),
    amount: String(params.expectedAmount),
    token: params.token,
    slot: tx.slot,
  };
}
