-- Replace the table-level anon SELECT grant with a column-level grant so anon
-- can only read public-safe columns from bookings (needed for the
-- public_exam_search view to resolve for anonymous visitors).
REVOKE SELECT ON public.bookings FROM anon;
GRANT SELECT (
  id,
  course_code,
  exam_title,
  department,
  exam_date,
  status,
  cancellation_reason,
  cancelled_at,
  venue_id,
  time_slot_id
) ON public.bookings TO anon;
