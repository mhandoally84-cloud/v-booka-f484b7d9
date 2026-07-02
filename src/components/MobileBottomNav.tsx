import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, CalendarDays, Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/bookings", label: "Bookings", icon: ClipboardList },
    { to: "/bookings/new", label: "New", icon: Plus, primary: true },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: unread },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      {items.map((it) => {
        const active = pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
        if (it.primary) {
          return (
            <Link
              key={it.to}
              to={it.to}
              className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
              aria-label={it.label}
            >
              <it.icon className="h-6 w-6" />
            </Link>
          );
        }
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-[10px] font-medium transition",
              active ? "text-primary" : "text-muted-foreground",
            )}
            aria-label={it.label}
          >
            <div className="relative">
              <it.icon className="h-5 w-5" />
              {"badge" in it && it.badge ? (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {it.badge > 9 ? "9+" : it.badge}
                </span>
              ) : null}
            </div>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
