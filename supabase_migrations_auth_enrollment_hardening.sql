-- Auth, OTP, and Enrollment hardening migration

-- 1) OTP table enhancements
ALTER TABLE public.profile_verification_otps
  ADD COLUMN IF NOT EXISTS otp_hash text,
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'profile_update' CHECK (purpose IN ('profile_update', 'forgot_password')),
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_hash text,
  ADD COLUMN IF NOT EXISTS proof_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_identifier text;

-- Maintain compatibility for old plaintext rows by seeding empty hashes where missing.
UPDATE public.profile_verification_otps
SET otp_hash = coalesce(otp_hash, '')
WHERE otp_hash IS NULL;

ALTER TABLE public.profile_verification_otps
  ALTER COLUMN otp_hash SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_otps_user_purpose_created
  ON public.profile_verification_otps(user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_otps_target_purpose_created
  ON public.profile_verification_otps(target_identifier, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_otps_active
  ON public.profile_verification_otps(purpose, expires_at)
  WHERE used_at IS NULL AND consumed_at IS NULL;

-- 2) Enrollment/payment status alignment
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'due', 'overdue'));

UPDATE public.subscriptions
SET payment_status = 'paid'
WHERE payment_status IS NULL;

-- 3) Duplicate prevention aids
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower_unique
  ON public.profiles (lower(email));

CREATE INDEX IF NOT EXISTS idx_profiles_phone_lookup
  ON public.profiles (phone);
