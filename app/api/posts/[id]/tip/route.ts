import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, feeEvents, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPaymentTransaction } from "@/lib/payment-verification";
import { jsonError, readJson, readWallet, UUID } from "@/lib/api-guards";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID.test(params.id)) return jsonError("Invalid post id", 400, "invalid_post_id", "This post link is invalid. Refresh the feed and try again.");
  const wallet = readWallet(req);
  if (!wallet) return jsonError("Valid wallet required", 401, "invalid_wallet", "Connect a valid wallet before recording a tip.");

  const rl = rateLimit(`tip:${wallet}`, 12, 60_000);
  if (!rl.allowed) return jsonError("Rate limit", 429, "rate_limit", "Too many tip receipts. Wait a moment and try again.");

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body", 400, "invalid_json", "The tip receipt could not be read. Refresh and try again.");
  const txSignature = typeof body.txSignature === "string" ? body.txSignature.trim() : "";
  const amountLamports = body.amountLamports;
  const currency = typeof body.currency === "string" ? body.currency : "SOL";
  if (!txSignature || !amountLamports) {
    return jsonError("txSignature and amountLamports required", 400, "missing_receipt_fields", "Tip receipt needs a transaction signature and amount.");
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(txSignature)) {
    return jsonError("Invalid txSignature", 400, "invalid_signature", "Paste a valid Solana transaction signature.");
  }
  const amt = Number(amountLamports);
  if (!Number.isFinite(amt) || amt <= 0 || amt > 1e15) {
    return jsonError("Invalid amount", 400, "invalid_amount", "Tip amount is invalid.");
  }
  if (currency !== "SOL" && currency !== "USDT") {
    return jsonError("Unsupported currency", 400, "unsupported_currency", "Tips can be recorded only as SOL or USDT.");
  }

  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
  if (!post || !post.tokenMint) return jsonError("Token-linked post not found", 404, "post_not_found", "This post is no longer available in the token proof feed.");

  // Verify tip went on-chain to the post author
  const isUsdt = currency === "USDT";
  const expectedAmount = isUsdt
    ? (amt / 1e6).toString()
    : (amt / 1e9).toString();
  if (!post.authorWallet) {
    return jsonError("Post has no author", 400, "missing_author", "This post cannot receive a tip receipt.");
  }
  try {
    await verifyPaymentTransaction({
      signature: txSignature,
      payerWallet: wallet,
      recipientWallet: post.authorWallet,
      expectedAmount,
      token: isUsdt ? "USDT" : "SOL",
    });
  } catch (e) {
    return jsonError(String(e instanceof Error ? e.message : e).slice(0, 200), 400, "tx_verification_failed", "Could not verify this payment on Solana.");
  }

  // Idempotency on signature
  const dup = await db.query.feeEvents.findFirst({ where: eq(feeEvents.txSignature, txSignature) });
  if (dup) return jsonError("Tip already recorded", 409, "duplicate_receipt", "This tip receipt has already been recorded.");

  await db.insert(users).values({ wallet }).onConflictDoNothing();

  await db.insert(feeEvents).values({
    tokenMint: post.tokenMint ?? undefined,
    wallet,
    eventType: currency === "USDT" ? "tip_usdt" : "tip_sol",
    amountLamports: amt,
    txSignature,
  });

  return NextResponse.json({
    ok: true,
    recipient: post.authorWallet,
    currency: currency ?? "SOL",
  });
}
