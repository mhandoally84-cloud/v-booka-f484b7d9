import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { CalendarIcon, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
  const [minCapacity, setMinCapacity] = useState<number>(50);
  const [venueId, setVenueId] = useState<string>("");
  const [form, setForm] = useState({
    course_code: "", exam_title: "", department: "", expected_students: 50, special_requirements: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: slots = [] } = useQuery({
    queryKey: ["time-slots"],
    queryFn: async () => (await supabase.from("time_slots").select("*").order("sort_order")).data ?? [],
  });

  const { data: availableVenues = [] } = useQuery({
    queryKey: ["available-venues", date?.toISOString(), slotId, minCapacity],
    enabled: !!date && !!slotId,
    queryFn: async () => {
      const { data: allVenues } = await supabase
        .from("venues").select("*").eq("is_active", true).eq("under_maintenance", false).gte("capacity", minCapacity);
      const { data: taken } = await supabase
        .from("bookings").select("venue_id")
        .eq("status", "approved").eq("exam_date", format(date!, "yyyy-MM-dd")).eq("time_slot_id", slotId);
      const takenIds = new Set((taken ?? []).map((b) => b.venue_id));
      return (allVenues ?? []).filter((v) => !takenIds.has(v.id));
    },
  });

  async function submit() {
    if (!user || !date || !slotId || !venueId) return;
    setSaving(true);
    const { data, error } = await supabase.from("bookings").insert({
      user_id: user.id,
      venue_id: venueId,
      time_slot_id: slotId,
      exam_date: format(date, "yyyy-MM-dd"),
      ...form,
      expected_students: Number(form.expected_students),
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking submitted for approval");
    navigate({ to: "/bookings/$id", params: { id: data.id } });
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
              <Input type="number" min={1} value={minCapacity} onChange={(e) => setMinCapacity(Number(e.target.value))} />
            </div>
            <Button onClick={() => { if (date && slotId && minCapacity) { setForm((f) => ({...f, expected_students: minCapacity })); setStep(2); } else toast.error("Complete all fields"); }} className="w-full">Find venues</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Available venues</CardTitle></CardHeader>
          <CardContent>
            {availableVenues.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No venues available for this date, slot, and capacity. Try a different combination.
              </div>
            ) : (
              <div className="space-y-2">
                {availableVenues.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setVenueId(v.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border p-4 text-left transition hover:border-primary",
                      venueId === v.id ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{v.name}</div>
                        <div className="text-sm text-muted-foreground">{v.building} · Capacity {v.capacity} · {v.type.replace("_", " ")}</div>
                        {v.facilities?.length > 0 && <div className="text-xs text-muted-foreground mt-1">{v.facilities.join(" · ")}</div>}
                      </div>
                    </div>
                    {venueId === v.id && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => venueId ? setStep(3) : toast.error("Pick a venue")} disabled={!venueId} className="flex-1">Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Exam details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="es">Expected students</Label>
              <Input id="es" type="number" min={1} value={form.expected_students} onChange={(e) => setForm({...form, expected_students: Number(e.target.value)})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr">Special requirements (optional)</Label>
              <Textarea id="sr" value={form.special_requirements} onChange={(e) => setForm({...form, special_requirements: e.target.value})} placeholder="e.g. Extra projector, wheelchair access" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt">Notes for the Exams Office (optional)</Label>
              <Textarea id="nt" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={submit} disabled={saving || !form.course_code || !form.exam_title || !form.department} className="flex-1">
                {saving ? "Submitting…" : "Submit booking request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
