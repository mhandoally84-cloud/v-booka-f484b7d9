# Security memory — Mzumbe Exam Venue Booking

## Accepted advisor findings

- **`0029_authenticated_security_definer_function_executable` on `public.has_role(uuid, app_role)`** — expected. This is the canonical Lovable pattern for role checks used inside RLS policies; it must be `SECURITY DEFINER` (to bypass RLS on `user_roles`) and executable by `authenticated`. It only returns a boolean about role membership, does not expose row data, and `search_path` is pinned to `public`. Do not "fix" by revoking execute or switching to `SECURITY INVOKER` — RLS would then evaluate incorrectly and break access control.

## Principles for this project

- Roles live in `public.user_roles` (never on `profiles`). All privilege checks go through `has_role()`.
- Every `public` table has explicit RLS policies + explicit GRANTs. `anon` is granted SELECT only on tables meant for the public "Find My Exam" lookup (`venues`, `time_slots`, and approved `bookings`).
- Booking conflicts are enforced by a unique partial index (`bookings_no_double_approved`), not just UI checks.
