-- Mode de warmup par campagne : 'accelerated' (14j) ou 'progressive' (40j)
ALTER TABLE warmup_campaigns
  ADD COLUMN IF NOT EXISTS warmup_mode TEXT NOT NULL DEFAULT 'accelerated';
