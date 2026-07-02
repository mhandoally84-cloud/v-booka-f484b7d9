import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, format, startOfWeek } from "date-fns";

/**
 * Per-venue utilization % over the last N weeks:
 *   approved_bookings_for_venue / (weeks × 5 weekdays × slots_count)
 */
export function VenueUtilization({ weeks = 4 }: { weeks?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["venue-utilization", weeks],
    queryFn: async () => {
      const today = new Date();
      const from = addDays(startOfWeek(today, { weekStartsOn: 1 }), -7 * (weeks - 1));
      const to = addDays(from, weeks * 7 - 1);
      const [venuesRes, slotsRes, bookingsRes] = await Promise.all([
        supabase.from("venues").select("id, name, building").eq("is_active", true).order("name"),
        supabase.from("time_slots").select("id", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("venue_id")
          .eq("status", "approved")
          .gte("exam_date", format(from, "yyyy-MM-dd"))
          .lte("exam_date", format(to, "yyyy-MM-dd")),
      ]);
      const venues = venuesRes.data ?? [];
      const slotCount = slotsRes.count ?? 1;
      const bookings = bookingsRes.data ?? [];
      const totalSlotsPerVenue = weeks * 5 * slotCount; // Mon-Fri
      const counts = new Map<string, number>();
      bookings.forEach((b) => counts.set(b.venue_id, (counts.get(b.venue_id) ?? 0) + 1));
      return venues
        .map((v) => ({ ...v, count: counts.get(v.id) ?? 0, util: (counts.get(v.id) ?? 0) / Math.max(1, totalSlotsPerVenue) }))
        .sort((a, b) => b.util - a.util);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-base">Venue utilization %</CardTitle>
          <span className="text-xs text-muted-foreground">Last {weeks} weeks · Mon–Fri</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active venues.</div>
        ) : (
          <div className="space-y-3">
            {data.map((v) => {
              const pct = Math.min(100, Math.round(v.util * 100));
              return (
                <div key={v.id} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <div className="min-w-0 truncate">
                      <span className="font-medium">{v.name}</span>
                      <span className="text-muted-foreground"> · {v.building}</span>
                    </div>
                    <div className="tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{pct}%</span> · {v.count} bookings
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
