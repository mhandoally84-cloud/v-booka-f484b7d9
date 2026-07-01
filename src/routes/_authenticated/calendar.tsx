import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarView,
});

function CalendarView() {
  const [month, setMonth] = useState(new Date());

  const { data: bookings = [] } = useQuery({
    queryKey: ["calendar", format(month, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(month), "yyyy-MM-dd");
      const end = format(endOfMonth(month), "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("id, course_code, exam_date, status, venues(name), time_slots(label)")
        .gte("exam_date", start).lte("exam_date", end)
        .in("status", ["approved", "pending"]);
      return data ?? [];
    },
  });

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const byDay = new Map<string, any[]>();
  bookings.forEach((b: any) => {
    const k = b.exam_date;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(b);
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master calendar</h1>
          <p className="text-muted-foreground">All bookings across campus</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-40 text-center font-semibold">{format(month, "MMMM yyyy")}</div>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted-foreground">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              return (
                <div key={key} className={cn(
                  "min-h-24 rounded border p-1.5 text-xs",
                  isSameMonth(d, month) ? "bg-card" : "bg-muted/30 text-muted-foreground",
                  isSameDay(d, new Date()) && "border-primary ring-1 ring-primary",
                )}>
                  <div className="mb-1 font-medium">{format(d, "d")}</div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((b: any) => (
                      <Link key={b.id} to="/bookings/$id" params={{ id: b.id }}
                        className={cn(
                          "block truncate rounded px-1 py-0.5",
                          b.status === "approved" ? "bg-success/15 text-success" : "bg-warning/15 text-warning-foreground",
                        )}
                        title={`${b.course_code} · ${b.venues?.name}`}>
                        {b.course_code}
                      </Link>
                    ))}
                    {items.length > 3 && <div className="text-muted-foreground">+{items.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
