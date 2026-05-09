import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TokenDraft {
  description: string;
  lore: string;
  launchPost: string;
  pitch: string;
  tags: string[];
  riskChecklist: string[];
}

export async function generateTokenDraft(params: {
  name: string;
  symbol: string;
  theme?: string;
}): Promise<TokenDraft> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system:
      "You are a creative crypto token copywriter. Generate viral, fun, and authentic content for meme tokens on Solana. Always respond with valid JSON only.",
    messages: [
      {
        role: "user",
        content: `Generate token content for:
Name: ${params.name}
Symbol: ${params.symbol}
Theme: ${params.theme || "meme coin on Solana"}

Return JSON with these exact fields:
{
  "description": "2-3 sentence token description (casual, hype)",
  "lore": "1 paragraph backstory/mythology for the token",
  "launchPost": "Social media launch post (under 280 chars, includes $${params.symbol})",
  "pitch": "One-line pitch for X/Twitter",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "riskChecklist": ["risk1", "risk2", "risk3"]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const text = content.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");

  const parsed = JSON.parse(jsonMatch[0]);
  // Defensive validation — AI sometimes returns wrong shapes
  return {
    description: typeof parsed.description === "string" ? parsed.description : "",
    lore: typeof parsed.lore === "string" ? parsed.lore : "",
    launchPost: typeof parsed.launchPost === "string" ? parsed.launchPost : "",
    pitch: typeof parsed.pitch === "string" ? parsed.pitch : "",
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
    riskChecklist: Array.isArray(parsed.riskChecklist) ? parsed.riskChecklist.map(String).slice(0, 10) : [],
  };
}
