-- ─── Referral system ─────────────────────────────────────────────────────
-- Each user gets a unique referral code. When 3 referred users register,
-- the referrer unlocks PRO features (full referee report, pitch compare).

CREATE TABLE IF NOT EXISTS referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(12) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_id)  -- each user can only be referred once
);

-- Index for fast lookup of referrer stats
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referrals (as referrer)
CREATE POLICY referrals_select_own ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Insert allowed for authenticated users (the system creates referrals on signup)
CREATE POLICY referrals_insert ON referrals
  FOR INSERT WITH CHECK (true);

-- ─── Add referral_code and pro_unlocked to user metadata via a helper table ──
CREATE TABLE IF NOT EXISTS user_referral_codes (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(12) UNIQUE NOT NULL,
  pro_unlocked  BOOLEAN NOT NULL DEFAULT false,
  referral_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY urc_select_own ON user_referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Public can read any code (for validation during signup)
CREATE POLICY urc_select_public ON user_referral_codes
  FOR SELECT USING (true);

-- Insert for authenticated users
CREATE POLICY urc_insert ON user_referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update own record
CREATE POLICY urc_update_own ON user_referral_codes
  FOR UPDATE USING (auth.uid() = user_id);
