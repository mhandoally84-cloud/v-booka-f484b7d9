
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Conference halls
CREATE TABLE public.conference_halls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  facilities TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  under_maintenance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conference_halls TO authenticated;
GRANT ALL ON public.conference_halls TO service_role;

ALTER TABLE public.conference_halls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active halls"
  ON public.conference_halls FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage halls insert"
  ON public.conference_halls FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage halls update"
  ON public.conference_halls FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage halls delete"
  ON public.conference_halls FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER conference_halls_set_updated_at
  BEFORE UPDATE ON public.conference_halls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Conference bookings
CREATE TYPE public.conference_booking_status AS ENUM ('pending','approved','rejected','cancelled');

CREATE TABLE public.conference_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hall_id UUID NOT NULL REFERENCES public.conference_halls(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_title TEXT NOT NULL,
  purpose TEXT,
  participants INT NOT NULL CHECK (participants > 0),
  tech_materials TEXT,
  refreshments TEXT,
  other_requirements TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.conference_booking_status NOT NULL DEFAULT 'pending',
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

-- Prevent overlapping approved bookings on the same hall
ALTER TABLE public.conference_bookings
  ADD CONSTRAINT conference_bookings_no_overlap
  EXCLUDE USING gist (
    hall_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'approved');

CREATE INDEX conference_bookings_hall_time_idx
  ON public.conference_bookings (hall_id, start_at);
CREATE INDEX conference_bookings_user_idx
  ON public.conference_bookings (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conference_bookings TO authenticated;
GRANT ALL ON public.conference_bookings TO service_role;

ALTER TABLE public.conference_bookings ENABLE ROW LEVEL SECURITY;

-- Owners see their own; admins see all; approved bookings visible to all authenticated for scheduling awareness (minimal columns via app queries)
CREATE POLICY "View own or admin or approved conference bookings"
  ON public.conference_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR status = 'approved');

-- Users can create bookings owned by themselves, always pending
CREATE POLICY "Users create own pending conference bookings"
  ON public.conference_bookings FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewer_id IS NULL
    AND reviewed_at IS NULL
  );

-- Owner can cancel their approved/pending booking (status -> cancelled) — enforced in app; policy allows update by owner or admin
CREATE POLICY "Owner or admin updates conference bookings"
  ON public.conference_bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete conference bookings"
  ON public.conference_bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER conference_bookings_set_updated_at
  BEFORE UPDATE ON public.conference_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
