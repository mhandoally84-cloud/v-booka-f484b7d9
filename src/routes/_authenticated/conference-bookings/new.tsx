import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conference-bookings/new")({
  component: NewConferenceBooking,
});

function NewConferenceBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [halls, setHalls] = useState<any[]>([]);
  const [form, setForm] = useState({
    hall_id: "",
    activity_title: "",
    purpose: "",
    participants: 30,
    tech_materials: "",
    refreshments: "",
    other_requirements: "",
    date: "",
    start_time: "09:00",
    end_time: "12:00",
  });
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("conference_halls" as any)
        .select("*").eq("is_active", true).eq("under_maintenance", false).order("name");
      setHalls((data as any[]) ?? []);
    })();
  }, []);

  const selectedHall = useMemo(() => halls.find((h) => h.id === form.hall_id), [halls, form.hall_id]);
  const overCapacity = selectedHall && form.participants > selectedHall.capacity;

  // Live conflict check
  useEffect(() => {
    setConflict(null);
    if (!form.hall_id || !form.date || !form.start_time || !form.end_time) return;
    const start = new Date(`${form.date}T${form.start_time}:00`);
    const end = new Date(`${form.date}T${form.end_time}:00`);
    if (end <= start) { setConflict("End time must be after start time."); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("conference_bookings" as any)
        .select("id, activity_title, start_at, end_at")
        .eq("hall_id", form.hall_id).eq("status", "approved")
        .lt("start_at", end.toISOString())
        .gt("end_at", start.toISOString());
      if (cancelled) return;
      if (data && data.length > 0) {
        const c: any = data[0];
        setConflict(`Conflicts with an approved booking: "${c.activity_title}"`);
      }
    })();
    return () => { cancelled = true; };
  }, [form.hall_id, form.date, form.start_time, form.end_time]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (overCapacity) return toast.error("Participants exceed hall capacity");
    const start = new Date(`${form.date}T${form.start_time}:00`);
    const end = new Date(`${form.date}T${form.end_time}:00`);
    if (end <= start) return toast.error("End time must be after start time");

    setSaving(true);
    const { error } = await supabase.from("conference_bookings" as any).insert({
      hall_id: form.hall_id,
      user_id: user.id,
      activity_title: form.activity_title,
      purpose: form.purpose || null,
      participants: Number(form.participants),
      tech_materials: form.tech_materials || null,
      refreshments: form.refreshments || null,
      other_requirements: form.other_requirements || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "pending",
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking submitted for review");
    navigate({ to: "/conference-bookings" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Book a conference hall</h1>
      <Card>
        <CardHeader><CardTitle>Event details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label>Conference hall *</Label>
              <Select value={form.hall_id} onValueChange={(v) => setForm({ ...form, hall_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a hall" /></SelectTrigger>
                <SelectContent>
                  {halls.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} — {h.location} (cap. {h.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Activity / Event title *</Label>
              <Input value={form.activity_title}
                onChange={(e) => setForm({ ...form, activity_title: e.target.value })}
                placeholder="e.g. Faculty of Science Annual Seminar" required />
            </div>

            <div className="space-y-2">
              <Label>Purpose / Description</Label>
              <Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={3} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Start time *</Label>
                <Input type="time" value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>End time *</Label>
                <Input type="time" value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              </div>
            </div>

            {conflict && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" /> {conflict}
              </div>
            )}
            {form.hall_id && form.date && !conflict && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 mt-0.5" /> This time slot looks free.
              </div>
            )}

            <div className="space-y-2">
              <Label>Number of participants *</Label>
              <Input type="number" min={1} value={form.participants}
                onChange={(e) => setForm({ ...form, participants: Number(e.target.value) })} required />
              {overCapacity && (
                <p className="text-sm text-destructive">
                  Exceeds hall capacity of {selectedHall.capacity}. Choose a bigger hall.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Required tech / equipment</Label>
              <Textarea value={form.tech_materials}
                onChange={(e) => setForm({ ...form, tech_materials: e.target.value })}
                placeholder="Projector, microphones, extra sockets, laptop, Zoom setup…" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Refreshments required</Label>
              <Textarea value={form.refreshments}
                onChange={(e) => setForm({ ...form, refreshments: e.target.value })}
                placeholder="Tea break for 30 at 10:30, lunch for 30 at 13:00…" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Other requirements / notes</Label>
              <Textarea value={form.other_requirements}
                onChange={(e) => setForm({ ...form, other_requirements: e.target.value })}
                placeholder="Anything else the Exams/Estates office should know" rows={2} />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/conference-bookings" })}>Cancel</Button>
              <Button type="submit" disabled={saving || !!conflict || !!overCapacity} className="flex-1">
                {saving ? "Submitting…" : "Submit booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
