import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, FileStack, FileText, LayoutGrid, Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { CountUp, Stagger, StaggerItem } from "@/components/app/motion";
import { NoticeDialog } from "@/components/app/notice-dialog";
import { NoteDialog } from "@/components/app/note-dialog";
import { AssignmentDialog } from "@/components/app/assignment-dialog";
import { EventDialog } from "@/components/app/event-dialog";
import { PaperDialog } from "@/components/app/paper-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, useMe } from "@/lib/me";
import { isStaff } from "@/lib/rules";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/manage")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!isStaff(me?.role)) throw redirect({ to: "/dashboard" });
  },
  head: () => pageHead("Faculty Dashboard", "Manage your notes, notices, assignments, events and papers."),
  component: ManagePage,
});

type Kind = "notice" | "note" | "assignment" | "event" | "paper";

function ManagePage() {
  const me = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState<Kind | null>(null);
  const uid = me?.userId ?? "";
  const { data } = useQuery({
    queryKey: ["manage-counts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const c = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
      const [notices, notes, assignments, events, papers] = await Promise.all([
        c(supabase.from("notices").select("id", { count: "exact", head: true }).eq("author_id", uid)),
        c(supabase.from("notes").select("id", { count: "exact", head: true }).eq("uploaded_by", uid)),
        c(supabase.from("assignments").select("id", { count: "exact", head: true }).eq("created_by", uid)),
        c(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", uid)),
        c(supabase.from("question_papers").select("id", { count: "exact", head: true }).eq("uploaded_by", uid)),
      ]);
      return { notices, notes, assignments, events, papers };
    },
  });

  const cards = [
    { kind: "notice" as const, label: "Notices", icon: Megaphone, to: "/notices" as const, count: data?.notices ?? 0, cta: "Publish notice" },
    { kind: "note" as const, label: "Notes", icon: FileText, to: "/notes" as const, count: data?.notes ?? 0, cta: "Upload notes" },
    { kind: "assignment" as const, label: "Assignments", icon: ClipboardList, to: "/assignments" as const, count: data?.assignments ?? 0, cta: "Add assignment" },
    { kind: "event" as const, label: "Events", icon: CalendarDays, to: "/events" as const, count: data?.events ?? 0, cta: "Create event" },
    { kind: "paper" as const, label: "Previous Year Papers", icon: FileStack, to: "/papers" as const, count: data?.papers ?? 0, cta: "Upload paper" },
  ];
  const close = (o: boolean) => { if (!o) { setOpen(null); qc.invalidateQueries({ queryKey: ["manage-counts"] }); } };

  return (
    <>
      <PageHeader icon={<LayoutGrid />} title="Faculty Dashboard" description="Everything you publish, in one place." />
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ kind, label, icon: Icon, to, count, cta }) => (
          <StaggerItem key={kind} className="flex flex-col rounded-2xl border bg-card p-6 shadow-card interactive-card">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" /></span>
              <Link to={to} className="text-sm text-primary hover:underline">Manage</Link>
            </div>
            <p className="mt-5 font-display text-4xl font-bold"><CountUp value={count} /></p>
            <p className="text-sm text-muted-foreground">{label} published by you</p>
            <Button variant="soft" className="mt-5" onClick={() => setOpen(kind)}><Plus /> {cta}</Button>
          </StaggerItem>
        ))}
      </Stagger>
      {me && (
        <>
          <NoticeDialog open={open === "notice"} onOpenChange={close} userId={uid} />
          <NoteDialog open={open === "note"} onOpenChange={close} userId={uid} />
          <AssignmentDialog open={open === "assignment"} onOpenChange={close} userId={uid} />
          <EventDialog open={open === "event"} onOpenChange={close} userId={uid} />
          <PaperDialog open={open === "paper"} onOpenChange={close} userId={uid} />
        </>
      )}
    </>
  );
}
