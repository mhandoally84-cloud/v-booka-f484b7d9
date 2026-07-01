import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/venues/$id")({
  component: EditVenue,
});

function EditVenue() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["venue", id],
    queryFn: async () => (await supabase.from("venues").select("*").eq("id", id).single()).data,
  });

  useEffect(() => {
    if (data && !form) setForm({ ...data, facilities: (data.facilities ?? []).join(", ") });
  }, [data, form]);

  if (!form) return <div className="text-center text-muted-foreground">Loading…</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("venues").update({
      name: form.name, building: form.building, capacity: Number(form.capacity),
      type: form.type, facilities: form.facilities.split(",").map((f: string) => f.trim()).filter(Boolean),
    }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    navigate({ to: "/venues" });
  }

  async function del() {
    if (!confirm("Delete this venue? Existing bookings will remain but this venue can't be booked again.")) return;
    const { error } = await supabase.from("venues").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/venues" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Edit venue</h1>
      <Card>
        <CardHeader><CardTitle>Venue details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Building</Label><Input value={form.building} onChange={(e) => setForm({...form, building: e.target.value})} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({...form, capacity: Number(e.target.value)})} required /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture_hall">Lecture Hall</SelectItem>
                    <SelectItem value="computer_lab">Computer Lab</SelectItem>
                    <SelectItem value="exam_hall">Exam Hall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Facilities</Label><Input value={form.facilities} onChange={(e) => setForm({...form, facilities: e.target.value})} /></div>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" onClick={del}>Delete</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/venues" })}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
