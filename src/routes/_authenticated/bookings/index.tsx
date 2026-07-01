import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/bookings/")({
  component: BookingsList,
});

function BookingsList() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<string>(isAdmin ? "pending" : "all");

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isAdmin ? "All bookings" : "My bookings"}</h1>
          <p className="text-muted-foreground">{isAdmin ? "Review and approve requests" : "Track your booking requests"}</p>
        </div>
        <Link to="/bookings/new"><Button><Plus className="mr-2 h-4 w-4" /> New booking</Button></Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : bookings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No bookings to show.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {bookings.map((b: any) => (
                <Link key={b.id} to="/bookings/$id" params={{ id: b.id }}>
                  <Card className="transition hover:shadow-md">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="font-semibold">{b.course_code} — {b.exam_title}</div>
                        <div className="text-sm text-muted-foreground">
                          {b.venues?.name} · {format(new Date(b.exam_date), "d MMM yyyy")} · {b.time_slots?.label} · {b.expected_students} students
                        </div>
                        {isAdmin && b.profiles?.full_name && (
                          <div className="text-xs text-muted-foreground mt-0.5">Requested by {b.profiles.full_name} · {b.department}</div>
                        )}
                      </div>
                      <StatusBadge status={b.status} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
