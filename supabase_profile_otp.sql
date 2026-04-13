-- SQL to create the profile_verification_otps table
CREATE TABLE IF NOT EXISTS public.profile_verification_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Turn on RLS
ALTER TABLE public.profile_verification_otps ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own OTP requests
CREATE POLICY "Users can insert own otps"
ON public.profile_verification_otps
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view/update their own OTP requests (for marking as used)
CREATE POLICY "Users can view and update own otps"
ON public.profile_verification_otps
FOR ALL TO authenticated
USING (auth.uid() = user_id);

-- Add an index to speed up OTP lookups by user and code
CREATE INDEX IF NOT EXISTS idx_profile_otps_user ON public.profile_verification_otps(user_id, otp_code);
