import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, Users, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conference-bookings/$id")({
  component: ConferenceBookingDetail,
});

function ConferenceBookingDetail() {
  const { id } = useParams({ from: "/_authenticated/conference-bookings/$id" });
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: b, isLoading } = useQuery({
    queryKey: ["conference_booking", id],
    queryFn: async () => {
      const { data } = await supabase.from("conference_bookings" as any)
        .select("*, conference_halls(name, location, capacity)")
        .eq("id", id).single();
      return data as any;
    },
  });

  if (isLoading || !b) return <div className="text-muted-foreground">Loading…</div>;

  const isOwner = user?.id === b.user_id;

  async function updateStatus(status: "approved" | "rejected") {
    const { error } = await supabase.from("conference_bookings" as any).update({
      status,
      reviewer_id: user!.id,
      reviewer_comment: reviewComment || null,
      reviewed_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    qc.invalidateQueries({ queryKey: ["conference_booking", id] });
    qc.invalidateQueries({ queryKey: ["conference_bookings"] });
  }

  async function cancel() {
    if (!cancelReason.trim()) return toast.error("Please provide a cancellation reason");
    const { error } = await supabase.from("conference_bookings" as any).update({
      status: "cancelled",
      cancellation_reason: cancelReason.trim(),
      cancelled_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    navigate({ to: "/conference-bookings" });
  }

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-emerald-100 text-emerald-900",
    rejected: "bg-rose-100 text-rose-900",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{b.activity_title}</h1>
        <Badge className={statusColor[b.status]}>{b.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Event</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />
            {b.conference_halls?.name} · {b.conference_halls?.location} (cap. {b.conference_halls?.capacity})</div>
          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(b.start_at), "PPPP p")} → {format(new Date(b.end_at), "p")}</div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> {b.participants} participants</div>
          {b.purpose && <Field label="Purpose" value={b.purpose} />}
          {b.tech_materials && <Field label="Tech / equipment" value={b.tech_materials} />}
          {b.refreshments && <Field label="Refreshments" value={b.refreshments} />}
          {b.other_requirements && <Field label="Other requirements" value={b.other_requirements} />}
          {b.reviewer_comment && <Field label="Reviewer comment" value={b.reviewer_comment} />}
          {b.cancellation_reason && <Field label="Cancellation reason" value={b.cancellation_reason} />}
        </CardContent>
      </Card>

      {isAdmin && b.status === "pending" && (
        <Card>
          <CardHeader><CardTitle>Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comment for the requester" rows={2} />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => updateStatus("rejected")}>Reject</Button>
              <Button className="flex-1" onClick={() => updateStatus("approved")}>Approve</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner && (b.status === "pending" || b.status === "approved") && (
        <Card>
          <CardHeader><CardTitle>Cancel booking</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (required)" rows={2} />
            <Button variant="destructive" onClick={cancel}>Cancel this booking</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  );
}
