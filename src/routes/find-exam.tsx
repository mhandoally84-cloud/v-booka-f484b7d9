import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/BrandHeader";
import { Search, MapPin, CalendarDays, Clock } from "lucide-react";
import { format } from "date-fns";

type SearchParams = { q?: string };

export const Route = createFileRoute("/find-exam")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ q: typeof s.q === "string" ? s.q : undefined }),
  component: FindExam,
});

interface Result {
  id: string;
  course_code: string;
  exam_title: string;
  exam_date: string;
  department: string;
  status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  venues: { name: string; building: string } | null;
  time_slots: { label: string; start_time: string; end_time: string } | null;
}

function FindExam() {
  const { q } = Route.useSearch();
  const [code, setCode] = useState(q ?? "");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(term: string) {
    if (!term.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, course_code, exam_title, exam_date, department, status, cancellation_reason, cancelled_at, venues(name, building), time_slots(label, start_time, end_time)")
      .in("status", ["approved", "cancelled"])
      .ilike("course_code", `%${term.trim()}%`)
      .order("exam_date", { ascending: true });
    setResults((data as unknown as Result[]) ?? []);
    setLoading(false);
  }

  // auto-run if q present
  useState(() => { if (q) search(q); });

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader>
        <Link to="/auth"><Button variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent">Staff sign in</Button></Link>
      </BrandHeader>

      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Find your exam</h1>
          <p className="mt-2 text-muted-foreground">Enter your course code to see the venue, date, and time.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); search(code); }}
            >
              <Input placeholder="e.g. BIT 210" value={code} onChange={(e) => setCode(e.target.value)} className="text-base" autoFocus />
              <Button type="submit" disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Searching…" : "Search"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {results !== null && (
          <div className="mt-6 space-y-3">
            {results.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No approved exams found for "{code}". Check the course code with your lecturer.
                </CardContent>
              </Card>
            ) : (
              results.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{r.course_code} — {r.exam_title}</div>
                        <div className="text-sm text-muted-foreground">{r.department}</div>
                      </div>
                      <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Confirmed</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {r.venues?.name} <span className="text-muted-foreground">· {r.venues?.building}</span></div>
                      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {format(new Date(r.exam_date), "EEE, d MMM yyyy")}</div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {r.time_slots?.label} ({r.time_slots?.start_time?.slice(0,5)}–{r.time_slots?.end_time?.slice(0,5)})</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
