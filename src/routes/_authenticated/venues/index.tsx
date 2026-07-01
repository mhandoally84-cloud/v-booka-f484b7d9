import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/venues/")({
  component: VenuesList,
});

function VenuesList() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: venues = [] } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => (await supabase.from("venues").select("*").order("name")).data ?? [],
  });

  async function toggle(id: string, field: "is_active" | "under_maintenance", value: boolean) {
    const { error } = await supabase.from("venues").update({ [field]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["venues"] });
  }

  if (!loading && !isAdmin) return <div className="text-center text-muted-foreground">Admins only.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Venues</h1>
          <p className="text-muted-foreground">Manage examination venues</p>
        </div>
        <Link to="/venues/new"><Button><Plus className="mr-2 h-4 w-4" />Add venue</Button></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {venues.map((v: any) => (
          <Card key={v.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{v.name}</div>
                    <div className="text-sm text-muted-foreground">{v.building} · Capacity {v.capacity} · {v.type.replace("_", " ")}</div>
                    {v.facilities?.length > 0 && <div className="mt-1 text-xs text-muted-foreground">{v.facilities.join(" · ")}</div>}
                  </div>
                </div>
                <Link to="/venues/$id" params={{ id: v.id }}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                <label className="flex items-center gap-2"><Switch checked={v.is_active} onCheckedChange={(c) => toggle(v.id, "is_active", c)} /> Active</label>
                <label className="flex items-center gap-2"><Switch checked={v.under_maintenance} onCheckedChange={(c) => toggle(v.id, "under_maintenance", c)} /> Under maintenance</label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
