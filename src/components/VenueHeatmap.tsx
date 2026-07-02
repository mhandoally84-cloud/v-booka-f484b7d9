import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, format, startOfWeek } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Heatmap of approved bookings per (weekday × time slot) over the last N weeks.
 * Also shows utilization % = approved_bookings / (weeks × active_venues) per cell.
 */
export function VenueHeatmap({ weeks = 4 }: { weeks?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["heatmap", weeks],
    queryFn: async () => {
      const today = new Date();
      const from = addDays(startOfWeek(today, { weekStartsOn: 1 }), -7 * (weeks - 1));
      const [slotsRes, bookingsRes, venuesRes] = await Promise.all([
        supabase.from("time_slots").select("id, label, sort_order").order("sort_order"),
        supabase
          .from("bookings")
          .select("exam_date, time_slot_id, status")
          .eq("status", "approved")
          .gte("exam_date", format(from, "yyyy-MM-dd"))
          .lte("exam_date", format(addDays(from, weeks * 7 - 1), "yyyy-MM-dd")),
        supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      const slots = slotsRes.data ?? [];
      const bookings = bookingsRes.data ?? [];
      const venueCount = venuesRes.count ?? 0;

      // grid[slotIdx][dayIdx] = { count, util }
      const counts: number[][] = slots.map(() => Array(7).fill(0));
      bookings.forEach((b) => {
        const d = new Date(b.exam_date);
        // JS day: 0=Sun..6=Sat; convert to Mon-based 0..6
        const dayIdx = (d.getDay() + 6) % 7;
        const slotIdx = slots.findIndex((s) => s.id === b.time_slot_id);
        if (slotIdx >= 0) counts[slotIdx][dayIdx] += 1;
      });

      const denom = Math.max(1, weeks * venueCount);
      const grid = counts.map((row) => row.map((c) => ({ count: c, util: c / denom })));
      const totalBookings = counts.flat().reduce((s, n) => s + n, 0);
      const totalCells = weeks * 7 * slots.length * Math.max(1, venueCount);
      const overallUtil = totalCells ? totalBookings / totalCells : 0;

      return { slots, grid, overallUtil, venueCount, weeks };
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-base">Venue utilization heatmap</CardTitle>
          <span className="text-xs text-muted-foreground">Last {weeks} weeks</span>
        </div>
        {data && (
          <p className="text-xs text-muted-foreground">
            Overall utilization: <span className="font-semibold text-foreground">{(data.overallUtil * 100).toFixed(1)}%</span>
            {" "}· {data.venueCount} active venue(s)
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-56 w-full" />
        ) : data.slots.length === 0 ? (
          <div className="text-sm text-muted-foreground">No time slots configured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-center text-xs">
              <thead>
                <tr>
                  <th className="text-left font-medium text-muted-foreground pr-2"></th>
                  {DAYS.map((d) => <th key={d} className="font-medium text-muted-foreground">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slots.map((s, si) => (
                  <tr key={s.id}>
                    <td className="pr-2 text-left font-medium text-muted-foreground whitespace-nowrap">{s.label}</td>
                    {data.grid[si].map((cell, di) => {
                      const intensity = Math.min(1, cell.util * 4); // scale so ~25% util = fully saturated
                      const bg = intensity === 0
                        ? "var(--muted)"
                        : `color-mix(in oklch, var(--primary) ${Math.round(15 + intensity * 70)}%, transparent)`;
                      const textLight = intensity > 0.55;
                      return (
                        <td key={di}>
                          <div
                            className="h-10 rounded-md flex flex-col items-center justify-center leading-tight"
                            style={{ background: bg, color: textLight ? "var(--primary-foreground)" : "var(--foreground)" }}
                            title={`${cell.count} approved · ${(cell.util * 100).toFixed(0)}% utilization`}
                          >
                            <span className="font-semibold">{cell.count || ""}</span>
                            {cell.count > 0 && <span className="text-[9px] opacity-80">{(cell.util * 100).toFixed(0)}%</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Low</span>
              <div className="flex h-2 w-40 overflow-hidden rounded-full">
                {[0.05, 0.2, 0.4, 0.6, 0.85].map((v) => (
                  <div key={v} className="flex-1" style={{ background: `color-mix(in oklch, var(--primary) ${Math.round(15 + v * 70)}%, transparent)` }} />
                ))}
              </div>
              <span>High</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
