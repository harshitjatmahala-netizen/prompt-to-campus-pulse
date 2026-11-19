import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Check, Clock, MapPin, Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { EventDialog } from "@/components/app/event-dialog";
import { BookmarkButton } from "@/components/app/bookmark-button";
import { EventBanner } from "@/components/app/event-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/lib/me";
import { isStaff } from "@/lib/rules";
import { eventDateTime, useEventsData, useToggleRegistration } from "@/lib/events";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/events/")({
  head: () => pageHead("Events", "Discover and register for college events."),
  component: EventsPage,
});

function EventsPage() {
  const me = useMe();
  const staff = isStaff(me?.role);
  const { data = [], isLoading } = useEventsData(me?.userId);
  const toggle = useToggleRegistration(me?.userId);
  const [tab, setTab] = useState("upcoming");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    const s = q.trim().toLowerCase();
    return data
      .filter((e) => {
        const dt = eventDateTime(e.event_date, e.start_time);
        if (tab === "upcoming" && dt < now) return false;
        if (tab === "past" && dt >= now) return false;
        if (tab === "registered" && !e.registered) return false;
        return !s || [e.title, e.venue, e.organizer, e.description].some((v) => v.toLowerCase().includes(s));
      })
      .sort((a, b) => (tab === "past" ? -1 : 1) * (eventDateTime(a.event_date, a.start_time).getTime() - eventDateTime(b.event_date, b.start_time).getTime()));
  }, [data, tab, q]);

  return (
    <>
      <PageHeader
        icon={<CalendarDays />}
        title="College Events"
        description="Fests, workshops, talks and matches happening around campus."
        actions={staff && <Button variant="hero" onClick={() => setOpen(true)}><Plus /> Create event</Button>}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="registered">Registered</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" className="h-10 rounded-xl bg-card pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={tab === "registered" ? "You haven't registered for anything" : tab === "past" ? "No past events" : "No upcoming events"}
          description={staff ? "Create an event to get students involved." : "Check back soon — new events are announced here."}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e, i) => {
            const dt = eventDateTime(e.event_date, e.start_time);
            const past = dt < new Date();
            const full = !!e.capacity && e.count >= e.capacity && !e.registered;
            return (
              <div key={e.id} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }} className="group flex animate-fade-up flex-col overflow-hidden rounded-2xl border bg-card shadow-card interactive-card">
                <Link to="/events/$id" params={{ id: e.id }} className="relative block">
                  <EventBanner src={e.banner_url} title={e.title} className="aspect-[16/9]" />
                  <div className="glass absolute left-3 top-3 flex flex-col items-center rounded-xl border px-3 py-1.5 text-center shadow-soft">
                    <span className="text-[10px] font-semibold uppercase text-primary">{format(dt, "MMM")}</span>
                    <span className="font-display text-xl font-bold leading-none text-foreground">{format(dt, "d")}</span>
                  </div>
                  {e.registered && <Badge variant="success" className="absolute right-3 top-3 shadow-soft"><Check className="size-3" /> Registered</Badge>}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-primary">{e.organizer}</p><BookmarkButton kind="event" id={e.id} className="-mr-2 -mt-2" /></div>
                  <Link to="/events/$id" params={{ id: e.id }}>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-foreground transition group-hover:text-primary">{e.title}</h3>
                  </Link>
                  <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Clock className="size-4" /> {format(dt, "EEE, d MMM · h:mm a")}</span>
                    <span className="inline-flex items-center gap-2"><MapPin className="size-4" /> {e.venue}</span>
                    <span className="inline-flex items-center gap-2"><Users className="size-4" /> {e.count} registered{e.capacity ? ` / ${e.capacity}` : ""}</span>
                  </div>
                  <div className="mt-auto pt-5">
                    {past ? (
                      <Button variant="secondary" className="w-full" disabled>Event ended</Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={e.registered ? "outline" : "default"}
                        disabled={toggle.isPending || full}
                        onClick={() => toggle.mutate({ eventId: e.id, registered: e.registered })}
                      >
                        {full ? "Event full" : e.registered ? "Cancel registration" : "Register"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {me && <EventDialog open={open} onOpenChange={setOpen} userId={me.userId} />}
    </>
  );
}
