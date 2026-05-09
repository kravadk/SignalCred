CREATE TABLE IF NOT EXISTS "fee_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_mint" varchar(44) NOT NULL,
  "snapshot_hour" timestamp NOT NULL,
  "lifetime_fees_lamports" bigint NOT NULL,
  "source" varchar(32) DEFAULT 'bags_api' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "fee_snapshots_token_hour_uniq"
  ON "fee_snapshots" ("token_mint", "snapshot_hour");
