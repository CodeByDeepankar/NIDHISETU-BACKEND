-- Run this SQL in your Supabase SQL Editor to add the missing column

ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS "aiAnalysis" jsonb;

ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS "deviceDetails" jsonb;

-- Verify the column was added
-- SELECT * FROM public.submissions LIMIT 1;
