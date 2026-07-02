
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Public can view approved bookings" ON public.bookings;
CREATE POLICY "Public can view approved or cancelled bookings"
ON public.bookings FOR SELECT
TO anon
USING (status IN ('approved','cancelled'));
