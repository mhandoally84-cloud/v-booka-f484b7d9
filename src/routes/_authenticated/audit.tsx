import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ScrollText, CheckCircle2, XCircle, Ban, Plus, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
});

const ACTION_META: Record<string, { icon: any; tone: string; label: string }> = {
  created:   { icon: Plus,         tone: "bg-primary/10 text-primary",           label: "Created" },
  approved:  { icon: CheckCircle2, tone: "bg-success/15 text-success",           label: "Approved" },
  rejected:  { icon: XCircle,      tone: "bg-destructive/15 text-destructive",   label: "Rejected" },
  cancelled: { icon: Ban,          tone: "bg-warning/20 text-warning-foreground",label: "Cancelled" },
  deleted:   { icon: Trash2,       tone: "bg-destructive/15 text-destructive",   label: "Deleted" },
  updated:   { icon: Pencil,       tone: "bg-muted text-muted-foreground",       label: "Updated" },
};

function AuditPage() {
  const { isAdmin, loading } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const rows = (data as any[]) ?? [];
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean)));
      let profileMap = new Map<string, string>();
      if (actorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
        profileMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      }
      return rows.map((r) => ({ ...r, actor_name: r.actor_id ? profileMap.get(r.actor_id) ?? "Unknown" : "System" }));
    },
  });

  if (!loading && !isAdmin) return <div className="text-center text-muted-foreground">Admins only.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit log</h1>
        <p className="text-muted-foreground">Every approval, rejection, cancellation and deletion — last 200 events.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : logs.length === 0 ? (
            <EmptyState icon={ScrollText} title="No activity yet" description="Booking changes will appear here as they happen." />
          ) : (
            <div className="divide-y">
              {logs.map((l: any) => {
                const meta = ACTION_META[l.action] ?? ACTION_META.updated;
                const Icon = meta.icon;
                return (
                  <div key={l.id} className="flex items-start gap-4 py-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{l.actor_name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{meta.label}</Badge>
                        {l.from_status && l.to_status && (
                          <span className="text-xs text-muted-foreground">{l.from_status} → {l.to_status}</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-sm">
                        {l.booking_id ? (
                          <Link to="/bookings/$id" params={{ id: l.booking_id }} className="hover:underline">
                            {l.course_code} — {l.exam_title}
                          </Link>
                        ) : (
                          <span>{l.course_code} — {l.exam_title}</span>
                        )}
                        {l.exam_date && (
                          <span className="text-muted-foreground"> · {format(new Date(l.exam_date), "d MMM yyyy")}</span>
                        )}
                      </div>
                      {l.comment && <p className="mt-1 text-sm text-muted-foreground">"{l.comment}"</p>}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      {format(new Date(l.created_at), "d MMM yyyy")}
                      <div>{format(new Date(l.created_at), "HH:mm")}</div>
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
