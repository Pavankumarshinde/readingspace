-- Add qr_version to rooms for permanent but regenerable entry QRs
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS qr_version INT DEFAULT 0;

-- Add qr_version to subscriptions for permanent but regenerable student passes
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS qr_version INT DEFAULT 0;

-- Optional: Update existing records to start at 0 (redundant due to DEFAULT)
-- UPDATE rooms SET qr_version = 0 WHERE qr_version IS NULL;
-- UPDATE subscriptions SET qr_version = 0 WHERE qr_version IS NULL;
