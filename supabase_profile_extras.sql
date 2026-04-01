-- Migration: Add bio column to profiles for 'Other Information'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text, -- Ensure phone is there (should be from before)
ADD COLUMN IF NOT EXISTS bio text;

-- Update RLS if needed (already should allow own profile update)
