/**
 * Strip secrets from error messages before returning to clients or logs.
 * Removes RPC URLs, API keys, file paths, env values.
 */
const PATTERNS: Array<[RegExp, string]> = [
  // Helius / QuickNode / Alchemy api-key in URL query
  [/[?&]api-key=[^\s&"']+/gi, "?api-key=[REDACTED]"],
  [/[?&]api_key=[^\s&"']+/gi, "?api_key=[REDACTED]"],
  // Bearer / Authorization tokens
  [/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]"],
  // Anything that looks like a JWT
  [/eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "[JWT]"],
  // Helius RPC subdomain (full URL)
  [/https?:\/\/[a-z0-9.\-]*helius[a-z0-9.\-]*\/[^\s"']*/gi, "https://[helius-rpc]/[REDACTED]"],
  // QuickNode RPC
  [/https?:\/\/[a-z0-9.\-]*quiknode[a-z0-9.\-]*\/[^\s"']*/gi, "https://[quiknode-rpc]/[REDACTED]"],
  // Postgres connection strings
  [/postgres(ql)?:\/\/[^\s"']+/gi, "postgres://[REDACTED]"],
  // Local file paths (Windows + Unix)
  [/[A-Z]:\\[\w\\\-.\s]+/g, "[PATH]"],
];

export function safeError(e: unknown, maxLen = 240): string {
  let msg = e instanceof Error ? `${e.message}${e.cause ? ` | ${String(e.cause)}` : ""}` : String(e);
  for (const [re, repl] of PATTERNS) {
    msg = msg.replace(re, repl);
  }
  return msg.slice(0, maxLen);
}
