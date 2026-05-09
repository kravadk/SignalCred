import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
// ed2curve has no TS types — import via require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ed2curve: { convertPublicKey: (pk: Uint8Array) => Uint8Array | null } = require("ed2curve");
import { PublicKey } from "@solana/web3.js";

// Convert Solana wallet pubkey (Ed25519) to X25519 for nacl box
export function ed25519PkToX25519(walletPk: string): Uint8Array | null {
  try {
    const pk = new PublicKey(walletPk).toBytes();
    return ed2curve.convertPublicKey(pk);
  } catch {
    return null;
  }
}

// Encrypt with recipient's pubkey using ephemeral keypair
export function encryptForRecipient(
  message: string,
  recipientWalletPk: string
): { box: string; ephemeralPk: string; nonce: string } | null {
  const recipientCurvePk = ed25519PkToX25519(recipientWalletPk);
  if (!recipientCurvePk) return null;

  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(24);
  const messageBytes = naclUtil.decodeUTF8(message);

  const box = nacl.box(messageBytes, nonce, recipientCurvePk, ephemeral.secretKey);

  return {
    box: naclUtil.encodeBase64(box),
    ephemeralPk: naclUtil.encodeBase64(ephemeral.publicKey),
    nonce: naclUtil.encodeBase64(nonce),
  };
}
