import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/calendar")({
  head: () => pageHead("Calendar", "Assignment deadlines, events, holidays and exams."),
  component: CalendarPage,
});

type Kind = "assignment" | "event" | "holiday" | "exam" | "notice";
type Entry = { id: string; kind: Kind; title: string; date: Date; detail: string };

const KIND: Record<Kind, { label: string; dot: string; chip: string }> = {
  assignment: { label: "Assignment deadline", dot: "bg-warning", chip: "bg-warning-soft text-warning-foreground dark:text-warning" },
  event: { label: "College event", dot: "bg-primary", chip: "bg-primary-soft text-accent-foreground" },
  holiday: { label: "Holiday", dot: "bg-success", chip: "bg-success-soft text-success" },
  exam: { label: "Exam", dot: "bg-destructive", chip: "bg-destructive-soft text-destructive" },
  notice: { label: "Notice", dot: "bg-violet", chip: "bg-violet-soft text-violet" },
};

function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dir, setDir] = useState(1);
  const [open, setOpen] = useState<Entry | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: async (): Promise<Entry[]> => {
      const [a, e, n] = await Promise.all([
        supabase.from("assignments").select("id,title,subject,due_date"),
        supabase.from("events").select("id,title,venue,event_date,start_time"),
        supabase.from("notices").select("id,title,category,event_date").not("event_date", "is", null),
      ]);
      return [
        ...(a.data ?? []).map((x) => ({ id: x.id, kind: "assignment" as const, title: x.title, date: new Date(x.due_date), detail: `${x.subject} · due ${format(new Date(x.due_date), "h:mm a")}` })),
        ...(e.data ?? []).map((x) => ({ id: x.id, kind: "event" as const, title: x.title, date: new Date(`${x.event_date}T${x.start_time}`), detail: `${x.venue} · ${x.start_time.slice(0, 5)}` })),
        ...(n.data ?? []).map((x) => ({ id: x.id, kind: (x.category === "holiday" ? "holiday" : x.category === "exam" ? "exam" : "notice") as Kind, title: x.title, date: new Date(`${x.event_date}T00:00`), detail: "Official notice" })),
      ];
    },
  });

  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  const go = (d: number) => { setDir(d); setMonth((m) => addMonths(m, d)); };
  const upcoming = data.filter((x) => isSameMonth(x.date, month)).sort((a, b) => +a.date - +b.date);

  return (
    <>
      <PageHeader icon={<CalendarRange />} title="Calendar" description="Deadlines, events, holidays and exams at a glance." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-display text-lg font-semibold">{format(month, "MMMM yyyy")}</h2>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => { setDir(1); setMonth(startOfMonth(new Date())); }}>Today</Button>
              <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => go(-1)}><ChevronLeft /></Button>
              <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => go(1)}><ChevronRight /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          {isLoading ? <Skeleton className="m-4 h-96 rounded-xl" /> : (
            <div className="relative overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div
                  key={month.toISOString()}
                  custom={dir}
                  initial={{ x: dir * 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: dir * -60, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-7"
                >
                  {days.map((d) => {
                    const items = data.filter((x) => isSameDay(x.date, d));
                    return (
                      <div key={d.toISOString()} className={cn("min-h-24 border-b border-r p-1.5 sm:min-h-28", !isSameMonth(d, month) && "bg-muted/40 text-muted-foreground")}>
                        <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-medium", isToday(d) && "bg-primary text-primary-foreground")}>{format(d, "d")}</span>
                        <div className="mt-1 space-y-1">
                          {items.slice(0, 3).map((x) => (
                            <button key={`${x.kind}-${x.id}`} type="button" onClick={() => setOpen(x)} className={cn("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:brightness-95", KIND[x.kind].chip)}>
                              {x.title}
                            </button>
                          ))}
                          {items.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{items.length - 3} more</p>}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h3 className="font-display font-semibold">Legend</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(Object.keys(KIND) as Kind[]).map((k) => <li key={k} className="flex items-center gap-2"><span className={cn("size-2.5 rounded-full", KIND[k].dot)} /> {KIND[k].label}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h3 className="font-display font-semibold">This month</h3>
            {upcoming.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing scheduled.</p> : (
              <ul className="mt-3 space-y-2">
                {upcoming.slice(0, 8).map((x) => (
                  <li key={`${x.kind}-${x.id}`}>
                    <button type="button" onClick={() => setOpen(x)} className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition hover:bg-muted/60">
                      <span className="w-9 shrink-0 text-center"><span className="block text-[10px] uppercase text-muted-foreground">{format(x.date, "EEE")}</span><span className="font-display font-bold">{format(x.date, "d")}</span></span>
                      <span className={cn("size-2 shrink-0 rounded-full", KIND[x.kind].dot)} />
                      <span className="truncate text-sm">{x.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <>
              <DialogHeader>
                <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-xs font-medium", KIND[open.kind].chip)}>{KIND[open.kind].label}</span>
                <DialogTitle className="pt-1">{open.title}</DialogTitle>
                <DialogDescription>{format(open.date, "EEEE, d MMMM yyyy")} · {open.detail}</DialogDescription>
              </DialogHeader>
              <Button asChild variant="hero">
                {open.kind === "event" ? <Link to="/events/$id" params={{ id: open.id }}>Open event</Link>
                  : open.kind === "assignment" ? <Link to="/assignments">Open assignments</Link>
                  : <Link to="/notices/$id" params={{ id: open.id }}>Open notice</Link>}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
