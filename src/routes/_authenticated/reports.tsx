import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ScrollText } from "lucide-react";
import { VenueHeatmap } from "@/components/VenueHeatmap";
import { VenueUtilization } from "@/components/VenueUtilization";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});


function Reports() {
  const { isAdmin, loading } = useAuth();

  const { data: all = [] } = useQuery({
    queryKey: ["reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*, venues(name, capacity)").order("exam_date", { ascending: false });
      return data ?? [];
    },
  });

  if (!loading && !isAdmin) return <div className="text-center text-muted-foreground">Admins only.</div>;

  const byDept = new Map<string, number>();
  const byVenue = new Map<string, { count: number; capacity: number }>();
  all.forEach((b: any) => {
    byDept.set(b.department, (byDept.get(b.department) ?? 0) + 1);
    const key = b.venues?.name ?? "—";
    const cur = byVenue.get(key) ?? { count: 0, capacity: b.venues?.capacity ?? 0 };
    if (b.status === "approved") cur.count += 1;
    byVenue.set(key, cur);
  });

  function exportCSV() {
    const rows = [
      ["Course code", "Exam title", "Department", "Date", "Venue", "Students", "Status"],
      ...all.map((b: any) => [b.course_code, b.exam_title, b.department, b.exam_date, b.venues?.name, b.expected_students, b.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `mzumbe-bookings-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Utilization, department stats, and audit trail</p>
        </div>
        <div className="flex gap-2">
          <Link to="/audit"><Button variant="outline"><ScrollText className="mr-2 h-4 w-4" />Audit log</Button></Link>
          <Button onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
      </div>

      <VenueHeatmap weeks={4} />
      <VenueUtilization weeks={4} />


      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Bookings by department</CardTitle></CardHeader>
          <CardContent>
            {byDept.size === 0 ? <div className="text-muted-foreground">No data.</div> : (
              <div className="space-y-2">
                {[...byDept.entries()].sort((a,b) => b[1]-a[1]).map(([dept, n]) => (
                  <div key={dept} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="text-sm">{dept}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Venue utilization (approved)</CardTitle></CardHeader>
          <CardContent>
            {byVenue.size === 0 ? <div className="text-muted-foreground">No data.</div> : (
              <div className="space-y-2">
                {[...byVenue.entries()].sort((a,b) => b[1].count-a[1].count).map(([venue, v]) => (
                  <div key={venue} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="text-sm">{venue}</span>
                    <span className="font-semibold">{v.count} bookings</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
