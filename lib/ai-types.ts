// Shared AI response types — moved out of route files so backward-compat shims
// can stay tiny.
export interface TokenAnalysis {
  sentiment: "bullish" | "neutral" | "bearish";
  score: number;
  summary: string;
  positiveSignals: string[];
  redFlags: string[];
  recommendation: string;
  communityHealth: "active" | "growing" | "quiet" | "dead";
}

export interface TokenDraft {
  description: string;
  lore: string;
  launchPost: string;
  pitch: string;
  tags: string[];
  riskChecklist: string[];
}

export interface TradeSignal {
  signal: "BUY" | "SELL" | "HOLD" | "DEGEN";
  confidence: number;
  reasoning: string;
  bullish: string[];
  bearish: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  priceTarget: string;
}
