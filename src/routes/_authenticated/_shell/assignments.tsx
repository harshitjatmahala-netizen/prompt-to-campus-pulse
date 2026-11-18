import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlarmClock, CheckCircle2, Circle, ClipboardList, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { AssignmentDialog } from "@/components/app/assignment-dialog";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { assignmentState, canManage, daysRemaining, isStaff, type AssignmentState } from "@/lib/rules";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/_shell/assignments")({
  head: () => pageHead("Assignments", "Track deadlines and mark your assignments complete."),
  component: AssignmentsPage,
});

const STATE_UI: Record<AssignmentState, { label: string; tone: "success" | "danger" | "warning" | "soft" }> = {
  completed: { label: "Completed", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  "due-soon": { label: "Due soon", tone: "warning" },
  pending: { label: "Pending", tone: "soft" },
};

function remainingLabel(due: Date) {
  const d = daysRemaining(due);
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

function AssignmentsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const staff = isStaff(me?.role);
  const [tab, setTab] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; a: Tables<"assignments"> | null }>({ open: false, a: null });

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", me?.userId],
    enabled: !!me,
    queryFn: async () => {
      const [a, c] = await Promise.all([
        supabase.from("assignments").select("*").order("due_date", { ascending: true }),
        supabase.from("assignment_completions").select("assignment_id,user_id"),
      ]);
      if (a.error) throw a.error;
      return { assignments: a.data, completions: c.data ?? [] };
    },
  });

  const rows = useMemo(() => {
    if (!data || !me) return [];
    const p = me.profile;
    return data.assignments
      .filter((a) => staff || ((!a.branch || !p?.branch || a.branch === p.branch) && (!a.semester || !p?.semester || a.semester === p.semester)))
      .map((a) => {
        const done = data.completions.some((c) => c.assignment_id === a.id && c.user_id === me.userId);
        const completedCount = data.completions.filter((c) => c.assignment_id === a.id).length;
        return { a, done, completedCount, state: assignmentState(new Date(a.due_date), done) };
      });
  }, [data, me, staff]);

  const visible = rows.filter((r) =>
    tab === "all" ? true : tab === "pending" ? r.state === "pending" || r.state === "due-soon" : r.state === tab,
  );
  const completed = rows.filter((r) => r.done).length;
  const pct = rows.length ? Math.round((completed / rows.length) * 100) : 0;

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      if (!me) return;
      const { error } = done
        ? await supabase.from("assignment_completions").delete().eq("assignment_id", id).eq("user_id", me.userId)
        : await supabase.from("assignment_completions").insert({ assignment_id: id, user_id: me.userId });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.done ? "Marked as pending" : "Nice work — marked complete");
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment deleted");
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        icon={<ClipboardList />}
        title="Assignments"
        description={staff ? "Create assignments and see how many students have finished." : "Every deadline in one place. Tick them off as you go."}
        actions={staff && <Button variant="hero" onClick={() => setDialog({ open: true, a: null })}><Plus /> New assignment</Button>}
      />

      {!staff && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gradient-ink p-5 text-ink-foreground shadow-card sm:col-span-1 dark:text-foreground">
            <p className="text-sm opacity-70">Your progress</p>
            <p className="mt-1 font-display text-4xl font-bold">{pct}%</p>
            <Progress value={pct} className="mt-3 h-2 bg-white/15 [&>div]:bg-primary-glow" />
            <p className="mt-2 text-xs opacity-70">{completed} of {rows.length} completed</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Due in next 48h</p>
            <p className="mt-1 font-display text-4xl font-bold text-warning">{rows.filter((r) => r.state === "due-soon").length}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="mt-1 font-display text-4xl font-bold text-destructive">{rows.filter((r) => r.state === "overdue").length}</p>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList className="rounded-xl">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          {!staff && <TabsTrigger value="completed">Completed</TabsTrigger>}
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={rows.length ? "Nothing here" : "No assignments yet"}
          description={rows.length ? "No assignments in this view." : staff ? "Create the first assignment for your class." : "You're all clear — new assignments will show up here."}
        />
      ) : (
        <div className="grid gap-3">
          {visible.map(({ a, done, state, completedCount }, i) => {
            const due = new Date(a.due_date);
            const ui = STATE_UI[staff && state === "completed" ? "pending" : state];
            return (
              <div
                key={a.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={cn(
                  "group flex animate-fade-up items-start gap-4 rounded-2xl border bg-card p-5 shadow-card transition",
                  state === "overdue" && !staff && "border-destructive/40 bg-destructive-soft/30",
                  done && "opacity-75",
                )}
              >
                {!staff && (
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: a.id, done })}
                    aria-label={done ? "Mark as not completed" : "Mark as completed"}
                    className="mt-0.5 text-muted-foreground transition hover:scale-110 hover:text-success"
                  >
                    {done ? <CheckCircle2 className="size-6 text-success" /> : <Circle className="size-6" />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-primary">{a.subject}</span>
                    <Badge variant={ui.tone}>{ui.label}</Badge>
                    {a.branch && <Badge variant="muted">{a.branch}</Badge>}
                    {a.semester && <Badge variant="muted">Sem {a.semester}</Badge>}
                  </div>
                  <h3 className={cn("mt-1.5 font-display text-base font-semibold text-foreground", done && "line-through decoration-muted-foreground/50")}>{a.title}</h3>
                  {a.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><AlarmClock className="size-3.5" /> {format(due, "EEE, d MMM · h:mm a")}</span>
                    {!done && <span className={cn("font-medium", state === "overdue" ? "text-destructive" : state === "due-soon" ? "text-warning" : "text-foreground")}>{remainingLabel(due)}</span>}
                    {staff && <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {completedCount} completed</span>}
                    <span>By {a.created_by_name ?? "Faculty"}</span>
                  </div>
                </div>
                {canManage(me?.role, me?.userId, a.created_by) && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setDialog({ open: true, a })}><Pencil /></Button>
                    <ConfirmDelete title="Delete this assignment?" onConfirm={() => remove.mutate(a.id)} trigger={<Button variant="ghost" size="icon" aria-label="Delete"><Trash2 className="text-destructive" /></Button>} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {me && <AssignmentDialog open={dialog.open} assignment={dialog.a} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} userId={me.userId} />}
    </>
  );
}
