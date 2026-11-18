import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, CalendarDays, ClipboardList, FileText, Megaphone, PackageSearch } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { isNew } from "@/lib/rules";
import { itemStatus, noticeCategory, ROLE_LABEL } from "@/lib/constants";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => pageHead("Dashboard", "Your CampusConnect overview."),
  component: Dashboard,
});

function Panel({ title, icon, to, children }: { title: string; icon: ReactNode; to: "/notices" | "/notes" | "/assignments" | "/events" | "/lost-found"; children: ReactNode }) {
  return (
    <section className="animate-fade-up rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-foreground"><span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-4">{icon}</span>{title}</h2>
        <Link to={to} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="size-3.5" /></Link>
      </div>
      {children}
    </section>
  );
}
const Empty = ({ t }: { t: string }) => <p className="py-6 text-center text-sm text-muted-foreground">{t}</p>;

function Dashboard() {
  const me = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [n, a, e, nt, lf] = await Promise.all([
        supabase.from("notices").select("id,title,category,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("assignments").select("id,title,subject,due_date").gte("due_date", new Date().toISOString()).order("due_date").limit(5),
        supabase.from("events").select("id,title,venue,event_date").gte("event_date", today).order("event_date").limit(4),
        supabase.from("notes").select("id,title,subject,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("lost_found").select("id,item_name,status,location_found").neq("status", "archived").order("created_at", { ascending: false }).limit(5),
      ]);
      return { notices: n.data ?? [], assignments: a.data ?? [], events: e.data ?? [], notes: nt.data ?? [], items: lf.data ?? [] };
    },
  });
  const first = me?.profile?.full_name.split(" ")[0] ?? "";
  const row = "flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-muted/60";

  return (
    <>
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-ink p-8 text-ink-foreground shadow-elevated dark:text-foreground">
        <p className="text-sm opacity-70">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Hello, {first} 👋</h1>
        <p className="mt-2 opacity-75">{me ? ROLE_LABEL[me.role] : ""} · {me?.profile?.branch ?? ""} {me?.profile?.semester ? `· Semester ${me.profile.semester}` : ""}</p>
      </div>
      {isLoading || !data ? (
        <div className="grid gap-5 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Recent Notices" icon={<Megaphone />} to="/notices">
            {data.notices.length ? data.notices.map((n) => (
              <Link key={n.id} to="/notices/$id" params={{ id: n.id }} className={row}>
                <span className="truncate text-sm font-medium">{n.title}</span>
                <span className="flex shrink-0 gap-1">{isNew(n.created_at) && <Badge variant="new">New</Badge>}<Badge variant={noticeCategory(n.category).tone}>{noticeCategory(n.category).label}</Badge></span>
              </Link>
            )) : <Empty t="No notices yet" />}
          </Panel>
          <Panel title="Upcoming Assignments" icon={<ClipboardList />} to="/assignments">
            {data.assignments.length ? data.assignments.map((a) => (
              <Link key={a.id} to="/assignments" className={row}>
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{a.title}</span><span className="text-xs text-muted-foreground">{a.subject}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(a.due_date), "d MMM, h:mm a")}</span>
              </Link>
            )) : <Empty t="No upcoming deadlines" />}
          </Panel>
          <Panel title="Upcoming Events" icon={<CalendarDays />} to="/events">
            {data.events.length ? data.events.map((e) => (
              <Link key={e.id} to="/events/$id" params={{ id: e.id }} className={row}>
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{e.title}</span><span className="text-xs text-muted-foreground">{e.venue}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(e.event_date), "d MMM")}</span>
              </Link>
            )) : <Empty t="No upcoming events" />}
          </Panel>
          <Panel title="Latest Notes" icon={<FileText />} to="/notes">
            {data.notes.length ? data.notes.map((n) => (
              <Link key={n.id} to="/notes" search={{ q: n.title }} className={row}>
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{n.title}</span><span className="text-xs text-muted-foreground">{n.subject}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(n.created_at), "d MMM")}</span>
              </Link>
            )) : <Empty t="No notes yet" />}
          </Panel>
          <div className="lg:col-span-2">
            <Panel title="Lost & Found Updates" icon={<PackageSearch />} to="/lost-found">
              {data.items.length ? data.items.map((i) => (
                <Link key={i.id} to="/lost-found" search={{ q: i.item_name }} className={row}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{i.item_name}</span><span className="text-xs text-muted-foreground">{i.location_found}</span></span>
                  <Badge variant={itemStatus(i.status).tone}>{itemStatus(i.status).label}</Badge>
                </Link>
              )) : <Empty t="Nothing reported" />}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
