import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  uuid,
  jsonb,
  primaryKey,
  boolean,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  wallet: varchar("wallet", { length: 44 }).primaryKey(),
  username: varchar("username", { length: 50 }).unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  privacyMode: boolean("privacy_mode").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokens = pgTable("tokens", {
  mint: varchar("mint", { length: 44 }).primaryKey(),
  creatorWallet: varchar("creator_wallet", { length: 44 }).references(
    () => users.wallet
  ),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 12 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  twitterUrl: text("twitter_url"),
  telegramUrl: text("telegram_url"),
  whitepaperUrl: text("whitepaper_url"),
  tags: text("tags").array(),
  teamWallets: text("team_wallets").array(),
  bagsLaunchId: text("bags_launch_id"),
  partnerConfig: text("partner_config"),
  launchStatus: varchar("launch_status", { length: 20 }).default("draft"),
  // Migration state mirrors Meteora DBC's on-chain truth (pre-migration vs migrated to DAMM v2).
  // Stored under `metadata.isMigrated` (boolean) and `metadata.migratedAt` (ISO date)
  // so we don't need a schema migration.
  initialBuyLamports: bigint("initial_buy_lamports", { mode: "number" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  launchedAt: timestamp("launched_at"),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotedPostId: uuid("quoted_post_id"),
  authorWallet: varchar("author_wallet", { length: 44 }).references(
    () => users.wallet
  ),
  tokenMint: varchar("token_mint", { length: 44 }).references(
    () => tokens.mint
  ),
  postType: varchar("post_type", { length: 24 }).notNull(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  gatedMint: varchar("gated_mint", { length: 44 }),
  gatedAmount: bigint("gated_amount", { mode: "number" }).default(0),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  repostsCount: integer("reposts_count").default(0).notNull(),
  visibility: varchar("visibility", { length: 20 }).default("public").notNull(),
  pinnedForToken: boolean("pinned_for_token").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Indexes for trending feed and per-token feed queries
  postsCreatedAtIdx: uniqueIndex("posts_created_at_idx").on(t.createdAt, t.id),
  postsTokenMintIdx: uniqueIndex("posts_token_mint_id_idx").on(t.tokenMint, t.id),
  postsAuthorIdx: uniqueIndex("posts_author_id_idx").on(t.authorWallet, t.id),
}));

export const postReviews = pgTable("post_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  wallet: varchar("wallet", { length: 44 }).notNull().references(() => users.wallet),
  reason: varchar("reason", { length: 24 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  postReviewUniq: uniqueIndex("post_reviews_post_wallet_reason_idx").on(t.postId, t.wallet, t.reason),
}));

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => posts.id),
  authorWallet: varchar("author_wallet", { length: 44 }).references(
    () => users.wallet
  ),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable(
  "likes",
  {
    postId: uuid("post_id").notNull().references(() => posts.id),
    wallet: varchar("wallet", { length: 44 }).notNull().references(() => users.wallet),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.wallet] }) })
);

export const reposts = pgTable(
  "reposts",
  {
    postId: uuid("post_id").notNull().references(() => posts.id),
    wallet: varchar("wallet", { length: 44 }).notNull().references(() => users.wallet),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.wallet] }) })
);

// Unified reactions: future like/repost/bookmark all live here.
// Existing `likes` and `reposts` tables stay for backward compat — new endpoints write here.
export const reactions = pgTable(
  "reactions",
  {
    postId: uuid("post_id").notNull().references(() => posts.id),
    wallet: varchar("wallet", { length: 44 }).notNull().references(() => users.wallet),
    kind: varchar("kind", { length: 20 }).notNull(), // "like" | "repost" | "bookmark"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.wallet, t.kind] }) })
);

export const follows = pgTable(
  "follows",
  {
    follower: varchar("follower", { length: 44 }).references(() => users.wallet),
    following: varchar("following", { length: 44 }).references(
      () => users.wallet
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.follower, t.following] }) })
);

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: varchar("wallet", { length: 44 }).references(() => users.wallet),
  inputMint: varchar("input_mint", { length: 44 }),
  outputMint: varchar("output_mint", { length: 44 }),
  inAmount: text("in_amount"),
  outAmount: text("out_amount"),
  priceImpactPct: text("price_impact_pct"),
  txSignature: text("tx_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feeEvents = pgTable("fee_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenMint: varchar("token_mint", { length: 44 }).references(
    () => tokens.mint
  ),
  wallet: varchar("wallet", { length: 44 }),
  eventType: varchar("event_type", { length: 32 }),
  amountLamports: bigint("amount_lamports", { mode: "number" }),
  txSignature: text("tx_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  txSigUniq: uniqueIndex("fee_events_tx_sig_uniq").on(t.txSignature),
}));

// REMOVED: milestones — off-track for Bags hackathon (DB-only "milestones",
// no on-chain enforcement). Drop via drizzle/0001_drop_offtrack_tables.sql.

