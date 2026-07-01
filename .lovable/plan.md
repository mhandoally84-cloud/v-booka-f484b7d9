## Mzumbe Exam Venue Booking System — Build Plan

A full-stack booking platform for Mzumbe University staff to reserve exam venues, with admin approval, conflict detection, and a public "Find My Exam" lookup.

### Stack (adapted to this template)
- **Frontend:** React 19 + TanStack Start + Tailwind v4 + shadcn/ui
- **Backend:** Lovable Cloud (Supabase — Postgres, Auth, RLS) via TanStack server functions
- **Calendar:** react-day-picker (already in template) + custom week/month grid
- **Branding:** Deep blue (#1e3a8a) + gold (#f59e0b), Mzumbe wordmark in header
- **Email notifications:** Deferred to phase 2 (in-app notifications first) — mention as follow-up

### Data Model (Postgres tables, all with RLS + GRANTs)
- `profiles` — id (→ auth.users), full_name, department, created_at
- `user_roles` — separate table, enum `app_role`: `lecturer | admin | dept_head | student`
- `venues` — name, building, capacity, type, facilities[], is_active, photo_url, under_maintenance
- `time_slots` — label, start_time, end_time
- `bookings` — venue_id, user_id, course_code, exam_title, department, expected_students, date, time_slot_id, status (`pending|approved|rejected|cancelled`), reviewer_id, reviewer_comment, timestamps
- `notifications` — user_id, message, link, is_read

**Conflict prevention:** Postgres `EXCLUDE` constraint on `(venue_id, date, time_slot_id) WHERE status='approved'` — enforced at DB level, not just UI.

### Roles & Auth
- Email/password (Lovable Cloud auth), signup restricted to `@mzumbe.ac.tz` (client + server validation; configurable)
- First user to sign up is auto-promoted to admin (seed trigger)
- `has_role()` security-definer function for RLS
- Dept-head layer left as toggle in settings (schema supports it; UI phase 2)

### Routes
```
/                          Landing + "Find My Exam" search
/auth                      Login / Signup
/find-exam                 Public lookup by course code
/_authenticated/
  dashboard                Role-aware dashboard
  bookings/new             New booking wizard (date → venue → details)
  bookings                 My bookings (lecturer) / All bookings (admin)
  bookings/$id             Booking detail + approve/reject (admin)
  calendar                 Master calendar view
  venues                   Venue management (admin)
  venues/new, venues/$id   Venue CRUD
  reports                  Utilization + department reports (admin), CSV export
  notifications            In-app inbox
```

### Booking flow
1. Lecturer picks date + time slot + min capacity + required facilities
2. System queries venues where no approved booking exists for that (venue, date, slot) and capacity/facilities match
3. Lecturer fills form → status `pending` → notification to all admins
4. Admin approves (EXCLUDE constraint blocks conflicts) or rejects with comment → requester notified

### UI principles
- Large tap targets, one primary action per screen, status pills (green/amber/red)
- Mobile-first, header with Mzumbe wordmark, sidebar nav on desktop
- Empty states with clear next-step CTA

### Seed data
Migration seeds: 3 time slots (Morning/Afternoon/Evening), 5 venues (Nyerere Hall 300, Mwalimu Hall 250, Computer Lab A 60, Block C Room 12 80, Exam Hall B 200).

### Build order
1. Enable Lovable Cloud + migrations (schema, RLS, GRANTs, EXCLUDE constraint, seed)
2. Design system (blue/gold tokens) + auth pages + role bootstrapping
3. Venue CRUD (admin)
4. Booking creation with availability search
5. Approval workflow + in-app notifications
6. Calendar view + public "Find My Exam"
7. Dashboards + CSV reports
8. Polish, seed verification, SEO/meta

### Deferred (call out to user after v1)
- Email notifications (SMTP) — can wire via Lovable Emails on request
- Department Head pre-approval UI (schema-ready)
- PDF export (CSV covers Excel; PDF is heavier)
- Photo uploads for venues (storage bucket)

I'll build straight through with sensible defaults and flag anything I defer.