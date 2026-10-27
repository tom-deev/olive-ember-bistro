-- ============================================================================
-- OLIVE & EMBER BISTRO — SQL MIGRATION: PROTECTED RESERVATIONS & USER OWNERSHIP
-- File: supabase/migrations/20261027_auth_protected_reservations.sql
-- ============================================================================
-- WHAT THIS MIGRATION CHANGES:
-- 1. Safely adds `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL`
--    to `public.reservations` without a NOT NULL table constraint so existing
--    reservation rows (if any) are preserved without error.
-- 2. Adds an index `idx_reservations_user_id_created_at` for fast lookup of a
--    customer's own reservation requests.
-- 3. Drops the legacy permissive public insert policy
--    ("Public visitors can submit pending reservation requests").
-- 4. Revokes `INSERT`, `SELECT`, `UPDATE`, and `DELETE` privileges on
--    `public.reservations` from the `anon` (unauthenticated) role, and revokes
--    `UPDATE` and `DELETE` from `authenticated` so customers cannot modify or
--    delete existing records.
-- 5. Creates strict Row Level Security (RLS) policies on `public.reservations`:
--    - INSERT: Authenticated users can ONLY insert pending reservations where
--      `user_id = auth.uid()`.
--    - SELECT: Authenticated users can ONLY read their own reservations where
--      `user_id = auth.uid()`.
-- 6. Leaves `public.menu_items` and its policies completely untouched.
--
-- HOW TO RUN MANUALLY IN SUPABASE:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Copy and paste the entire contents of this file and click "Run".
-- ============================================================================

-- 1. Safely add `user_id` column to `public.reservations` (nullable for legacy rows)
ALTER TABLE public.reservations
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.reservations.user_id IS 'Authenticated Supabase user ID (auth.users.id) who submitted the reservation request.';

-- 2. Add index on user_id and created_at for customer reservation history queries
CREATE INDEX IF NOT EXISTS idx_reservations_user_id_created_at
    ON public.reservations (user_id, created_at DESC);

-- 3. Ensure RLS is enabled on public.reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 4. Remove the previous public insert policy and any older versions of auth policies
DROP POLICY IF EXISTS "Public visitors can submit pending reservation requests" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated customers can insert own reservation requests" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated customers can view own reservations" ON public.reservations;

-- 5. Create strict RLS Policy: Authenticated users can ONLY insert for their own auth.uid()
CREATE POLICY "Authenticated customers can insert own reservation requests"
    ON public.reservations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND status = 'pending'
        AND guests BETWEEN 1 AND 12
        AND reservation_date >= CURRENT_DATE
        AND char_length(trim(full_name)) BETWEEN 2 AND 120
        AND char_length(trim(email)) BETWEEN 5 AND 254
        AND char_length(trim(phone)) BETWEEN 10 AND 20
        AND (special_requests IS NULL OR char_length(special_requests) <= 500)
    );

-- 6. Create strict RLS Policy: Authenticated users can ONLY read their own reservations
CREATE POLICY "Authenticated customers can view own reservations"
    ON public.reservations
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );

-- 7. Align table-level privileges with RLS rules
REVOKE ALL ON public.reservations FROM anon;
REVOKE ALL ON public.reservations FROM authenticated;
GRANT SELECT, INSERT ON public.reservations TO authenticated;
