-- Migration: Track Managed vs Digital memberships
-- Managed: Offline students added by manager
-- Digital: Online students using the app

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_type text DEFAULT 'digital' CHECK (membership_type IN ('digital', 'managed'));

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS membership_type text DEFAULT 'digital' CHECK (membership_type IN ('digital', 'managed'));

-- Ensure RLS allows managers to see/update these fields
-- Assuming existing policies cover public.profiles and public.subscriptions access for managers
