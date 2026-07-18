import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Building2, Check, AlertTriangle, Lightbulb, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings/new")({
  component: NewBooking,
});

function NewBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>();
  const [slotId, setSlotId] = useState<string>("");
  const [expectedStudents, setExpectedStudents] = useState<number>(50);
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    course_code: "", exam_title: "", department: "", special_requirements: "", required_materials: "", notes: "",
  });
  // Programmes sitting the exam, keyed by venue id (e.g. ["BSc Computer Science", "BBA Year 2"])
  const [programmesByVenue, setProgrammesByVenue] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function setVenueProgrammes(venueId: string, list: string[]) {
    setProgrammesByVenue((p) => ({ ...p, [venueId]: list }));
  }

  const { data: slots = [] } = useQuery({
    queryKey: ["time-slots"],
    queryFn: async () => (await supabase.from("time_slots").select("*").order("sort_order")).data ?? [],
  });

  // All active venues + which are taken (with the conflicting course) for this date+slot
  const { data: venueList = [] } = useQuery({
    queryKey: ["venues-with-conflicts", date?.toISOString(), slotId],
    enabled: !!date && !!slotId,
    queryFn: async () => {
      const [{ data: allVenues }, { data: taken }] = await Promise.all([
        supabase.from("venues").select("*").eq("is_active", true).eq("under_maintenance", false).order("capacity", { ascending: false }),
        supabase
          .from("bookings")
          .select("venue_id, course_code, exam_title, department")
          .eq("status", "approved")
          .eq("exam_date", format(date!, "yyyy-MM-dd"))
          .eq("time_slot_id", slotId),
      ]);
      const takenMap = new Map((taken ?? []).map((b: any) => [b.venue_id, b]));
      return (allVenues ?? []).map((v: any) => ({ ...v, conflict: takenMap.get(v.id) ?? null }));
    },
  });

  const availableVenues = useMemo(() => venueList.filter((v: any) => !v.conflict), [venueList]);
  const takenVenues = useMemo(() => venueList.filter((v: any) => v.conflict), [venueList]);

  // Alternative-slot suggestions when the wizard can't fit all students on this date+slot
  const availableCapacity = availableVenues.reduce((s: number, v: any) => s + v.capacity, 0);
  const needsAlternatives = venueList.length > 0 && availableCapacity < expectedStudents;

  const { data: alternatives = [] } = useQuery({
    queryKey: ["alternative-slots", date?.toISOString(), slotId, expectedStudents],
    enabled: !!date && !!slotId && needsAlternatives,
    queryFn: async () => {
      // Look at same day + next 3 days across all slots; return slots whose free capacity ≥ expectedStudents
      const days = [0, 1, 2, 3].map((d) => addDays(date!, d));
      const dateStrs = days.map((d) => format(d, "yyyy-MM-dd"));
      const [{ data: allVenues }, { data: bookings }] = await Promise.all([
        supabase.from("venues").select("id, capacity").eq("is_active", true).eq("under_maintenance", false),
        supabase.from("bookings").select("venue_id, exam_date, time_slot_id").eq("status", "approved").in("exam_date", dateStrs),
      ]);
      const totalCapByVenue = new Map((allVenues ?? []).map((v: any) => [v.id, v.capacity]));
      const results: { date: string; slotId: string; slotLabel: string; freeCapacity: number; freeVenues: number }[] = [];
      for (const d of days) {
        const ds = format(d, "yyyy-MM-dd");
        for (const s of slots as any[]) {
          const takenIds = new Set(
            (bookings ?? []).filter((b: any) => b.exam_date === ds && b.time_slot_id === s.id).map((b: any) => b.venue_id),
          );
          let cap = 0, count = 0;
          for (const [vid, vcap] of totalCapByVenue.entries()) {
            if (!takenIds.has(vid)) { cap += vcap as number; count += 1; }
          }
          if (cap >= expectedStudents && !(ds === format(date!, "yyyy-MM-dd") && s.id === slotId)) {
            results.push({ date: ds, slotId: s.id, slotLabel: s.label, freeCapacity: cap, freeVenues: count });
          }
        }
      }
      return results.slice(0, 5);
    },
  });

  const selectedVenues = useMemo(
    () => availableVenues.filter((v: any) => venueIds.includes(v.id)),
    [availableVenues, venueIds],
  );
  const totalCapacity = selectedVenues.reduce((sum: number, v: any) => sum + v.capacity, 0);
  const remaining = Math.max(0, expectedStudents - totalCapacity);

  function toggleVenue(id: string) {
    setVenueIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function applyAlternative(alt: { date: string; slotId: string }) {
    setDate(new Date(alt.date + "T00:00:00"));
    setSlotId(alt.slotId);
    setVenueIds([]);
    toast.success("Switched to a slot with enough seats");
  }



  async function submit() {
    if (!user || !date || !slotId || venueIds.length === 0) return;
    setSaving(true);
    const examDate = format(date, "yyyy-MM-dd");
    const slot = slots.find((s: any) => s.id === slotId);
    const slotLabel = slot ? `${slot.label} (${slot.start_time.slice(0,5)}–${slot.end_time.slice(0,5)})` : "the selected slot";

    // Distribute expected students proportionally across selected venues by capacity
    const totalCap = selectedVenues.reduce((s: number, v: any) => s + v.capacity, 0);
    let remainingStudents = expectedStudents;
    const results: { venueName: string; status: "approved" | "rejected"; error?: string }[] = [];
    let firstId: string | null = null;

    for (let i = 0; i < selectedVenues.length; i++) {
      const v: any = selectedVenues[i];
      const isLast = i === selectedVenues.length - 1;
      const share = isLast
        ? remainingStudents
        : Math.min(v.capacity, Math.round((v.capacity / totalCap) * expectedStudents));
      const seats = Math.max(1, Math.min(v.capacity, share));
      remainingStudents -= seats;

      // Conflict check per venue
      const { data: conflict } = await supabase
        .from("bookings")
        .select("id, course_code, exam_title")
        .eq("status", "approved")
        .eq("venue_id", v.id)
        .eq("exam_date", examDate)
        .eq("time_slot_id", slotId)
        .maybeSingle();

      let status: "approved" | "rejected" = "approved";
      let reviewer_comment: string | null = null;
      if (conflict) {
        status = "rejected";
        reviewer_comment = `Automatically rejected: ${v.name} is already booked at ${slotLabel} on ${format(date, "d MMM yyyy")} for ${conflict.course_code} — ${conflict.exam_title}.`;
      }

      const payload: any = {
        user_id: user.id,
        venue_id: v.id,
        time_slot_id: slotId,
        exam_date: examDate,
        ...form,
        programmes: programmesByVenue[v.id] ?? [],
        expected_students: seats,
        status,
        reviewer_comment,
        reviewed_at: new Date().toISOString(),
      };

      let { data, error } = await supabase.from("bookings").insert(payload).select("id").single();
      if (error && error.message.includes("bookings_no_double_approved")) {
        payload.status = "rejected";
        payload.reviewer_comment = `Automatically rejected: ${v.name} was just booked by another user for ${slotLabel} on ${format(date, "d MMM yyyy")}.`;
        ({ data, error } = await supabase.from("bookings").insert(payload).select("id").single());
      }

      results.push({ venueName: v.name, status: payload.status, error: error?.message });
      if (data && !firstId) firstId = data.id;
    }

    setSaving(false);
    const approved = results.filter((r) => r.status === "approved" && !r.error).length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    const failed = results.filter((r) => r.error).length;

    if (approved > 0) toast.success(`${approved} venue(s) approved automatically`);
    if (rejected > 0) toast.error(`${rejected} venue(s) rejected — already booked`);
    if (failed > 0) toast.error(`${failed} venue(s) failed to save`);

    if (firstId) navigate({ to: "/bookings/$id", params: { id: firstId } });
    else navigate({ to: "/bookings" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New booking</h1>
        <p className="text-muted-foreground">Step {step} of 3</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>When and how big?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Exam date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Time slot</Label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger><SelectValue placeholder="Choose a slot" /></SelectTrigger>
                <SelectContent>
                  {slots.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.label} ({s.start_time.slice(0,5)}–{s.end_time.slice(0,5)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected number of students</Label>
              <Input type="number" min={1} value={expectedStudents} onChange={(e) => setExpectedStudents(Number(e.target.value))} />
            </div>
            <Button onClick={() => { if (date && slotId && expectedStudents) setStep(2); else toast.error("Complete all fields"); }} className="w-full">Find venues</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Available venues</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select one or more venues to accommodate all {expectedStudents} students. Selected capacity:{" "}
              <span className={cn("font-semibold", totalCapacity >= expectedStudents ? "text-green-600" : "text-amber-600")}>
                {totalCapacity}
              </span>
              {remaining > 0 && <> — {remaining} more seat(s) needed</>}
            </p>
          </CardHeader>
          <CardContent>
            {needsAlternatives && alternatives.length > 0 && (
              <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
                <div className="flex items-start gap-2 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-warning-foreground">
                      Not enough free capacity on this slot ({availableCapacity} of {expectedStudents} seats).
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Try one of these slots that has room for everyone:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alternatives.map((alt) => (
                        <button
                          key={`${alt.date}-${alt.slotId}`}
                          type="button"
                          onClick={() => applyAlternative(alt)}
                          className="rounded-md border border-warning/40 bg-background px-2.5 py-1.5 text-xs hover:border-primary hover:bg-primary/5"
                        >
                          <span className="font-medium">{format(new Date(alt.date + "T00:00:00"), "EEE d MMM")}</span>
                          <span className="text-muted-foreground"> · {alt.slotLabel}</span>
                          <span className="ml-1 text-muted-foreground">({alt.freeCapacity} seats)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {availableVenues.length === 0 && takenVenues.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No venues configured. Ask the Exams Office to add venues.
              </div>
            ) : (
              <div className="space-y-2">
                {availableVenues.map((v: any) => {
                  const selected = venueIds.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVenue(v.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border p-4 text-left transition hover:border-primary",
                        selected ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md",
                          selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}>
                          {selected ? <Check className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="font-semibold">{v.name}</div>
                          <div className="text-sm text-muted-foreground">{v.building} · Capacity {v.capacity} · {v.type.replace("_", " ")}</div>
                          {v.facilities?.length > 0 && <div className="text-xs text-muted-foreground mt-1">{v.facilities.join(" · ")}</div>}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {takenVenues.length > 0 && (
                  <div className="pt-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      Already booked at this slot
                    </div>
                    <div className="space-y-2">
                      {takenVenues.map((v: any) => (
                        <div
                          key={v.id}
                          className="flex w-full items-center justify-between rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-4 opacity-80"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-muted-foreground line-through">{v.name}</div>
                              <div className="text-sm text-destructive">
                                Taken by <span className="font-medium">{v.conflict.course_code} — {v.conflict.exam_title}</span>
                                {v.conflict.department && <span className="text-muted-foreground"> ({v.conflict.department})</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={() => {
                  if (venueIds.length === 0) return toast.error("Pick at least one venue");
                  if (totalCapacity < expectedStudents) return toast.error(`Selected venues fit ${totalCapacity} of ${expectedStudents} students`);
                  setStep(3);
                }}
                disabled={venueIds.length === 0}
                className="flex-1"
              >
                Continue ({venueIds.length} selected)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Exam details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium mb-1">{venueIds.length} venue(s) · {totalCapacity} seats total</div>
              <div className="text-muted-foreground">{selectedVenues.map((v: any) => v.name).join(", ")}</div>
              <div className="text-xs text-muted-foreground mt-1">One booking will be created per venue, with students distributed by capacity.</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cc">Course code</Label>
                <Input id="cc" value={form.course_code} onChange={(e) => setForm({...form, course_code: e.target.value})} placeholder="e.g. BIT 210" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dep">Department</Label>
                <Input id="dep" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} placeholder="e.g. School of Business" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="et">Exam title</Label>
              <Input id="et" value={form.exam_title} onChange={(e) => setForm({...form, exam_title: e.target.value})} placeholder="e.g. Introduction to Databases — Final Exam" required />
            </div>
            <div className="space-y-3">
              <div>
                <Label>Programmes sitting the exam</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  List the programmes (e.g. <em>BSc Computer Science Y2</em>, <em>BBA Y3</em>). These are shown to students who search this course code so they know which venue to attend.
                </p>
              </div>
              {selectedVenues.map((v: any) => (
                <ProgrammesField
                  key={v.id}
                  venueLabel={selectedVenues.length > 1 ? `${v.name} · ${v.building}` : null}
                  value={programmesByVenue[v.id] ?? []}
                  onChange={(list) => setVenueProgrammes(v.id, list)}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rm">Required materials for students</Label>
              <p className="text-xs text-muted-foreground">Shown to students when they search this exam. e.g. Student ID, scientific calculator, blue/black pen, drawing set.</p>
              <Textarea id="rm" value={form.required_materials} onChange={(e) => setForm({...form, required_materials: e.target.value})} placeholder="e.g. Student ID card, scientific calculator, 2 blue pens" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr">Special requirements for the venue (optional)</Label>
              <Textarea id="sr" value={form.special_requirements} onChange={(e) => setForm({...form, special_requirements: e.target.value})} placeholder="e.g. Extra projector, wheelchair access" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt">Notes for the Exams Office (optional)</Label>
              <Textarea id="nt" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={submit} disabled={saving || !form.course_code || !form.exam_title || !form.department} className="flex-1">
                {saving ? "Submitting…" : `Submit ${venueIds.length} booking(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProgrammesField({
  venueLabel,
  value,
  onChange,
}: {
  venueLabel: string | null;
  value: string[];
  onChange: (list: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const clean = draft.trim();
    if (!clean) return;
    if (value.includes(clean)) { setDraft(""); return; }
    onChange([...value, clean]);
    setDraft("");
  }
  function remove(p: string) {
    onChange(value.filter((x) => x !== p));
  }

  return (
    <div className="rounded-md border p-3">
      {venueLabel && (
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary" /> {venueLabel}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Type a programme and press Enter (e.g. BSc CS Y2)"
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {p}
              <button
                type="button"
                onClick={() => remove(p)}
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label={`Remove ${p}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
