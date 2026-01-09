-- Enable RLS just in case
ALTER TABLE public.member_activity ENABLE ROW LEVEL SECURITY;

-- 1. INSERT Policy
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.member_activity;
CREATE POLICY "Users can insert their own activities"
ON public.member_activity
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = member_id);

-- 2. UPDATE Policy
DROP POLICY IF EXISTS "Users can update their own activities" ON public.member_activity;
CREATE POLICY "Users can update their own activities"
ON public.member_activity
FOR UPDATE
TO authenticated
USING (auth.uid() = member_id)
WITH CHECK (auth.uid() = member_id);

-- 3. DELETE Policy
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.member_activity;
CREATE POLICY "Users can delete their own activities"
ON public.member_activity
FOR DELETE
TO authenticated
USING (auth.uid() = member_id);
