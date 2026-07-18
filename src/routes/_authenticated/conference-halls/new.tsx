import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conference-halls/new")({
  component: NewHall,
});

function NewHall() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [form, setForm] = useState({
    name: "", location: "", capacity: 100, facilities: "", description: "",
  });
  const [saving, setSaving] = useState(false);

  if (!loading && !isAdmin) return <div className="text-center text-muted-foreground">Admins only.</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("conference_halls" as any).insert({
      name: form.name,
      location: form.location,
      capacity: Number(form.capacity),
      facilities: form.facilities.split(",").map((f) => f.trim()).filter(Boolean),
      description: form.description || null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conference hall added");
    navigate({ to: "/conference-halls" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Add conference hall</h1>
      <Card>
        <CardHeader><CardTitle>Hall details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Conference Hall" required /></div>
            <div className="space-y-2"><Label>Location / Building</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Admin Block, Ground Floor" required /></div>
            <div className="space-y-2"><Label>Capacity</Label>
              <Input type="number" min={1} value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required /></div>
            <div className="space-y-2"><Label>Facilities (comma separated)</Label>
              <Input value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })}
                placeholder="Projector, PA System, AC, Wi-Fi, Podium" /></div>
            <div className="space-y-2"><Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/conference-halls" })}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving…" : "Add hall"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
