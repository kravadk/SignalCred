export type Dev3packResource = {
  label: string;
  href: string;
  fit: string;
  signalCredUse: string;
  status: "applied" | "reference" | "next" | "not_primary";
};

export type Dev3packResourceGroup = {
  category: string;
  thesis: string;
  status: "applied" | "bounded" | "next";
  items: string[];
  resources: Dev3packResource[];
};

export const dev3packResourceGroups: Dev3packResourceGroup[] = [
  {
    category: "AI / Vibe Coding",
    status: "bounded",
    thesis: "Useful for shipping faster, but SignalCred should not become an AI-magic scoring app.",
    items: [
      "Keep AI optional and evidence-backed.",
      "Use agent skills for Solana QA, wallet safety, and testing coverage.",
      "Avoid AI-only trust scores; every verdict must map to a proof row.",
    ],
    resources: [
      {
        label: "NoahAI",
        href: "https://trynoah.ai",
        fit: "Vibe-coding assistant for getting from idea to working Solana app faster.",
        signalCredUse: "Reference only: useful as a build workflow benchmark, not a user-facing dependency.",
        status: "reference",
      },
      {
        label: "Solana Skills by SendAI",
        href: "https://solanaskills.com",
        fit: "Agent skill directory for Solana-specific development help.",
        signalCredUse: "Use as QA/support inspiration for wallet, transaction, and Solana integration workflows.",
        status: "reference",
      },
      {
        label: "Agent Skills - Solana",
        href: "https://solana.com/skills",
        fit: "Official and community skills for tooling, frontend, payments, security, testing, DeFi, and infrastructure.",
        signalCredUse: "Directly maps to our security, testing, frontend, wallet, Jupiter/Meteora, Birdeye, and Helius hardening checklist.",
        status: "applied",
      },
      {
        label: "Solana Dev Skill",
        href: "https://github.com/solana-foundation/solana-dev-skill",
        fit: "Official Solana development skill reference.",
        signalCredUse: "Use for wallet signing, transaction confirmation UX, RPC errors, and Solana app testing patterns.",
        status: "applied",
      },
      {
        label: "solana.new",
        href: "https://solana.new",
        fit: "Tasteful crypto app framing: think, build, ship with built-in skills and MCPs.",
        signalCredUse: "Validated the concise pitch: one useful crypto product loop, not a bloated feature dump.",
        status: "reference",
      },
      {
        label: "Awesome Solana AI",
        href: "https://github.com/solana-foundation/awesome-solana-ai",
        fit: "Curated AI tools and resources for Solana builders.",
        signalCredUse: "Roadmap source for optional evidence summaries and agent-readable trust APIs.",
        status: "next",
      },
      {
        label: "RTK",
        href: "https://github.com/rtk-ai/rtk",
        fit: "Developer workflow optimization for reducing LLM token usage on common commands.",
        signalCredUse: "Dev-only productivity reference; not part of SignalCred product UX.",
        status: "reference",
      },
    ],
  },
  {
    category: "Product Ideation",
    status: "applied",
    thesis: "These resources are useful for positioning SignalCred as infrastructure, not another Bags terminal.",
    items: [
      "Pitch SignalCred as a trust and reputation layer.",
      "Make the first demo minute show passport, proof, creator reputation, and safe trade flow.",
      "Use competitor/project galleries to keep the product differentiated from alpha radars and launchpads.",
    ],
    resources: [
      {
        label: "Colosseum Copilot",
        href: "https://colosseum.com/copilot",
        fit: "Submission pressure-test and ecosystem positioning reference.",
        signalCredUse: "Use for final pitch language: problem, why now, why this is infrastructure.",
        status: "reference",
      },
      {
        label: "Colosseum Agent Hackathon Projects",
        href: "https://colosseum.com/agent-hackathon/projects",
        fit: "Competitive gallery of hackathon products and narratives.",
        signalCredUse: "Benchmark against projects that expose proof logs, operational status, and clear demo loops.",
        status: "reference",
      },
      {
        label: "Superteam Build Ideas",
        href: "https://superteam.fun/build/ideas",
        fit: "Idea validation and market framing.",
        signalCredUse: "Supports the grant story: trust infrastructure for creator-token markets.",
        status: "reference",
      },
      {
        label: "SendAI Ideas",
        href: "https://ideas.sendai.fun",
        fit: "Hackathon-ready Solana idea prompts.",
        signalCredUse: "Reference only; SignalCred is already scoped around Bags trust passports.",
        status: "reference",
      },
      {
        label: "Past Hackathon Winners",
        href: "https://superteam.fun/build/past-hackathon-winners",
        fit: "Demo and story quality benchmark.",
        signalCredUse: "Use for final demo polish: show one crisp user journey instead of feature inventory.",
        status: "reference",
      },
      {
        label: "RadiantsDAO Past Winners Thread",
        href: "https://x.com/RadiantsDAO/status/2049549104175268000",
        fit: "Past winner analysis and community signal.",
        signalCredUse: "Reference for presentation style and judging expectations.",
        status: "reference",
      },
    ],
  },
  {
    category: "Developer Stack",
    status: "applied",
    thesis: "SignalCred already uses the right Solana/Next primitives; the main additions are better onboarding and production ops.",
    items: [
      "Keep wallet signing non-custodial and explicit.",
      "Keep server-only keys out of client bundles.",
      "Document local run, env vars, production cron, ReStream worker, and public API endpoints.",
    ],
    resources: [
      {
        label: "Solana Quick Start",
        href: "https://solana.com/docs/intro/quick-start",
        fit: "Official starting point for Solana accounts, transactions, and local setup.",
        signalCredUse: "Reference for README local setup and transaction wording.",
        status: "reference",
      },
      {
        label: "Superteam Developer Tools",
        href: "https://superteam.fun/build/developer-tools",
        fit: "Curated Solana developer tool stack.",
        signalCredUse: "Reference for future integrations and README resource section.",
        status: "reference",
      },
      {
        label: "Solana Developers",
        href: "https://solana.com/developers",
        fit: "Official Solana developer portal.",
        signalCredUse: "Reference for docs links and Solana-native vocabulary.",
        status: "reference",
      },
      {
        label: "Solana Playground",
        href: "https://beta.solpg.io",
        fit: "Browser IDE for quick Solana experiments.",
        signalCredUse: "Not primary scope because SignalCred is Next.js + Bags API, not a custom program demo.",
        status: "not_primary",
      },
      {
        label: "create-solana-dapp",
        href: "https://github.com/solana-foundation/create-solana-dapp",
        fit: "Official template pattern for Solana dApps.",
        signalCredUse: "Reference for run instructions, project structure, and wallet UX conventions.",
        status: "reference",
      },
      {
        label: "Phantom Connect",
        href: "https://docs.phantom.com/phantom-connect",
        fit: "Embedded wallet, connection, spending-limit, and non-custodial wallet onboarding patterns.",
        signalCredUse: "Maps directly to our safe trade copy: no seed phrase, no custody, wallet approval, receipt after signature.",
        status: "applied",
      },
      {
        label: "Solana Installation",
        href: "https://solana.com/docs/intro/installation",
        fit: "Official Solana toolchain setup.",
        signalCredUse: "README reference only; app does not require local validator for demo.",
        status: "reference",
      },
      {
        label: "Swig",
        href: "https://build.onswig.com",
        fit: "Programmable smart wallets on Solana.",
        signalCredUse: "Future creator treasury governance: campaign budgets, controlled spend, and team-safe wallet permissions.",
        status: "next",
      },
      {
        label: "Solana Web3.js",
        href: "https://github.com/solana-foundation/solana-web3.js",
        fit: "JavaScript SDK for Solana transactions and RPC.",
        signalCredUse: "Used in the safe trade path for transaction deserialize, send, confirm, and explorer receipts.",
        status: "applied",
      },
      {
        label: "Solana Developer Bootcamp 2026",
        href: "https://youtube.com/watch?v=2pcm7ICRJKU",
        fit: "Learning/reference material.",
        signalCredUse: "Reference only for deeper Solana development, not product surface.",
        status: "reference",
      },
      {
        label: "Solana Templates",
        href: "https://solana.com/developers/templates",
        fit: "Official templates for faster app scaffolding.",
        signalCredUse: "Reference for README and future example integrations.",
        status: "reference",
      },
      {
        label: "Awesome Solana OSS",
        href: "https://github.com/StockpileLabs/awesome-solana-oss",
        fit: "Curated OSS projects.",
        signalCredUse: "Reference for ecosystem integration ideas.",
        status: "reference",
      },
      {
        label: "pay.sh",
        href: "https://pay.sh",
        fit: "Pay-per-use API/payment primitive.",
        signalCredUse: "Future monetization path for paid trust API / premium passport endpoints.",
        status: "next",
      },
      {
        label: "x402 on Solana",
        href: "https://solana.com/x402",
        fit: "Internet-native payments for APIs and agent access.",
        signalCredUse: "Strong next step: token-gate or payment-gate SignalCred public trust API without subscriptions.",
        status: "next",
      },
      {
        label: "Privy",
        href: "https://docs.privy.io/welcome",
        fit: "Wallet/user onboarding, embedded wallets, policies, and transaction tracking.",
        signalCredUse: "Optional future onboarding for creators who do not already use Phantom/Solflare.",
        status: "next",
      },
    ],
  },
];

export const dev3packResourceComparison = [
  {
    takeaway: "Do not add generic AI features.",
    why: "The AI resources are useful for building and optional summaries, but SignalCred wins by being evidence-backed.",
    action: "Keep score breakdowns tied to Bags, Solscan, fee snapshots, claims, campaigns, and token-linked social proof.",
  },
  {
    takeaway: "Use Phantom Connect ideas without replacing wallet adapters yet.",
    why: "SignalCred already supports wallet signing; the missing part was explaining safe signing and persisting receipts.",
    action: "Keep the new trade stepper, safe signing copy, rejection states, and transaction history.",
  },
  {
    takeaway: "x402/pay.sh are not for token swaps.",
    why: "They are better suited for paid APIs and agent access, not core buy/sell execution.",
    action: "Roadmap: payment-gated public trust API, premium passport monitoring, and agent-readable trust endpoints.",
  },
  {
    takeaway: "Swig is a creator treasury next step.",
    why: "Creator campaigns and USDT budgets eventually need multi-sig/permissioned treasury controls.",
    action: "Roadmap: USDT campaign funded proof -> treasury policy -> controlled campaign spend.",
  },
];
