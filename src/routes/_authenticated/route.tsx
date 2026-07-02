import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, CalendarDays, ClipboardList, Building2, BarChart3, Bell, LogOut, Menu, X, ShieldCheck, ScrollText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/bookings", label: "Bookings", icon: ClipboardList },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    ...(isAdmin ? [
      { to: "/venues", label: "Venues", icon: Building2 },
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/admins", label: "Admins", icon: ShieldCheck },
    ] : []),
    { to: "/notifications", label: "Notifications", icon: Bell, badge: unread },
  ];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-muted/30 print:bg-white">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 print:hidden",
        open && "translate-x-0",
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold text-gold-foreground"><GraduationCap className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-gold">Mzumbe</div>
              <div className="text-[10px] text-sidebar-foreground/70">Exam Booking</div>
            </div>
          </Link>
          <button className="lg:hidden min-h-11 min-w-11" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <span className="flex items-center gap-3"><item.icon className="h-4 w-4" /> {item.label}</span>
                {"badge" in item && item.badge ? (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 space-y-1 border-t border-sidebar-border p-3">
          <ThemeToggle />
          <Button variant="ghost" onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-6 print:hidden">
          <button className="lg:hidden min-h-11 min-w-11 -ml-2" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <div className="lg:hidden"><ThemeToggle compact /></div>
            <Link to="/bookings/new" className="hidden sm:block">
              <Button className="min-h-11 bg-primary hover:bg-primary/90"><ClipboardList className="mr-2 h-4 w-4" /> New booking</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8 print:p-0">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav unread={unread} />
    </div>
  );
}
