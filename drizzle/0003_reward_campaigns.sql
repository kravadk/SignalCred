CREATE TABLE IF NOT EXISTS "reward_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_mint" varchar(44) NOT NULL,
  "creator_wallet" varchar(44) NOT NULL,
  "title" varchar(120) NOT NULL,
  "description" text,
  "budget_usdt" numeric NOT NULL,
  "status" varchar(20) DEFAULT 'planned' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "reward_campaigns"
    ADD CONSTRAINT "reward_campaigns_token_mint_tokens_mint_fk"
    FOREIGN KEY ("token_mint") REFERENCES "tokens"("mint");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "reward_campaign_token_id_idx"
  ON "reward_campaigns" ("token_mint", "id");
