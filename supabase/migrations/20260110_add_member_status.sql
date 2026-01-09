-- Add member status enum and column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'member_status'
  ) THEN
    CREATE TYPE public.member_status AS ENUM ('active', 'inactive');
  END IF;
END$$;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'active';

COMMENT ON COLUMN public.members.status IS 'Member account status (active/inactive)';

-- Ensure existing rows are set to active
UPDATE public.members SET status = 'active' WHERE status IS NULL;
