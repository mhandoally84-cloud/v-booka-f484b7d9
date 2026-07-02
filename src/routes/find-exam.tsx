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
  venue_name: string | null;
  venue_building: string | null;
  time_slot_label: string | null;
  time_slot_start: string | null;
  time_slot_end: string | null;
}

function FindExam() {
  const { q } = Route.useSearch();
  const [code, setCode] = useState(q ?? "");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(term: string) {
    if (!term.trim()) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("public_exam_search")
      .select("id, course_code, exam_title, exam_date, department, status, cancellation_reason, cancelled_at, venue_name, venue_building, time_slot_label, time_slot_start, time_slot_end")
      .ilike("course_code", `%${term.trim()}%`)
      .order("exam_date", { ascending: true });
    setResults((data as Result[] | null) ?? []);
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
              results.map((r) => {
                const cancelled = r.status === "cancelled";
                return (
                <Card key={r.id} className={cancelled ? "border-destructive/40" : ""}>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{r.course_code} — {r.exam_title}</div>
                        <div className="text-sm text-muted-foreground">{r.department}</div>
                      </div>
                      {cancelled ? (
                        <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Cancelled</span>
                      ) : (
                        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Confirmed</span>
                      )}
                    </div>
                    <div className={"mt-4 grid gap-3 sm:grid-cols-3 text-sm " + (cancelled ? "opacity-60 line-through" : "")}>
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {r.venue_name} <span className="text-muted-foreground">· {r.venue_building}</span></div>
                      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {format(new Date(r.exam_date), "EEE, d MMM yyyy")}</div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {r.time_slot_label} ({r.time_slot_start?.slice(0,5)}–{r.time_slot_end?.slice(0,5)})</div>

                    </div>
                    {cancelled && (
                      <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                        <div className="font-medium text-destructive">Reason for cancellation</div>
                        <p className="mt-1 text-muted-foreground">{r.cancellation_reason ?? "No reason was provided."}</p>
                        {r.cancelled_at && <p className="mt-1 text-xs text-muted-foreground">Cancelled on {format(new Date(r.cancelled_at), "EEE, d MMM yyyy · HH:mm")}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