export const feeSnapshots = pgTable("fee_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenMint: varchar("token_mint", { length: 44 }).notNull(),
  snapshotHour: timestamp("snapshot_hour").notNull(),
  lifetimeFeesLamports: bigint("lifetime_fees_lamports", { mode: "number" }).notNull(),
  source: varchar("source", { length: 32 }).default("bags_api").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tokenHourUniq: uniqueIndex("fee_snapshots_token_hour_uniq").on(t.tokenMint, t.snapshotHour),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientWallet: varchar("recipient_wallet", { length: 44 }).references(() => users.wallet),
  senderWallet: varchar("sender_wallet", { length: 44 }),
  type: varchar("type", { length: 30 }).notNull(), // 'like' | 'comment' | 'follow' | 'tip' | 'launch'
  postId: uuid("post_id"),
  tokenMint: varchar("token_mint", { length: 44 }),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rewardCampaigns = pgTable("reward_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenMint: varchar("token_mint", { length: 44 }).notNull().references(() => tokens.mint),
  creatorWallet: varchar("creator_wallet", { length: 44 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  budgetUsdt: numeric("budget_usdt").notNull(),
  status: varchar("status", { length: 20 }).default("planned").notNull(),
  fundingTxSignature: text("funding_tx_signature"),
  fundedByWallet: varchar("funded_by_wallet", { length: 44 }),
  fundedAt: timestamp("funded_at"),
  fundingAsset: varchar("funding_asset", { length: 20 }).default("USDT-SPL"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  rewardCampaignTokenIdx: uniqueIndex("reward_campaign_token_id_idx").on(t.tokenMint, t.id),
}));

// REMOVED: referrals — Bags has no referral mechanism we tie into.

export const watchlist = pgTable("watchlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: varchar("wallet", { length: 44 }).notNull(),
  tokenMint: varchar("token_mint", { length: 44 }).notNull(),
  priceAlert: numeric("price_alert"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// REMOVED off-track tables (drop via drizzle/0001_drop_offtrack_tables.sql):
//   scheduled_launches — calendar feature, no executor
//   raids, raid_participants — Twitter raid tracker, off-topic
//   messages — DM (Shyft.lol overlap)
//   stealth_jars — server-custodial, not real privacy

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: varchar("room_id", { length: 100 }).notNull(),
  wallet: varchar("wallet", { length: 44 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostReview = typeof postReviews.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type FeeEvent = typeof feeEvents.$inferSelect;
export type FeeSnapshot = typeof feeSnapshots.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type RewardCampaign = typeof rewardCampaigns.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;

// REMOVED: vesting_schedules — DB-only "vesting" with no on-chain enforcement
// REMOVED: multisig_launches — fake approvals (Bags has no multisig primitive)

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: varchar("wallet", { length: 44 }).notNull(),
  agentType: varchar("agent_type", { length: 30 }).notNull(),
  name: varchar("name", { length: 100 }),
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true),
  lastRun: timestamp("last_run"),
  runCount: integer("run_count").default(0),
  totalActions: integer("total_actions").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentLogs = pgTable("agent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id),
  action: varchar("action", { length: 50 }),
  details: jsonb("details"),
  status: varchar("status", { length: 20 }).default("success"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type AgentLog = typeof agentLogs.$inferSelect;

export const paymentLinks = pgTable("payment_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 20 }).notNull().unique(),
  creatorWallet: varchar("creator_wallet", { length: 44 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  amountSol: numeric("amount_sol"),
  amountUsdt: numeric("amount_usdt"),
  acceptedToken: varchar("accepted_token", { length: 44 }),
  isActive: boolean("is_active").default(true),
  paymentCount: integer("payment_count").default(0),
  totalReceived: numeric("total_received").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// REMOVED: subscriptions — generic SaaS, never charged on-chain
// REMOVED: invoices — KYC liability for hackathon scope

export const paymentsLog = pgTable("payments_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentLinkId: uuid("payment_link_id"),
  invoiceId: uuid("invoice_id"),
  payerWallet: varchar("payer_wallet", { length: 44 }).notNull(),
  recipientWallet: varchar("recipient_wallet", { length: 44 }).notNull(),
  amount: numeric("amount").notNull(),
  token: varchar("token", { length: 20 }).default("SOL"),
  txSignature: varchar("tx_signature", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  txSigUniq: uniqueIndex("payments_log_tx_sig_uniq").on(t.txSignature),
}));

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type PaymentLogEntry = typeof paymentsLog.$inferSelect;

export const limitOrders = pgTable("limit_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: varchar("wallet", { length: 44 }).notNull(),
  tokenMint: varchar("token_mint", { length: 44 }).notNull(),
  side: varchar("side", { length: 10 }).notNull(),
  amountSol: numeric("amount_sol").notNull(),
  triggerPrice: numeric("trigger_price").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  filledAt: timestamp("filled_at"),
  txSignature: varchar("tx_signature", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const dcaPlans = pgTable("dca_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: varchar("wallet", { length: 44 }).notNull(),
  tokenMint: varchar("token_mint", { length: 44 }).notNull(),
  amountSol: numeric("amount_sol").notNull(),
  frequencyHours: integer("frequency_hours").default(24),
  nextBuy: timestamp("next_buy").notNull(),
  isActive: boolean("is_active").default(true),
  buysExecuted: integer("buys_executed").default(0),
  totalInvested: numeric("total_invested").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// REMOVED: yield_vaults — fake APY (Date.now()-based) was a compliance risk

export type LimitOrder = typeof limitOrders.$inferSelect;
export type DcaPlan = typeof dcaPlans.$inferSelect;

export const communitySentiment = pgTable(
  "community_sentiment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenMint: varchar("token_mint", { length: 44 }).notNull(),
    wallet: varchar("wallet", { length: 44 }).notNull(),
    vote: varchar("vote", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqMintWallet: uniqueIndex("community_sentiment_mint_wallet_uniq").on(t.tokenMint, t.wallet),
  })
);
export type CommunitySentiment = typeof communitySentiment.$inferSelect;
