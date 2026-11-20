import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, ClipboardList, FileStack, FileText, GraduationCap, Inbox, Megaphone, PackageSearch, Users } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { FadeIn, Stagger } from "@/components/app/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/admin/analytics")({
  head: () => pageHead("Admin Dashboard", "CampusConnect analytics for administrators."),
  component: AnalyticsPage,
});

function monthly(rows: { created_at: string }[]) {
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
  return months.map((m) => ({ month: format(m, "MMM"), total: rows.filter((r) => format(new Date(r.created_at), "yyyy-MM") === format(m, "yyyy-MM")).length }));
}

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
      const since = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const [roles, profiles, notes, notices, assignments, events, papers, items, pending, notesRows, papersRows, regs, evs] = await Promise.all([
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("profiles").select("id,branch"),
        count(supabase.from("notes").select("id", { count: "exact", head: true })),
        count(supabase.from("notices").select("id", { count: "exact", head: true })),
        count(supabase.from("assignments").select("id", { count: "exact", head: true })),
        count(supabase.from("events").select("id", { count: "exact", head: true })),
        count(supabase.from("question_papers").select("id", { count: "exact", head: true })),
        count(supabase.from("lost_found").select("id", { count: "exact", head: true })),
        count(supabase.from("claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending")),
        supabase.from("notes").select("created_at").gte("created_at", since),
        supabase.from("question_papers").select("created_at").gte("created_at", since),
        supabase.rpc("event_registration_counts"),
        supabase.from("events").select("id,title").order("event_date", { ascending: false }).limit(30),
      ]);
      const r = roles.data ?? [];
      const studentIds = new Set(r.filter((x) => x.role === "student").map((x) => x.user_id));
      const faculty = new Set(r.filter((x) => x.role === "faculty").map((x) => x.user_id)).size;
      const byBranch = new Map<string, number>();
      (profiles.data ?? []).filter((p) => studentIds.has(p.id)).forEach((p) => byBranch.set(p.branch ?? "Not set", (byBranch.get(p.branch ?? "Not set") ?? 0) + 1));
      const titles = new Map((evs.data ?? []).map((e) => [e.id, e.title]));
      const registrations = (regs.data ?? []).filter((x) => titles.has(x.event_id)).map((x) => ({ name: titles.get(x.event_id)!.slice(0, 18), total: Number(x.total) })).sort((a, b) => b.total - a.total).slice(0, 8);
      return {
        students: studentIds.size, faculty, notes, notices, assignments, events, papers, items, pending,
        branches: [...byBranch].map(([name, total]) => ({ name: name.replace("Electronics & Communication", "ECE"), total })).sort((a, b) => b.total - a.total),
        registrations, notesMonthly: monthly(notesRows.data ?? []), papersMonthly: monthly(papersRows.data ?? []),
      };
    },
  });

  return (
    <>
      <PageHeader icon={<BarChart3 />} title="Admin Dashboard" description="How your campus is using CampusConnect." />
      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : (
        <>
          <Stagger className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Students" value={data.students} icon={<GraduationCap />} to="/admin/users" />
            <StatCard label="Total Faculty" value={data.faculty} icon={<Users />} tone="violet" to="/admin/users" />
            <StatCard label="Total Notes" value={data.notes} icon={<FileText />} tone="rose" />
            <StatCard label="Total Notices" value={data.notices} icon={<Megaphone />} />
            <StatCard label="Total Assignments" value={data.assignments} icon={<ClipboardList />} tone="warning" />
            <StatCard label="Total Events" value={data.events} icon={<CalendarDays />} tone="success" />
            <StatCard label="Previous Year Papers" value={data.papers} icon={<FileStack />} tone="violet" />
            <StatCard label="Lost Items" value={data.items} icon={<PackageSearch />} tone="info" />
            <StatCard label="Pending Claims" value={data.pending} icon={<Inbox />} tone="rose" to="/admin/claims" />
          </Stagger>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Students by branch" delay={0.1}>
              <BarChart data={data.branches} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="total" name="Students" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
            <ChartCard title="Event registrations" delay={0.15}>
              <BarChart data={data.registrations} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="total" name="Registrations" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartCard>
            <ChartCard title="Notes uploaded (last 6 months)" delay={0.2}><Trend data={data.notesMonthly} color="var(--chart-5)" id="n" /></ChartCard>
            <ChartCard title="Previous papers uploaded (last 6 months)" delay={0.25}><Trend data={data.papersMonthly} color="var(--chart-4)" id="p" /></ChartCard>
          </div>
        </>
      )}
    </>
  );
}

const tooltip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 };

function Trend({ data, color, id }: { data: { month: string; total: number }[]; color: string; id: string }) {
  return (
    <AreaChart data={data} margin={{ left: -20 }}>
      <defs><linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.4} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
      <Tooltip contentStyle={tooltip} />
      <Area type="monotone" dataKey="total" name="Uploads" stroke={color} strokeWidth={2.5} fill={`url(#g-${id})`} />
    </AreaChart>
  );
}

function ChartCard({ title, children, delay }: { title: string; children: ReactNode; delay: number }) {
  return (
    <FadeIn delay={delay} className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 font-display font-semibold">{title}</h2>
      <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer></div>
    </FadeIn>
  );
}
