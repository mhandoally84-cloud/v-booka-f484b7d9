# Project Memory

## Core
Mzumbe University brand: deep blue primary + gold accent. Fonts: Plus Jakarta Sans (display), Inter (body). Never purple.
Backend is Lovable Cloud. Roles in `public.user_roles` table; check via `has_role()`. First signup becomes admin.
Bookings can't double-book: unique partial index `bookings_no_double_approved` on (venue_id, exam_date, time_slot_id) WHERE status='approved'.
Public "Find My Exam" reads approved bookings via anon SELECT policy — no login needed.
