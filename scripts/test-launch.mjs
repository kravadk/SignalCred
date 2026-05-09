import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "dotenv";
import { readFileSync } from "fs";

// Load .env.local
const env = readFileSync(".env.local", "utf8");
const vars = Object.fromEntries(env.split("\n").filter(l => l.includes("=")).map(l => {
  const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim()];
}));

const BAGS_API_KEY = vars.BAGS_API_KEY;
const SOLANA_RPC = vars.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const PLATFORM_WALLET = vars.BAGS_PLATFORM_WALLET;

console.log("BAGS_API_KEY set:", !!BAGS_API_KEY);
console.log("PLATFORM_WALLET:", PLATFORM_WALLET?.slice(0,8) + "...");
console.log("RPC:", SOLANA_RPC.slice(0, 40));

const connection = new Connection(SOLANA_RPC, "processed");
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

// Step 1: create token info
console.log("\n--- Testing createTokenInfoAndMetadata ---");
try {
  const result = await sdk.tokenLaunch.createTokenInfoAndMetadata({
    name: "TestToken",
    symbol: "TSTX",
    description: "test",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png",
  });
  console.log("✅ tokenMint:", result.tokenMint);
  console.log("✅ metadataUrl:", result.tokenMetadata?.slice(0, 60));

  const mintPubkey = new PublicKey(result.tokenMint);

  // Step 2: fee config
  console.log("\n--- Testing createBagsFeeShareConfig ---");
  const creatorPubkey = new PublicKey(PLATFORM_WALLET);
  const cfg = await sdk.config.createBagsFeeShareConfig({
    feeClaimers: [{ user: creatorPubkey, userBps: 10000 }],
    payer: creatorPubkey,
    baseMint: mintPubkey,
  });
  console.log("✅ meteoraConfigKey:", cfg.meteoraConfigKey?.toBase58()?.slice(0,20));
  console.log("✅ transactions:", cfg.transactions?.length);
  console.log("✅ bundles:", cfg.bundles?.length);

  // Step 3: launch tx
  console.log("\n--- Testing createLaunchTransaction ---");
  const launchTx = await sdk.tokenLaunch.createLaunchTransaction({
    metadataUrl: result.tokenMetadata,
    tokenMint: mintPubkey,
    launchWallet: creatorPubkey,
    initialBuyLamports: 0,
    configKey: cfg.meteoraConfigKey,
  });
  console.log("✅ launchTx serialized length:", launchTx?.serialize()?.length);

} catch (e) {
  console.error("❌ Error:", e?.message ?? String(e));
  if (e?.cause) console.error("   cause:", e.cause);
  if (e?.stack) console.error("   stack:", e.stack.split("\n").slice(0,5).join("\n"));
}
