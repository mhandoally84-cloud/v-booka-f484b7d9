import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MapPin, CalendarDays, Clock, Users, GraduationCap, MessageSquare, Trash2, Printer, ArrowLeft } from "lucide-react";


export const Route = createFileRoute("/_authenticated/bookings/$id")({
  component: BookingDetail,
});

async function notify(userId: string, message: string, link: string) {
  await supabase.from("notifications").insert({ user_id: userId, message, link });
}

function BookingDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*, venues(name, building, capacity), time_slots(label, start_time, end_time)")
        .eq("id", id).single();
      if (!booking) return null;
      const { data: profile } = booking.user_id
        ? await supabase.from("profiles").select("full_name, department").eq("id", booking.user_id).maybeSingle()
        : { data: null };
      return { ...booking, profile };
    },
  });

  if (isLoading) return <div className="text-center text-muted-foreground">Loading…</div>;
  if (!data) return <div>Not found</div>;

  const b = data;

  async function updateStatus(status: "approved" | "rejected") {
    setBusy(true);
    const { error } = await supabase.from("bookings").update({
      status,
      reviewer_id: user!.id,
      reviewer_comment: comment || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    setBusy(false);
    if (error) {
      if (error.message.includes("bookings_no_double_approved")) {
        return toast.error("Conflict: this venue is already booked for that date & slot.");
      }
      return toast.error(error.message);
    }
    if (b.user_id) await notify(b.user_id, `Your booking for ${b.course_code} was ${status}`, `/bookings/${id}`);
    toast.success(`Booking ${status}`);
    qc.invalidateQueries();
  }

  async function cancelOwn() {
    const reason = cancelReason.trim();
    if (!reason) return toast.error("Please tell students why you are cancelling.");
    if (reason.length > 500) return toast.error("Reason must be 500 characters or fewer.");
    setBusy(true);
    const { error } = await supabase.from("bookings").update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled. Students searching this exam will see your note.");
    qc.invalidateQueries();
  }

  async function del() {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/bookings" });
  }

  const canReview = isAdmin && b.status === "pending";
  const canCancel = user?.id === b.user_id && (b.status === "pending" || b.status === "approved");

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{b.course_code} — {b.exam_title}</h1>
          <p className="text-muted-foreground">{b.department}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={b.status} />
          {b.status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <Info icon={MapPin} label="Venue" value={`${b.venues?.name} · ${b.venues?.building}`} />
          <Info icon={CalendarDays} label="Date" value={format(new Date(b.exam_date), "EEEE, d MMMM yyyy")} />
          <Info icon={Clock} label="Time slot" value={`${b.time_slots?.label} (${b.time_slots?.start_time.slice(0,5)}–${b.time_slots?.end_time.slice(0,5)})`} />
          <Info icon={Users} label="Expected students" value={`${b.expected_students} (capacity ${b.venues?.capacity})`} />
          <Info icon={GraduationCap} label="Requested by" value={b.profile?.full_name ?? "—"} />
        </CardContent>
      </Card>

      {(b.special_requirements || b.notes) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Additional information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {b.special_requirements && <div><div className="font-medium mb-1">Special requirements</div><div className="text-muted-foreground">{b.special_requirements}</div></div>}
            {b.notes && <div><div className="font-medium mb-1">Notes</div><div className="text-muted-foreground">{b.notes}</div></div>}
          </CardContent>
        </Card>
      )}

      {b.reviewer_comment && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Exams Office comment</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{b.reviewer_comment}</p></CardContent>
        </Card>
      )}

      {b.cancellation_reason && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Cancellation reason</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{b.cancellation_reason}</p>
            {b.cancelled_at && <p className="mt-2 text-xs text-muted-foreground">Cancelled on {format(new Date(b.cancelled_at), "d MMM yyyy · HH:mm")}</p>}
          </CardContent>
        </Card>
      )}

      {canReview && (
        <Card>
          <CardHeader><CardTitle>Review this request</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Optional comment for the requester…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => updateStatus("approved")} disabled={busy} className="flex-1 bg-success text-success-foreground hover:bg-success/90">Approve</Button>
              <Button onClick={() => updateStatus("rejected")} disabled={busy} variant="destructive" className="flex-1">Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canCancel && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Cancel this booking</CardTitle>
            <p className="text-sm text-muted-foreground">Your reason will be shown to students who look up this exam so they know why it was cancelled.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="e.g. Lecturer unavailable due to illness — exam rescheduled to next week"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{cancelReason.length}/500</span>
              <Button variant="destructive" onClick={cancelOwn} disabled={busy || !cancelReason.trim()}>
                Cancel booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 print:hidden">
        {isAdmin && <Button variant="ghost" onClick={del} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
      </div>

      <div className="hidden print:mt-8 print:block print:border-t print:pt-4 print:text-xs print:text-muted-foreground">
        Mzumbe University · Exam Venue Booking · Printed {format(new Date(), "d MMM yyyy, HH:mm")}
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
