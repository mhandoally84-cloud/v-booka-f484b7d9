
CREATE OR REPLACE VIEW public.public_hall_search
WITH (security_invoker = true) AS
SELECT
  cb.id,
  cb.activity_title,
  cb.purpose,
  cb.participants,
  cb.tech_materials,
  cb.refreshments,
  cb.other_requirements,
  cb.start_at,
  cb.end_at,
  cb.status,
  cb.cancellation_reason,
  cb.cancelled_at,
  h.name        AS hall_name,
  h.location    AS hall_location,
  h.capacity    AS hall_capacity,
  p.full_name   AS organiser_name,
  p.department  AS organiser_department
FROM public.conference_bookings cb
JOIN public.conference_halls h ON h.id = cb.hall_id
LEFT JOIN public.profiles p ON p.id = cb.user_id
WHERE cb.status IN ('approved','cancelled');

GRANT SELECT ON public.public_hall_search TO anon, authenticated;

DROP POLICY IF EXISTS "Anon can view approved conference bookings" ON public.conference_bookings;
CREATE POLICY "Anon can view approved conference bookings"
ON public.conference_bookings FOR SELECT TO anon
USING (status IN ('approved','cancelled'));

DROP POLICY IF EXISTS "Anon can view active halls" ON public.conference_halls;
CREATE POLICY "Anon can view active halls"
ON public.conference_halls FOR SELECT TO anon
USING (is_active);

GRANT SELECT ON public.conference_bookings TO anon;
GRANT SELECT ON public.conference_halls TO anon;
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "Anon can view profiles of hall organisers" ON public.profiles;
CREATE POLICY "Anon can view profiles of hall organisers"
ON public.profiles FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.conference_bookings cb
  WHERE cb.user_id = profiles.id AND cb.status IN ('approved','cancelled')
));
