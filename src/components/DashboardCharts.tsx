import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { addDays, format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--warning)",
  approved: "var(--success)",
  rejected: "var(--destructive)",
  cancelled: "var(--muted-foreground)",
};

export function DashboardCharts() {
  const { data: statusData = [], isLoading: statusLoading } = useQuery({
    queryKey: ["chart-status"],
    queryFn: async () => {
      const statuses = ["pending", "approved", "rejected", "cancelled"] as const;
      const rows = await Promise.all(
        statuses.map(async (s) => {
          const { count } = await supabase
            .from("bookings").select("*", { count: "exact", head: true }).eq("status", s);
          return { name: s.charAt(0).toUpperCase() + s.slice(1), value: count ?? 0, key: s };
        }),
      );
      return rows.filter((r) => r.value > 0);
    },
  });

  const { data: weekData = [], isLoading: weekLoading } = useQuery({
    queryKey: ["chart-week"],
    queryFn: async () => {
      const today = new Date();
      const end = addDays(today, 6);
      const { data } = await supabase
        .from("bookings")
        .select("exam_date")
        .eq("status", "approved")
        .gte("exam_date", format(today, "yyyy-MM-dd"))
        .lte("exam_date", format(end, "yyyy-MM-dd"));
      const counts = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        counts.set(format(addDays(today, i), "yyyy-MM-dd"), 0);
      }
      (data ?? []).forEach((r) => counts.set(r.exam_date, (counts.get(r.exam_date) ?? 0) + 1));
      return Array.from(counts.entries()).map(([d, n]) => ({
        day: format(new Date(d), "EEE d"),
        exams: n,
      }));
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Bookings by status</CardTitle></CardHeader>
        <CardContent className="h-64">
          {statusLoading ? (
            <Skeleton className="h-full w-full" />
          ) : statusData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Approved exams · next 7 days</CardTitle></CardHeader>
        <CardContent className="h-64">
          {weekLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="exams" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
