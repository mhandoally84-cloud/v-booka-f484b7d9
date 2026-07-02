
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bookings DROP CONSTRAINT bookings_user_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
