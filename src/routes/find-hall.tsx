import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/BrandHeader";
import { Search, MapPin, CalendarDays, Clock, Users, Coffee, Cpu } from "lucide-react";
import { format } from "date-fns";

type SearchParams = { q?: string };

export const Route = createFileRoute("/find-hall")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ q: typeof s.q === "string" ? s.q : undefined }),
  component: FindHall,
  head: () => ({
    meta: [
      { title: "Find a Conference Hall Booking · Mzumbe" },
      { name: "description", content: "Search approved conference hall bookings at Mzumbe University by activity, hall or organiser." },
    ],
  }),
});

interface Result {
  id: string;
  activity_title: string;
  purpose: string | null;
  participants: number;
  tech_materials: string | null;
  refreshments: string | null;
  other_requirements: string | null;
  start_at: string;
  end_at: string;
  status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  hall_name: string;
  hall_location: string;
  hall_capacity: number;
  organiser_name: string | null;
  organiser_department: string | null;
}

function FindHall() {
  const { q } = Route.useSearch();
  const [term, setTerm] = useState(q ?? "");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(t: string) {
    if (!t.trim()) return;
    setLoading(true);
    const like = `%${t.trim()}%`;
    const { data } = await (supabase as any)
      .from("public_hall_search")
      .select("*")
      .or(`activity_title.ilike.${like},hall_name.ilike.${like},organiser_name.ilike.${like}`)
      .order("start_at", { ascending: true });
    setResults((data as Result[] | null) ?? []);
    setLoading(false);
  }

  useState(() => { if (q) search(q); });

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader>
        <Link to="/find-exam"><Button variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent">Find exam</Button></Link>
        <Link to="/auth"><Button variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent">Staff sign in</Button></Link>
      </BrandHeader>

      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Find a conference hall booking</h1>
          <p className="mt-2 text-muted-foreground">Search by activity title, hall name, or organiser.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(term); }}>
              <Input placeholder="e.g. Staff Meeting, Main Hall, Dr. Mhando" value={term} onChange={(e) => setTerm(e.target.value)} className="text-base" autoFocus />
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
                  No bookings found for "{term}".
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
                          <div className="text-lg font-semibold">{r.activity_title}</div>
                          {r.organiser_name && (
                            <div className="text-sm text-muted-foreground">
                              Organiser: {r.organiser_name}{r.organiser_department ? ` · ${r.organiser_department}` : ""}
                            </div>
                          )}
                        </div>
                        {cancelled ? (
                          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Cancelled</span>
                        ) : (
                          <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Confirmed</span>
                        )}
                      </div>
                      <div className={"mt-4 grid gap-3 sm:grid-cols-2 text-sm " + (cancelled ? "opacity-60 line-through" : "")}>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {r.hall_name} <span className="text-muted-foreground">· {r.hall_location}</span></div>
                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {r.participants} / {r.hall_capacity} seats</div>
                        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {format(new Date(r.start_at), "EEE, d MMM yyyy")}</div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {format(new Date(r.start_at), "HH:mm")} – {format(new Date(r.end_at), "HH:mm")}</div>
                      </div>
                      {!cancelled && r.purpose && (
                        <div className="mt-4 text-sm">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Purpose</div>
                          <p className="whitespace-pre-wrap">{r.purpose}</p>
                        </div>
                      )}
                      {!cancelled && (r.tech_materials || r.refreshments) && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {r.tech_materials && (
                            <div className="rounded-md border p-3 text-sm">
                              <div className="flex items-center gap-1.5 font-semibold text-primary"><Cpu className="h-4 w-4" /> Tech / equipment</div>
                              <p className="mt-1 whitespace-pre-wrap">{r.tech_materials}</p>
                            </div>
                          )}
                          {r.refreshments && (
                            <div className="rounded-md border p-3 text-sm">
                              <div className="flex items-center gap-1.5 font-semibold text-primary"><Coffee className="h-4 w-4" /> Refreshments</div>
                              <p className="mt-1 whitespace-pre-wrap">{r.refreshments}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {!cancelled && r.other_requirements && (
                        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                          <div className="font-semibold text-primary">Other requirements</div>
                          <p className="mt-1 whitespace-pre-wrap">{r.other_requirements}</p>
                        </div>
                      )}
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
