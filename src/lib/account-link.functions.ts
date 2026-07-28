import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const USERNAME_DOMAIN = "users.vbooka.local";
const LEGACY_EMAIL_DOMAIN = "mzumbe.ac.tz";

type LinkResult =
  | { linked: false; reason: string }
  | { linked: true; mode: "renamed" | "merged"; newEmail: string };

export const linkLegacyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) => {
    if (!data?.password || typeof data.password !== "string") throw new Error("password required");
    return data;
  })
  .handler(async ({ data, context }): Promise<LinkResult> => {
    const legacyId = context.userId;
    const legacyEmail: string | undefined = context.claims?.email;
    if (!legacyEmail || !legacyEmail.toLowerCase().endsWith(`@${LEGACY_EMAIL_DOMAIN}`)) {
      return { linked: false, reason: "not-legacy" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Derive username from legacy profile or email local-part
    const { data: legacyProfile } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name, department, recovery_email")
      .eq("id", legacyId)
      .maybeSingle();

    const username = (legacyProfile?.username || legacyEmail.split("@")[0]).toLowerCase();
    const newEmail = `${username}@${USERNAME_DOMAIN}`;

    // Look up existing new-domain user
    const { data: existing, error: lookupErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      // @ts-ignore filter supported by GoTrue
      filter: `email.eq.${newEmail}`,
    });
    if (lookupErr) throw new Error(lookupErr.message);
    const target = existing?.users?.find((u) => u.email?.toLowerCase() === newEmail);

    if (!target) {
      // Simple rename: change legacy user's email in place. Session stays valid.
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(legacyId, {
        email: newEmail,
        email_confirm: true,
        user_metadata: { username },
      });
      if (updErr) throw new Error(updErr.message);
      await supabaseAdmin.from("profiles").update({ username }).eq("id", legacyId);
      return { linked: true, mode: "renamed", newEmail };
    }

    if (target.id === legacyId) {
      return { linked: true, mode: "renamed", newEmail };
    }

    const newId = target.id;

    // Reassign FK data from legacyId -> newId
    const reassigns = await Promise.all([
      supabaseAdmin.from("bookings").update({ user_id: newId }).eq("user_id", legacyId).then((r) => r),
      supabaseAdmin.from("bookings").update({ reviewer_id: newId }).eq("reviewer_id", legacyId).then((r) => r),
      supabaseAdmin.from("conference_bookings").update({ user_id: newId }).eq("user_id", legacyId).then((r) => r),
      supabaseAdmin.from("conference_bookings").update({ reviewer_id: newId }).eq("reviewer_id", legacyId).then((r) => r),
      supabaseAdmin.from("notifications").update({ user_id: newId }).eq("user_id", legacyId).then((r) => r),
      supabaseAdmin.from("audit_logs").update({ actor_id: newId }).eq("actor_id", legacyId).then((r) => r),
    ]);
    for (const r of reassigns) if (r.error) throw new Error(r.error.message);


    // Merge roles: add any legacy roles missing on the new account
    const { data: legacyRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", legacyId);
    const { data: newRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", newId);
    const have = new Set((newRoles ?? []).map((r: any) => r.role));
    const toAdd = (legacyRoles ?? [])
      .map((r: any) => r.role)
      .filter((r: string) => !have.has(r))
      .map((role: string) => ({ user_id: newId, role }));
    if (toAdd.length) {
      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert(toAdd);
      if (roleErr) throw new Error(roleErr.message);
    }

    // Merge profile: fill blanks on the target
    const { data: newProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, department, recovery_email")
      .eq("id", newId)
      .maybeSingle();
    const patch: Record<string, any> = {};
    if (!newProfile?.full_name && legacyProfile?.full_name) patch.full_name = legacyProfile.full_name;
    if (!newProfile?.department && legacyProfile?.department) patch.department = legacyProfile.department;
    if (!newProfile?.recovery_email && legacyProfile?.recovery_email)
      patch.recovery_email = legacyProfile.recovery_email;
    if (Object.keys(patch).length) {
      await supabaseAdmin.from("profiles").update(patch).eq("id", newId);
    }

    // Sync password on the target to what the user just successfully used
    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(newId, {
      password: data.password,
    });
    if (pwErr) throw new Error(pwErr.message);

    // Remove the legacy account (cascades to legacy profile/user_roles/notifications)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(legacyId);
    if (delErr) throw new Error(delErr.message);

    return { linked: true, mode: "merged", newEmail };
  });
