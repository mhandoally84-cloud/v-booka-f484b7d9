
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS programmes text[] NOT NULL DEFAULT '{}';

DROP VIEW IF EXISTS public.public_exam_search;

CREATE VIEW public.public_exam_search AS
SELECT b.id,
    b.course_code,
    b.exam_title,
    b.department,
    b.exam_date,
    b.status,
    b.cancellation_reason,
    b.cancelled_at,
    b.programmes,
    v.name AS venue_name,
    v.building AS venue_building,
    t.label AS time_slot_label,
    t.start_time AS time_slot_start,
    t.end_time AS time_slot_end
FROM public.bookings b
LEFT JOIN public.venues v ON v.id = b.venue_id
LEFT JOIN public.time_slots t ON t.id = b.time_slot_id
WHERE b.status = ANY (ARRAY['approved'::booking_status, 'cancelled'::booking_status]);

GRANT SELECT ON public.public_exam_search TO anon, authenticated;
