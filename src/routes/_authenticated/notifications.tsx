import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Booking updates and reminders</p>
        </div>
        <Button variant="outline" onClick={markAllRead}><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Bell className="mx-auto mb-3 h-10 w-10 opacity-50" />
          No notifications yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((n: any) => (
            <Link key={n.id} to={n.link ?? "/dashboard"}>
              <Card className={n.is_read ? "" : "border-primary/40 bg-primary/5"}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <div className="text-sm">{n.message}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(n.created_at), "d MMM yyyy · HH:mm")}</div>
                    </div>
                  </div>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
