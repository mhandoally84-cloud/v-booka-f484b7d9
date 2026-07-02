-- Cancel any bookings tied to time slots we're about to remove, so FK deletes are safe
UPDATE public.bookings SET status = 'cancelled'
WHERE time_slot_id IN (SELECT id FROM public.time_slots);

DELETE FROM public.bookings WHERE time_slot_id IN (SELECT id FROM public.time_slots);
DELETE FROM public.time_slots;

-- Reseed 1-hour slots 07:00 → 22:00 (last slot 21:00–22:00)
INSERT INTO public.time_slots (label, start_time, end_time, sort_order) VALUES
  ('07:00 – 08:00', '07:00', '08:00', 1),
  ('08:00 – 09:00', '08:00', '09:00', 2),
  ('09:00 – 10:00', '09:00', '10:00', 3),
  ('10:00 – 11:00', '10:00', '11:00', 4),
  ('11:00 – 12:00', '11:00', '12:00', 5),
  ('12:00 – 13:00', '12:00', '13:00', 6),
  ('13:00 – 14:00', '13:00', '14:00', 7),
  ('14:00 – 15:00', '14:00', '15:00', 8),
  ('15:00 – 16:00', '15:00', '16:00', 9),
  ('16:00 – 17:00', '16:00', '17:00', 10),
  ('17:00 – 18:00', '17:00', '18:00', 11),
  ('18:00 – 19:00', '18:00', '19:00', 12),
  ('19:00 – 20:00', '19:00', '20:00', 13),
  ('20:00 – 21:00', '20:00', '21:00', 14),
  ('21:00 – 22:00', '21:00', '22:00', 15);