import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ClipboardList, FileText, Megaphone, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusConnect — Your university, in one place" },
      { name: "description", content: "Notices, notes, assignments, events and Lost & Found for JECRC University students and faculty." },
      { property: "og:title", content: "CampusConnect — Your university, in one place" },
      { property: "og:description", content: "The official portal for notices, notes, assignments, events and Lost & Found." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Megaphone, t: "Digital Notice Board" }, { icon: FileText, t: "Notes Sharing" },
  { icon: ClipboardList, t: "Assignment Tracker" }, { icon: CalendarDays, t: "College Events" }, { icon: PackageSearch, t: "Lost & Found" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <p className="mx-auto inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary">For JECRC University · @jecrcu.edu.in</p>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.05] text-foreground sm:text-6xl">Your whole campus, <span className="text-gradient-primary">in one place.</span></h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Notices, study notes, deadlines, events and Lost & Found — for students, faculty and the college office.</p>
        <Button asChild variant="hero" size="lg" className="mt-8"><Link to="/auth">Sign in with college email <ArrowRight /></Link></Button>
        <div className="mt-16 grid gap-4 sm:grid-cols-5">
          {FEATURES.map(({ icon: Icon, t }) => (
            <div key={t} className="rounded-2xl border bg-card p-5 shadow-card interactive-card">
              <Icon className="mx-auto size-6 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">{t}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
