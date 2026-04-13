-- SQL to create the support_queries table
CREATE TABLE IF NOT EXISTS public.support_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Turn on RLS
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own queries
CREATE POLICY "Users can insert their own queries"
ON public.support_queries
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own queries
CREATE POLICY "Users can view their own queries"
ON public.support_queries
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow managers/service role to view all queries
CREATE POLICY "Service role can view all queries"
ON public.support_queries
FOR ALL TO service_role
USING (true);
