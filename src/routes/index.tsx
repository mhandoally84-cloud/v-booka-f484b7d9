import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandHeader } from "@/components/BrandHeader";
import { Building2, CalendarCheck2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader>
        <Link to="/auth"><Button variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Sign in</Button></Link>
        <Link to="/auth"><Button className="bg-gold text-gold-foreground hover:bg-gold/90">Get started</Button></Link>
      </BrandHeader>

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-primary via-primary to-sidebar text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
                <ShieldCheck className="h-3.5 w-3.5" /> Mzumbe University · Exams Office
              </div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Book exam venues in <span className="text-gold">under a minute</span>.
              </h1>
              <p className="mt-4 max-w-lg text-base text-primary-foreground/80 md:text-lg">
                A simple way for lecturers to reserve halls and labs, and for the Exams Office
                to approve, schedule, and prevent double-bookings.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                    <CalendarCheck2 className="mr-2 h-5 w-5" /> Book a venue
                  </Button>
                </Link>
                <Link to="/find-exam">
                  <Button size="lg" variant="outline" className="border-gold/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                    Find my exam
                  </Button>
                </Link>
                <Link to="/find-hall">
                  <Button size="lg" variant="outline" className="border-gold/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                    Find a hall booking
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick "Find My Exam" */}
            <Card className="border-gold/30 bg-card/95 shadow-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Search className="h-5 w-5" />
                  <h2 className="font-semibold">Where is my exam?</h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Enter your course code (e.g., BIT 210) to see the venue and time.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (code.trim()) navigate({ to: "/find-exam", search: { q: code.trim() } });
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="e.g. BIT 210"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="text-base"
                  />
                  <Button type="submit">Search</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Building2, title: "Real venue availability", body: "Search halls and labs by date, capacity, and facilities. No more phone calls." },
            { icon: CalendarCheck2, title: "One-click approvals", body: "Exams Office reviews requests in a single dashboard, with automatic conflict detection." },
            { icon: Search, title: "Public exam lookup", body: "Students can find their exam venue with just a course code — no login needed." },
          ].map((f) => (
            <Card key={f.title} className="border-border/60">
              <CardContent className="p-6">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/30 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mzumbe University · Exam Venue Booking System
      </footer>
    </div>
  );
}
