import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/bookings/")({
  component: BookingsList,
});

function BookingsList() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<string>(isAdmin ? "pending" : "all");
  const [q, setQ] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings-list", isAdmin, user?.id, tab],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("id, course_code, exam_title, department, exam_date, status, expected_students, venues(name, building), time_slots(label)")
        .order("exam_date", { ascending: false });
      if (!isAdmin) query = query.eq("user_id", user!.id);
      if (tab !== "all") query = query.eq("status", tab as any);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return bookings;
    const needle = q.toLowerCase();
    return bookings.filter((b: any) =>
      b.course_code?.toLowerCase().includes(needle) ||
      b.exam_title?.toLowerCase().includes(needle) ||
      b.department?.toLowerCase().includes(needle) ||
      b.venues?.name?.toLowerCase().includes(needle),
    );
  }, [bookings, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{isAdmin ? "All bookings" : "My bookings"}</h1>
          <p className="text-muted-foreground">{isAdmin ? "Review and approve requests" : "Track your booking requests"}</p>
        </div>
        <Link to="/bookings/new" className="shrink-0"><Button className="min-h-11"><Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">New booking</span></Button></Link>
      </div>

      <div className="sticky top-16 z-10 -mx-4 space-y-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search course code, title, department, venue…"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 sm:flex-none">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 sm:flex-none">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 sm:flex-none">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardList}
                title={q ? "No matches" : "No bookings to show"}
                description={q ? "Try a different search term or clear the filter." : "Create a new booking request to get started."}
                action={!q && <Link to="/bookings/new"><Button>New booking</Button></Link>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((b: any) => (
              <Link key={b.id} to="/bookings/$id" params={{ id: b.id }}>
                <Card className="transition hover:shadow-md">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{b.course_code} — {b.exam_title}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {b.venues?.name} · {format(new Date(b.exam_date), "d MMM yyyy")} · {b.time_slots?.label} · {b.expected_students} students
                      </div>
                      {isAdmin && <div className="mt-0.5 truncate text-xs text-muted-foreground">{b.department}</div>}
                    </div>
                    <StatusBadge status={b.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
