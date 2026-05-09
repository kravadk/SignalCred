CREATE TABLE IF NOT EXISTS reactions (
  post_id uuid NOT NULL REFERENCES posts(id),
  wallet varchar(44) NOT NULL REFERENCES users(wallet),
  kind varchar(20) NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT reactions_post_wallet_kind_pk PRIMARY KEY (post_id, wallet, kind)
);
