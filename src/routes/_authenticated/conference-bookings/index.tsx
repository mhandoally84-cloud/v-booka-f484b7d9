import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, Users } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/conference-bookings/")({
  component: ConferenceBookingsList,
});

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  cancelled: "bg-muted text-muted-foreground",
};

function ConferenceBookingsList() {
  const { user, isAdmin } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["conference_bookings", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const q = supabase.from("conference_bookings" as any)
        .select("*, conference_halls(name, location, capacity)")
        .order("start_at", { ascending: false });
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Conference Bookings</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "All conference hall bookings" : "Your conference hall bookings & other approved events"}
          </p>
        </div>
        <Link to="/conference-bookings/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New booking</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No conference bookings yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((b: any) => (
            <Link key={b.id} to="/conference-bookings/$id" params={{ id: b.id }}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{b.activity_title}</h3>
                      <Badge className={statusColors[b.status]}>{b.status}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {b.conference_halls?.name} · {b.conference_halls?.location}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />
                        {format(new Date(b.start_at), "PPP p")} → {format(new Date(b.end_at), "p")}
                      </span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {b.participants} participants</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
