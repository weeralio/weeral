-- Add tracking_enabled flag to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN NOT NULL DEFAULT true;
