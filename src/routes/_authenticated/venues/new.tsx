import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/venues/new")({
  component: NewVenue,
});

function NewVenue() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", building: "", capacity: 100, type: "lecture_hall", facilities: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("venues").insert({
      name: form.name,
      building: form.building,
      capacity: Number(form.capacity),
      type: form.type as any,
      facilities: form.facilities.split(",").map((f) => f.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Venue added");
    navigate({ to: "/venues" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Add venue</h1>
      <Card>
        <CardHeader><CardTitle>Venue details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Building / Block</Label><Input value={form.building} onChange={(e) => setForm({...form, building: e.target.value})} required /></div>
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
            <div className="space-y-2"><Label>Facilities (comma separated)</Label><Input value={form.facilities} onChange={(e) => setForm({...form, facilities: e.target.value})} placeholder="AC, Projector, PA System" /></div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/venues" })}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving…" : "Add venue"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
