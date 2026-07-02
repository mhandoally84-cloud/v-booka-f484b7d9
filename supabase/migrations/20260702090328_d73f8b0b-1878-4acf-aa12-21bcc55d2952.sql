
DROP POLICY IF EXISTS "Users update own pending; admins update any" ON public.bookings;
CREATE POLICY "Users update own active; admins update any"
ON public.bookings FOR UPDATE
TO authenticated
USING (
  ((user_id = auth.uid()) AND (status IN ('pending','approved','cancelled')))
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  ((user_id = auth.uid()) AND (status IN ('pending','cancelled')))
  OR has_role(auth.uid(), 'admin')
);
