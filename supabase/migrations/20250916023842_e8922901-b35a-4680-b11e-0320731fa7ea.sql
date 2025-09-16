-- Add last_seen_at to profiles for presence tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Index to query by last_seen_at
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles (last_seen_at DESC);

-- RLS already allows users to update their own profiles; no changes needed