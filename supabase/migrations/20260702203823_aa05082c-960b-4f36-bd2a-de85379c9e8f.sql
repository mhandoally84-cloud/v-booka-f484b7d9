-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  actor_id     uuid,
  action       text NOT NULL,           -- created | approved | rejected | cancelled | deleted | updated
  from_status  public.booking_status,
  to_status    public.booking_status,
  comment      text,
  course_code  text,
  exam_title   text,
  exam_date    date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL    ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies → writes happen only via SECURITY DEFINER trigger.

CREATE INDEX IF NOT EXISTS audit_logs_booking_idx  ON public.audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx  ON public.audit_logs(created_at DESC);

-- 2) Trigger to write audit rows
CREATE OR REPLACE FUNCTION public.log_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    INSERT INTO public.audit_logs(booking_id, actor_id, action, from_status, to_status,
                                  comment, course_code, exam_title, exam_date)
    VALUES (NEW.id, auth.uid(), v_action, NULL, NEW.status,
            NEW.reviewer_comment, NEW.course_code, NEW.exam_title, NEW.exam_date);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(booking_id, actor_id, action, from_status, to_status,
                                  comment, course_code, exam_title, exam_date)
    VALUES (OLD.id, auth.uid(), 'deleted', OLD.status, NULL,
            NULL, OLD.course_code, OLD.exam_title, OLD.exam_date);
    RETURN OLD;
  END IF;

  -- UPDATE: only log when status actually changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_action := CASE NEW.status
      WHEN 'approved'  THEN 'approved'
      WHEN 'rejected'  THEN 'rejected'
      WHEN 'cancelled' THEN 'cancelled'
      ELSE 'updated'
    END;
    INSERT INTO public.audit_logs(booking_id, actor_id, action, from_status, to_status,
                                  comment, course_code, exam_title, exam_date)
    VALUES (NEW.id, auth.uid(), v_action, OLD.status, NEW.status,
            COALESCE(NEW.cancellation_reason, NEW.reviewer_comment),
            NEW.course_code, NEW.exam_title, NEW.exam_date);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_change ON public.bookings;
CREATE TRIGGER trg_log_booking_change
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_change();
