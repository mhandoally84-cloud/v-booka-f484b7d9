import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  pending: "bg-warning/25 text-warning-foreground border-warning/60",
  approved: "bg-success/20 text-success border-success/60",
  rejected: "bg-destructive/20 text-destructive border-destructive/60",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const labels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? styles.pending,
        className,
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
