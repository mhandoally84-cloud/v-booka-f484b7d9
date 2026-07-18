import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conference-halls/$id")({
  component: EditHall,
});

function EditHall() {
  const { id } = useParams({ from: "/_authenticated/conference-halls/$id" });
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("conference_halls" as any).select("*").eq("id", id).single();
      if (data) setForm({ ...(data as any), facilities: ((data as any).facilities ?? []).join(", ") });
    })();
  }, [id]);

  if (!loading && !isAdmin) return <div className="text-center text-muted-foreground">Admins only.</div>;
  if (!form) return <div className="text-muted-foreground">Loading…</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("conference_halls" as any).update({
      name: form.name,
      location: form.location,
      capacity: Number(form.capacity),
      facilities: form.facilities.split(",").map((f: string) => f.trim()).filter(Boolean),
      description: form.description || null,
    } as any).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    navigate({ to: "/conference-halls" });
  }

  async function remove() {
    if (!confirm("Delete this hall? Existing bookings referencing it will block deletion.")) return;
    const { error } = await supabase.from("conference_halls" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/conference-halls" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Edit conference hall</h1>
      <Card>
        <CardHeader><CardTitle>Hall details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Capacity</Label>
              <Input type="number" min={1} value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required /></div>
            <div className="space-y-2"><Label>Facilities (comma separated)</Label>
              <Input value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label>
              <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" onClick={remove}>Delete</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/conference-halls" })}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
