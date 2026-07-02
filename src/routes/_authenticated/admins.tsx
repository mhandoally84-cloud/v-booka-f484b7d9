import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldOff, Trash2, Users, Circle, Search } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { listAllUsers, deleteUserAccount } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admins")({
  component: AdminsPage,
});

function formatDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function AdminsPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listAllUsers);
  const delFn = useServerFn(deleteUserAccount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "admins">("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users-admin"],
    enabled: isAdmin,
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u: any) => {
      if (filter === "active" && !u.is_active_now) return false;
      if (filter === "admins" && !u.roles.includes("admin")) return false;
      if (!q) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.department ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, filter]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  async function grantAdmin(userId: string, name: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success(`${name} is now an admin`);
    qc.invalidateQueries({ queryKey: ["all-users-admin"] });
  }

  async function revokeAdmin(userId: string, name: string) {
    if (userId === user?.id) return toast.error("You cannot revoke your own admin access");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success(`${name} is no longer an admin`);
    qc.invalidateQueries({ queryKey: ["all-users-admin"] });
  }

  async function deleteUser(userId: string, name: string) {
    try {
      await delFn({ data: { userId } });
      toast.success(`${name} has been removed`);
      qc.invalidateQueries({ queryKey: ["all-users-admin"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete user");
    }
  }

  const totalUsers = users.length;
  const activeNow = users.filter((u: any) => u.is_active_now).length;
  const adminCount = users.filter((u: any) => u.roles.includes("admin")).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User management</h1>
        <p className="text-muted-foreground">Registered users, live activity, roles, and account removal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="Registered users" value={totalUsers} />
        <StatCard
          icon={<Circle className="h-5 w-5 fill-emerald-500 text-emerald-500" />}
          label="Active now (last 5 min)"
          value={activeNow}
        />
        <StatCard icon={<Shield className="h-5 w-5 text-primary" />} label="Administrators" value={adminCount} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All users</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-[220px] pl-8"
                  placeholder="Search name, email, dept"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex rounded-md border p-0.5">
                {(["all", "active", "admins"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "ghost"}
                    onClick={() => setFilter(f)}
                    className="h-8 capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No users match your filters.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((r: any) => {
                const isRowAdmin = r.roles.includes("admin");
                const isSelf = r.id === user?.id;
                return (
                  <div key={r.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{r.full_name ?? "Unnamed user"}</span>
                        {r.is_active_now && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Circle className="h-2 w-2 fill-current" /> Online
                          </span>
                        )}
                        {isRowAdmin && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Shield className="mr-1 h-3 w-3" /> Admin
                          </span>
                        )}
                        {isSelf && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">You</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {r.email ?? "no email"} · {r.department ?? "no department"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Last sign in: {formatDate(r.last_sign_in_at)} · Last active: {formatDate(r.last_seen_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isRowAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeAdmin(r.id, r.full_name ?? "This user")}
                          disabled={isSelf}
                        >
                          <ShieldOff className="mr-2 h-4 w-4" /> Revoke admin
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => grantAdmin(r.id, r.full_name ?? "This user")}>
                          <Shield className="mr-2 h-4 w-4" /> Make admin
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={isSelf}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {r.full_name ?? r.email}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the user account and all their sign-in access.
                              Their bookings and audit history will be preserved for the records.
                              This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(r.id, r.full_name ?? r.email ?? "user")}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
