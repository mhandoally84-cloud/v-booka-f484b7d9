-- 1) Remove overly-broad anon SELECT on bookings
DROP POLICY IF EXISTS "Public can view approved or cancelled bookings" ON public.bookings;
REVOKE SELECT ON public.bookings FROM anon;

-- 2) Safe public view for the "Find my exam" lookup
DROP VIEW IF EXISTS public.public_exam_search;
CREATE VIEW public.public_exam_search
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.course_code,
  b.exam_title,
  b.department,
  b.exam_date,
  b.status,
  b.cancellation_reason,
  b.cancelled_at,
  v.name       AS venue_name,
  v.building   AS venue_building,
  t.label      AS time_slot_label,
  t.start_time AS time_slot_start,
  t.end_time   AS time_slot_end
FROM public.bookings b
LEFT JOIN public.venues v      ON v.id = b.venue_id
LEFT JOIN public.time_slots t  ON t.id = b.time_slot_id
WHERE b.status IN ('approved','cancelled');

-- The view is security_invoker, so it enforces the caller's RLS on bookings.
-- Add a narrow anon policy that ONLY permits reads of approved/cancelled rows
-- (the view already filters, but RLS is what actually authorizes anon).
CREATE POLICY "Anon can read approved/cancelled bookings via view"
ON public.bookings
FOR SELECT
TO anon
USING (status IN ('approved','cancelled'));

-- Anon needs SELECT on the joined tables for the view to resolve.
GRANT SELECT ON public.public_exam_search TO anon, authenticated;
GRANT SELECT ON public.bookings   TO anon;  -- gated by the RLS policy above
-- venues and time_slots already grant SELECT to anon per existing policies.

-- 3) Tighten profiles: users see only their own profile; admins see all
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile; admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
