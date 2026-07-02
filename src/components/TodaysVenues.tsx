import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Building2, Users, User, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function TodaysVenues() {
  const [date, setDate] = useState<Date>(new Date());
  const dateKey = format(date, "yyyy-MM-dd");

  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["all-venues"],
    queryFn: async () => (await supabase.from("venues").select("*").eq("is_active", true).order("name")).data ?? [],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["day-bookings", dateKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, course_code, exam_title, department, venue_id, expected_students, user_id, venues(name, building, capacity), time_slots(label, start_time, end_time, sort_order)")
        .eq("status", "approved")
        .eq("exam_date", dateKey);
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((b) => b.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return data.map((b) => ({ ...b, booker_name: nameById.get(b.user_id) ?? "—" }));
    },
  });

  const loading = venuesLoading || bookingsLoading;
  const bookedVenueIds = new Set(bookings.map((b: any) => b.venue_id));
  const availableVenues = venues.filter((v: any) => !bookedVenueIds.has(v.id) && !v.under_maintenance);

  const sortedBookings = [...bookings].sort(
    (a: any, b: any) => (a.time_slots?.sort_order ?? 0) - (b.time_slots?.sort_order ?? 0),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Venue status</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(date, "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Change date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              className={cn("p-3 pointer-events-auto")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Booked venues */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                  Booked ({sortedBookings.length})
                </h3>
              </div>
              {sortedBookings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No approved bookings for this date.
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedBookings.map((b: any) => (
                    <div key={b.id} className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <Building2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">{b.venues?.name}</span>
                            <span className="text-xs font-normal text-muted-foreground">· {b.venues?.building}</span>
                          </div>
                          <div className="mt-1 text-sm font-medium">
                            {b.course_code} — {b.exam_title}
                          </div>
                          <div className="text-xs text-muted-foreground">{b.department}</div>
                        </div>
                        <div className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {b.time_slots?.start_time?.slice(0, 5)}–{b.time_slots?.end_time?.slice(0, 5)}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {b.booker_name}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {b.expected_students} / {b.venues?.capacity}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.time_slots?.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Available venues */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-success" />
                  Available all day ({availableVenues.length})
                </h3>
              </div>
              {availableVenues.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Every venue has at least one booking on this date.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableVenues.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          <span className="truncate">{v.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {v.building} · {v.type?.replace("_", " ")}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                        {v.capacity} seats
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
