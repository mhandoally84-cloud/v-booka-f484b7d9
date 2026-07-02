import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ShieldOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["all-users-with-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, department").order("full_name");
      const { data: roles } = await supabase
        .from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  async function promoteByEmail() {
    if (!email.trim()) return;
    setBusy(true);
    // Look up the profile by matching email prefix in full_name is unreliable — search profiles instead.
    // Since profiles has no email column, we use the id lookup: find the profile whose full_name matches or
    // whose id is a user with the given email. We can't query auth.users from the client, so match on full_name.
    const target = rows.find((r: any) =>
      (r.full_name ?? "").toLowerCase() === email.trim().toLowerCase() ||
      (r.full_name ?? "").toLowerCase().startsWith(email.trim().toLowerCase().split("@")[0]),
    );
    if (!target) {
      setBusy(false);
      return toast.error("No matching user found. Ask them to sign in first, then use the buttons below.");
    }
    await grantAdmin(target.id, target.full_name);
    setEmail("");
    setBusy(false);
  }

  async function grantAdmin(userId: string, name: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success(`${name} is now an admin`);
    qc.invalidateQueries({ queryKey: ["all-users-with-roles"] });
  }

  async function revokeAdmin(userId: string, name: string) {
    if (userId === user?.id) return toast.error("You cannot revoke your own admin access");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success(`${name} is no longer an admin`);
    qc.invalidateQueries({ queryKey: ["all-users-with-roles"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin management</h1>
        <p className="text-muted-foreground">Grant or revoke Exams Office administrator access.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Promote a user by name</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">User full name (as registered)</Label>
            <div className="flex gap-2">
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. Jane Mwakasege" />
              <Button onClick={promoteByEmail} disabled={busy || !email.trim()}>Promote</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The user must have signed in at least once so their profile exists. You can also use the buttons in the list below.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All users</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No users yet.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r: any) => {
                const isRowAdmin = r.roles.includes("admin");
                return (
                  <div key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{r.full_name ?? "Unnamed user"}</span>
                        {isRowAdmin && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Shield className="mr-1 h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{r.department ?? "—"}</div>
                    </div>
                    <div>
                      {isRowAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeAdmin(r.id, r.full_name ?? "This user")}
                          disabled={r.id === user?.id}
                        >
                          <ShieldOff className="mr-2 h-4 w-4" /> Revoke admin
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => grantAdmin(r.id, r.full_name ?? "This user")}>
                          <Shield className="mr-2 h-4 w-4" /> Make admin
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
