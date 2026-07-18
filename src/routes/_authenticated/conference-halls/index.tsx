import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Presentation, Plus, Pencil, Users, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conference-halls/")({
  component: ConferenceHallsList,
});

function ConferenceHallsList() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: halls = [], isLoading } = useQuery({
    queryKey: ["conference_halls"],
    queryFn: async () =>
      (await supabase.from("conference_halls" as any).select("*").order("name")).data ?? [],
  });

  async function toggle(id: string, field: "is_active" | "under_maintenance", value: boolean) {
    const { error } = await supabase
      .from("conference_halls" as any)
      .update({ [field]: value } as any)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["conference_halls"] });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Conference Halls</h1>
          <p className="text-muted-foreground">Book a hall for events, seminars, meetings</p>
        </div>
        <div className="flex gap-2">
          <Link to="/conference-bookings/new">
            <Button variant="secondary">Book a hall</Button>
          </Link>
          {isAdmin && (
            <Link to="/conference-halls/new">
              <Button><Plus className="mr-2 h-4 w-4" /> Add hall</Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : halls.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No conference halls yet.{isAdmin && " Click 'Add hall' to create the first one."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {halls.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Presentation className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{h.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {h.location}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {h.capacity} seats</span>
                      </div>
                      {h.facilities?.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">{h.facilities.join(" · ")}</div>
                      )}
                      {h.description && <div className="mt-2 text-sm">{h.description}</div>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Link to="/conference-halls/$id" params={{ id: h.id }}>
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                    <label className="flex items-center gap-2">
                      <Switch checked={h.is_active} onCheckedChange={(c) => toggle(h.id, "is_active", c)} /> Active
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch checked={h.under_maintenance} onCheckedChange={(c) => toggle(h.id, "under_maintenance", c)} /> Under maintenance
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
