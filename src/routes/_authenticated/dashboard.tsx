import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TodaysVenues } from "@/components/TodaysVenues";
import { DashboardCharts } from "@/components/DashboardCharts";
import { CalendarCheck2, Clock, AlertCircle, Building2, TrendingUp, ClipboardList, Sparkles, PlusCircle, Search, Users } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: myBookings = [], isLoading: myLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, course_code, exam_title, exam_date, status, venues(name), time_slots(label)")
        .eq("user_id", user!.id)
        .order("exam_date", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [pending, approved, venues] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "approved").gte("exam_date", new Date().toISOString().slice(0,10)),
        supabase.from("venues").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return { pending: pending.count ?? 0, approved: approved.count ?? 0, venues: venues.count ?? 0 };
    },
  });

  const isBrandNew = !isAdmin && !myLoading && myBookings.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
        <p className="text-muted-foreground">{isAdmin ? "Exams Office overview" : "Your booking activity"}</p>
      </div>

      {isBrandNew && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-gold/5 dark:from-primary/10 dark:to-gold/10">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Welcome to Mzumbe Bookings
              </div>
              <h2 className="text-xl font-semibold">Book your first exam venue in three quick steps</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a date and slot, choose venues, add exam details. The Exams Office reviews and approves.</p>
              <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <li className="flex items-center gap-2 rounded-md border bg-card/50 p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span> Choose date & slot</li>
                <li className="flex items-center gap-2 rounded-md border bg-card/50 p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span> Select venue(s)</li>
                <li className="flex items-center gap-2 rounded-md border bg-card/50 p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span> Submit for review</li>
              </ol>
            </div>
            <div className="flex flex-col gap-2 md:min-w-[180px]">
              <Link to="/bookings/new"><Button className="w-full"><PlusCircle className="mr-2 h-4 w-4" />New booking</Button></Link>
              <Link to="/venues"><Button variant="outline" className="w-full"><Building2 className="mr-2 h-4 w-4" />Browse venues</Button></Link>
              <Link to="/find-exam"><Button variant="ghost" className="w-full"><Search className="mr-2 h-4 w-4" />Find an exam</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && stats && stats.pending === 0 && stats.approved === 0 && stats.venues === 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-gold/5 dark:from-primary/10 dark:to-gold/10">
          <CardContent className="p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Get started as Exams Office
            </div>
            <h2 className="text-xl font-semibold">Set up your venues and invite lecturers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add the halls, labs and exam rooms lecturers can request, then promote colleagues to admin.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/venues/new"><Button><Building2 className="mr-2 h-4 w-4" />Add first venue</Button></Link>
              <Link to="/admins"><Button variant="outline"><Users className="mr-2 h-4 w-4" />Manage admins</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={AlertCircle} label="Pending approvals" value={stats.pending} tone="warning" href="/bookings" />
          <StatCard icon={CalendarCheck2} label="Upcoming exams" value={stats.approved} tone="success" href="/calendar" />
          <StatCard icon={Building2} label="Active venues" value={stats.venues} tone="primary" href="/venues" />
        </div>
      )}

      {isAdmin && <DashboardCharts />}

      <TodaysVenues />


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isAdmin ? "Recent requests" : "My upcoming bookings"}</CardTitle>
          <Link to="/bookings"><Button variant="ghost" size="sm">View all</Button></Link>
        </CardHeader>
        <CardContent>
          {myLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : myBookings.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No bookings yet"
              description="Submit your first venue request in under a minute."
              action={<Link to="/bookings/new"><Button>Create your first booking</Button></Link>}
            />
          ) : (
            <div className="divide-y">
              {myBookings.map((b: any) => (
                <Link key={b.id} to="/bookings/$id" params={{ id: b.id }} className="-mx-2 flex min-h-11 items-center justify-between rounded px-2 py-3 transition hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{b.course_code} — {b.exam_title}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {b.venues?.name} · {format(new Date(b.exam_date), "d MMM yyyy")} · {b.time_slots?.label}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, href }: any) {
  const tones: Record<string, string> = {
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <Link to={href}>
      <Card className="transition hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
          <TrendingUp className="ml-auto h-4 w-4 text-muted-foreground/50" />
        </CardContent>
      </Card>
    </Link>
  );
}
