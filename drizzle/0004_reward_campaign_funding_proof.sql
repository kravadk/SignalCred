ALTER TABLE reward_campaigns ADD COLUMN IF NOT EXISTS funding_tx_signature text;
ALTER TABLE reward_campaigns ADD COLUMN IF NOT EXISTS funded_by_wallet varchar(44);
ALTER TABLE reward_campaigns ADD COLUMN IF NOT EXISTS funded_at timestamp;
ALTER TABLE reward_campaigns ADD COLUMN IF NOT EXISTS funding_asset varchar(20) DEFAULT 'USDT-SPL';
