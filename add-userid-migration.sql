-- Add userId column to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Add index for userId for faster queries
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
