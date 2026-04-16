-- 1. Create the OTP table with the correct schema requested by our new codebase
DROP TABLE IF EXISTS public.profile_verification_otps CASCADE;

CREATE TABLE public.profile_verification_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'profile_update' CHECK (purpose IN ('profile_update', 'forgot_password')),
  target_identifier TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  cooldown_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  proof_hash TEXT,
  proof_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS and setup policies
ALTER TABLE public.profile_verification_otps ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Users can insert own otps' AND tablename = 'profile_verification_otps') THEN
    CREATE POLICY "Users can insert own otps" ON public.profile_verification_otps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Users can view and update own otps' AND tablename = 'profile_verification_otps') THEN
    CREATE POLICY "Users can view and update own otps" ON public.profile_verification_otps FOR ALL TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Create necessary indices
CREATE INDEX IF NOT EXISTS idx_profile_otps_user ON public.profile_verification_otps(user_id, otp_hash);
CREATE INDEX IF NOT EXISTS idx_profile_otps_user_purpose_created ON public.profile_verification_otps(user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_otps_target_purpose_created ON public.profile_verification_otps(target_identifier, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_otps_active ON public.profile_verification_otps(purpose, expires_at) WHERE used_at IS NULL AND consumed_at IS NULL;

-- 4. Subscription/Profile guards (just in case they were missing)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'due', 'overdue'));

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS membership_type text default 'digital' check (membership_type in ('digital', 'managed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower_unique ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_phone_lookup ON public.profiles (phone);

-- 5. Give service role full bypass
GRANT ALL ON public.profile_verification_otps TO service_role;

-- 6. Ensure the trigger function properly handles missing metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, phone, business_name, address)
  VALUES (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', 'Unknown User'), 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'address'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
