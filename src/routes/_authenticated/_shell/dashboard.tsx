import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarCheck, CalendarDays, CheckCircle2, ClipboardList, Download, FileStack, FileText, LayoutGrid, Megaphone, PackageSearch, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/app/stat-card";
import { FadeIn, ProgressBar, Stagger, StaggerItem } from "@/components/app/motion";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { isNew, isStaff } from "@/lib/rules";
import { noticeCategory, ROLE_LABEL } from "@/lib/constants";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => pageHead("Dashboard", "Your CampusConnect overview."),
  component: Dashboard,
});

const QUICK = [
  { to: "/notices", label: "View Notices", icon: Megaphone },
  { to: "/notes", label: "Download Notes", icon: FileText },
  { to: "/assignments", label: "View Assignments", icon: ClipboardList },
  { to: "/events", label: "Register for Events", icon: CalendarDays },
  { to: "/papers", label: "Previous Year Papers", icon: FileStack },
  { to: "/lost-found", label: "Lost & Found", icon: PackageSearch },
] as const;

type Activity = { id: string; icon: ReactNode; text: string; at: string };

function Dashboard() {
  const me = useMe();
  const uid = me?.userId;
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
      const [notices, notes, events, items, papers, upcomingA, done, recentNotices, upcomingEvents, dls, regs, claims] = await Promise.all([
        count(supabase.from("notices").select("id", { count: "exact", head: true })),
        count(supabase.from("notes").select("id", { count: "exact", head: true })),
        count(supabase.from("events").select("id", { count: "exact", head: true }).gte("event_date", today)),
        count(supabase.from("lost_found").select("id", { count: "exact", head: true }).in("status", ["available", "claim_requested"])),
        count(supabase.from("question_papers").select("id", { count: "exact", head: true })),
        supabase.from("assignments").select("id,title,subject,due_date").gte("due_date", now).order("due_date"),
        supabase.from("assignment_completions").select("assignment_id,completed_at").eq("user_id", uid!),
        supabase.from("notices").select("id,title,category,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("events").select("id,title,venue,event_date").gte("event_date", today).order("event_date").limit(4),
        supabase.from("downloads").select("id,title,kind,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("event_registrations").select("id,created_at,events(title)").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
        supabase.from("claim_requests").select("id,status,created_at,reviewed_at,lost_found(item_name)").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
      ]);
      const doneSet = new Set((done.data ?? []).map((d) => d.assignment_id));
      const assignments = upcomingA.data ?? [];
      const pending = assignments.filter((a) => !doneSet.has(a.id));
      const activity: Activity[] = [
        ...(dls.data ?? []).map((d) => ({ id: `d${d.id}`, icon: <Download />, text: `Downloaded ${d.kind === "note" ? "notes" : "paper"}: ${d.title}`, at: d.created_at })),
        ...(regs.data ?? []).map((r) => ({ id: `r${r.id}`, icon: <CalendarCheck />, text: `Registered for ${r.events?.title ?? "an event"}`, at: r.created_at })),
        ...(done.data ?? []).slice(0, 5).map((c) => ({ id: `c${c.assignment_id}`, icon: <CheckCircle2 />, text: `Marked an assignment as completed`, at: c.completed_at })),
        ...(claims.data ?? []).map((c) => ({ id: `k${c.id}`, icon: <PackageSearch />, text: `Claim for ${c.lost_found?.item_name ?? "item"}: ${c.status}`, at: c.reviewed_at ?? c.created_at })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
      return { notices, notes, events, items, papers, pending, totalUpcoming: assignments.length, recentNotices: recentNotices.data ?? [], upcomingEvents: upcomingEvents.data ?? [], activity };
    },
  });
  const first = me?.profile?.full_name.split(" ")[0] ?? "";
  const row = "flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/60";
  const progress = data && data.totalUpcoming ? ((data.totalUpcoming - data.pending.length) / data.totalUpcoming) * 100 : 0;

  return (
    <>
      <FadeIn className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-ink p-8 text-ink-foreground shadow-elevated dark:text-foreground">
        <motion.div aria-hidden className="absolute -right-10 -top-16 size-64 rounded-full bg-primary/40 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm opacity-70">{format(new Date(), "EEEE, d MMMM")}</p>
            <h1 className="mt-1 font-display text-3xl font-bold">Hello, {first} 👋</h1>
            <p className="mt-2 opacity-75">{me ? ROLE_LABEL[me.role] : ""}{me?.profile?.branch ? ` · ${me.profile.branch}` : ""}{me?.profile?.semester ? ` · Semester ${me.profile.semester}` : ""}</p>
          </div>
          {me && isStaff(me.role) && (
            <div className="flex gap-2">
              <Link to="/manage" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:-translate-y-0.5"><LayoutGrid className="size-4" /> Faculty dashboard</Link>
              {me.role === "admin" && <Link to="/admin/analytics" className="inline-flex items-center gap-2 rounded-xl border border-ink-foreground/20 px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 dark:border-foreground/20"><BarChart3 className="size-4" /> Admin</Link>}
            </div>
          )}
        </div>
      </FadeIn>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : (
        <>
          <Stagger className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Active Notices" value={data.notices} icon={<Megaphone />} to="/notices" />
            <StatCard label="Available Notes" value={data.notes} icon={<FileText />} tone="rose" to="/notes" />
            <StatCard label="Pending Assignments" value={data.pending.length} icon={<ClipboardList />} tone="warning" to="/assignments" />
            <StatCard label="Upcoming Events" value={data.events} icon={<CalendarDays />} tone="success" to="/events" />
            <StatCard label="Lost & Found Items" value={data.items} icon={<PackageSearch />} tone="info" to="/lost-found" />
            <StatCard label="Previous Year Papers" value={data.papers} icon={<FileStack />} tone="violet" to="/papers" />
          </Stagger>

          <FadeIn delay={0.15} className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold"><Sparkles className="size-4 text-primary" /> Quick actions</h2>
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" gap={0.04}>
              {QUICK.map(({ to, label, icon: Icon }) => (
                <StaggerItem key={to}>
                  <Link to={to} className="group flex h-full flex-col items-center gap-2 rounded-xl border bg-background/60 p-4 text-center text-sm font-medium transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-card">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="size-5" /></span>
                    {label}
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </FadeIn>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Panel title="Pending assignments" to="/assignments" delay={0.2}>
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Completed</span><span>{Math.round(progress)}%</span></div>
                <ProgressBar value={progress} />
              </div>
              {data.pending.length ? data.pending.slice(0, 5).map((a) => (
                <Link key={a.id} to="/assignments" className={row}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{a.title}</span><span className="text-xs text-muted-foreground">{a.subject}</span></span>
                  <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(a.due_date), "d MMM")}</span>
                </Link>
              )) : <Empty t="You're all caught up 🎉" />}
            </Panel>
            <Panel title="Recent notices" to="/notices" delay={0.25}>
              {data.recentNotices.length ? data.recentNotices.map((n) => (
                <Link key={n.id} to="/notices/$id" params={{ id: n.id }} className={row}>
                  <span className="truncate text-sm font-medium">{n.title}</span>
                  <span className="flex shrink-0 gap-1">{isNew(n.created_at) && <Badge variant="new">New</Badge>}<Badge variant={noticeCategory(n.category).tone}>{noticeCategory(n.category).label}</Badge></span>
                </Link>
              )) : <Empty t="No notices yet" />}
            </Panel>
            <Panel title="Recent activity" delay={0.3}>
              {data.activity.length ? (
                <ol className="relative space-y-3 border-l pl-4">
                  {data.activity.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[25px] top-0.5 flex size-4 items-center justify-center rounded-full bg-primary-soft text-primary ring-4 ring-card [&_svg]:size-2.5">{a.icon}</span>
                      <p className="text-sm leading-snug">{a.text}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</p>
                    </li>
                  ))}
                </ol>
              ) : <Empty t="Your downloads, registrations and claims will show here." />}
            </Panel>
          </div>
          <div className="mt-5">
            <Panel title="Upcoming events" to="/events" delay={0.35}>
              {data.upcomingEvents.length ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {data.upcomingEvents.map((e) => (
                    <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="flex items-center gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-card">
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-primary-soft py-1 text-primary"><span className="text-[10px] font-semibold uppercase">{format(new Date(e.event_date), "MMM")}</span><span className="font-display text-lg font-bold leading-none">{format(new Date(e.event_date), "d")}</span></span>
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{e.title}</span><span className="block truncate text-xs text-muted-foreground">{e.venue}</span></span>
                    </Link>
                  ))}
                </div>
              ) : <Empty t="No upcoming events" />}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

function Panel({ title, to, children, delay = 0 }: { title: string; to?: "/notices" | "/assignments" | "/events"; children: ReactNode; delay?: number }) {
  return (
    <FadeIn delay={delay} className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display font-semibold">{title}</h2>
        {to && <Link to={to} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="size-3.5" /></Link>}
      </div>
      {children}
    </FadeIn>
  );
}
const Empty = ({ t }: { t: string }) => <p className="py-6 text-center text-sm text-muted-foreground">{t}</p>;
