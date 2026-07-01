import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function BrandHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-gold-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold uppercase tracking-wider text-gold">Mzumbe University</div>
            <div className="text-xs text-sidebar-foreground/70">Exam Venue Booking</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
