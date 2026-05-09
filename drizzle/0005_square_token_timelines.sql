ALTER TABLE posts ADD COLUMN IF NOT EXISTS quoted_post_id uuid;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility varchar(20) DEFAULT 'public' NOT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_for_token boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS post_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL REFERENCES posts(id),
  wallet varchar(44) NOT NULL REFERENCES users(wallet),
  reason varchar(24) NOT NULL,
  note text,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS post_reviews_post_wallet_reason_idx
  ON post_reviews (post_id, wallet, reason);
