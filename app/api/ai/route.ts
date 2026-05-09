import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { gateAI } from "@/lib/ai-gate";
import { safeError } from "@/lib/safe-error";
import { db } from "@/lib/db";
import { tokens, posts } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getTokenOverview } from "@/lib/birdeye";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Task =
  | "post-draft"
  | "token-draft"
  | "token-analysis"
  | "creator-bio"
  | "trade-signal"
  | "holder-analysis"
  | "raid-brief"
  | "fee-report";

const POST_PROMPTS: Record<string, string> = {
  analysis: "Write a concise on-chain analysis post about $TOKEN. Include 2-3 key signals. Max 220 chars. Crypto casual tone.",
  meme: "Write a funny meme post about $TOKEN. Use emojis. Max 180 chars. Degen energy.",
  update: "Write a community update post for $NAME ($TOKEN). Mention the community. Max 200 chars.",
  trade_idea: "Write a trade idea post for $TOKEN. Include entry signal or thesis. Max 200 chars. NFA disclaimer.",
  launch: "Write a launch announcement for $NAME ($TOKEN). Include hype and CTA. Max 240 chars.",
};

async function runTask(task: Task, payload: Record<string, unknown>): Promise<unknown> {
  switch (task) {
    case "post-draft": {
      const { postType, tokenSymbol, tokenName, context } = payload as {
        postType?: string; tokenSymbol?: string; tokenName?: string; context?: string;
      };
      const tmpl = POST_PROMPTS[postType ?? "update"] ?? POST_PROMPTS.update;
      const prompt = tmpl
        .replace(/\$TOKEN/g, tokenSymbol ?? "TOKEN")
        .replace(/\$NAME/g, tokenName ?? "the project");
      const extra = context ? `\nExtra context: ${String(context).slice(0, 500)}` : "";
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: "You are a crypto community writer for Bags.fm. Write authentic posts. No generic AI filler. Output text only.",
        messages: [{ role: "user", content: prompt + extra }],
      });
      const draft = (msg.content[0] as { type: string; text: string }).text.trim();
      return { draft };
    }

    case "token-draft": {
      const { name, symbol, theme } = payload as { name?: string; symbol?: string; theme?: string };
      if (!name || !symbol) throw new Error("name and symbol required");
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "Crypto token copywriter. Always respond with valid JSON only.",
        messages: [{ role: "user", content: `Generate token content for:
Name: ${name}
Symbol: ${symbol}
Theme: ${theme || "meme coin on Solana"}
JSON: { "description":"", "lore":"", "launchPost":"", "pitch":"", "tags":[], "riskChecklist":[] }` }],
      });
      const text = (msg.content[0] as { type: string; text: string }).text;
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned no JSON");
      const parsed = JSON.parse(m[0]);
      return {
        draft: {
          description: typeof parsed.description === "string" ? parsed.description : "",
          lore: typeof parsed.lore === "string" ? parsed.lore : "",
          launchPost: typeof parsed.launchPost === "string" ? parsed.launchPost : "",
          pitch: typeof parsed.pitch === "string" ? parsed.pitch : "",
          tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
          riskChecklist: Array.isArray(parsed.riskChecklist) ? parsed.riskChecklist.map(String).slice(0, 10) : [],
        },
      };
    }

    case "token-analysis": {
      const { mint } = payload as { mint?: string };
      if (!mint) throw new Error("mint required");
      const [token, marketData, recentPosts] = await Promise.all([
        db.query.tokens.findFirst({ where: eq(tokens.mint, mint) }),
        getTokenOverview(mint),
        db.select().from(posts).where(eq(posts.tokenMint, mint)).orderBy(desc(posts.createdAt)).limit(20),
      ]);
      const ctx = {
        name: token?.name ?? marketData?.name ?? "Unknown",
        symbol: token?.symbol ?? marketData?.symbol ?? "???",
        price: marketData?.price,
        priceChange24h: marketData?.priceChange24hPercent,
        marketCap: marketData?.mc,
        volume24h: marketData?.v24h,
        holders: marketData?.holder,
        postsCount: recentPosts.length,
      };
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "Solana meme token analyst. Honest about red flags. Always JSON only.",
        messages: [{ role: "user", content: `Analyze ${ctx.name} ($${ctx.symbol}):
Price: ${ctx.price ?? "n/a"}, 24h%: ${ctx.priceChange24h ?? "n/a"}, MCap: ${ctx.marketCap ?? "n/a"}, Vol: ${ctx.volume24h ?? "n/a"}, Holders: ${ctx.holders ?? "n/a"}, Posts: ${ctx.postsCount}
JSON: { "sentiment":"bullish|neutral|bearish", "score":0-100, "summary":"", "positiveSignals":[], "redFlags":[], "recommendation":"", "communityHealth":"active|growing|quiet|dead" }` }],
      });
      const text = (msg.content[0] as { type: string; text: string }).text;
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI parse error");
      return { analysis: JSON.parse(m[0]) };
    }

    case "creator-bio": {
      const { wallet: targetWallet } = payload as { wallet?: string };
      if (!targetWallet) throw new Error("wallet required");
      const [tokenRows, postCount] = await Promise.all([
        db.select().from(tokens).where(eq(tokens.creatorWallet, targetWallet)).limit(10),
        db.select({ count: count() }).from(posts).where(eq(posts.authorWallet, targetWallet)),
      ]);
      const liveCount = tokenRows.filter((t) => t.launchStatus === "live").length;
      const tokenList = tokenRows.map((t) => `$${t.symbol}`).join(", ");
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: "Punchy 1-2 sentence creator bios. Casual crypto tone. Output bio text only.",
        messages: [{ role: "user", content: `Wallet: ${targetWallet.slice(0, 8)}…
Tokens: ${tokenRows.length} (${liveCount} live)${tokenList ? ` ${tokenList}` : ""}
Posts: ${postCount[0]?.count ?? 0}
Under 120 chars.` }],
      });
      const bio = (msg.content[0] as { type: string; text: string }).text.trim();
      return { bio };
    }

    case "trade-signal": {
      const { mint, symbol, price, volume24h, buys24h, sells24h, marketCap } = payload as Record<string, unknown>;
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: `Trade signal for $${symbol ?? "TOKEN"} (${String(mint ?? "").slice(0,8)}…)
Price: ${price ?? "n/a"}, Vol24h: ${volume24h ?? "n/a"}, B/S: ${buys24h ?? 0}/${sells24h ?? 0}, MCap: ${marketCap ?? "n/a"}
JSON: { "signal":"BUY|SELL|HOLD|DEGEN", "confidence":0-100, "reasoning":"", "bullish":[], "bearish":[], "riskLevel":"LOW|MEDIUM|HIGH|EXTREME", "priceTarget":"" }` }],
      });
      const text = (msg.content[0] as { type: string; text: string }).text;
      const m = text.match(/\{[\s\S]*\}/);
      return { signal: m ? JSON.parse(m[0]) : null };
    }

    case "holder-analysis": {
      const { mint, holders } = payload as { mint?: string; holders?: unknown[] };
      if (!mint) throw new Error("mint required");
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: `Analyze holders for ${mint}.
Data: ${JSON.stringify(holders ?? []).slice(0, 1500)}
JSON: { "concentration":"low|medium|high|extreme", "top5Pct":0, "rugRisk":"low|medium|high", "distributionHealth":"healthy|concentrated|whale-dominated", "insight":"", "warning":null }` }],
      });
      const text = (msg.content[0] as { text: string }).text;
      const m = text.match(/\{[\s\S]*\}/);
      return { analysis: m ? JSON.parse(m[0]) : { insight: text.slice(0, 200) } };
    }

    case "raid-brief": {
      const { symbol, description, targetUrl, platform } = payload as Record<string, unknown>;
      if (!symbol) throw new Error("symbol required");
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: `Raid brief for $${symbol}.
Desc: ${description ?? "meme on Solana"}, Target: ${targetUrl ?? "Twitter"}, Platform: ${platform ?? "Twitter"}
JSON: { "callToAction":"<100 chars", "tweetTemplate":"<240 chars with $${symbol}", "hashtags":[], "raidGoal":"", "energy":"hype|educational|community|degen" }` }],
      });
      const text = (msg.content[0] as { text: string }).text;
      const m = text.match(/\{[\s\S]*\}/);
      return { brief: m ? JSON.parse(m[0]) : { tweetTemplate: text.slice(0, 240) } };
    }

    case "fee-report": {
      const { symbol, totalFeesSol, claimedSol, unclaimedSol, period } = payload as Record<string, unknown>;
      if (!symbol) throw new Error("symbol required");
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: `Fee report for $${symbol}.
Period: ${period ?? "all time"}. Total: ${totalFeesSol ?? 0} SOL. Claimed: ${claimedSol ?? 0}. Unclaimed: ${unclaimedSol ?? 0}.
JSON: { "headline":"", "creatorEarnings":"", "trend":"growing|stable|declining", "recommendation":"", "milestone":"", "shareableText":"<200 chars" }` }],
      });
      const text = (msg.content[0] as { text: string }).text;
      const m = text.match(/\{[\s\S]*\}/);
      return { report: m ? JSON.parse(m[0]) : { headline: text.slice(0, 150) } };
    }

    default:
      throw new Error(`Unknown task: ${task}`);
  }
}

const VALID_TASKS = new Set<Task>([
  "post-draft", "token-draft", "token-analysis", "creator-bio",
  "trade-signal", "holder-analysis", "raid-brief", "fee-report",
]);

export async function POST(req: NextRequest) {
  const gate = gateAI(req);
  if (typeof gate !== "string") return gate;

  let body: { task?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { task, payload } = body;
  if (!task || !VALID_TASKS.has(task as Task)) {
    return NextResponse.json({ error: `Invalid task. Valid: ${Array.from(VALID_TASKS).join(", ")}` }, { status: 400 });
  }

  try {
    const result = await runTask(task as Task, payload ?? {});
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
