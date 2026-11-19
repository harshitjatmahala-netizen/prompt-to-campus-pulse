import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, CalendarDays, FileStack, FileText, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { BookmarkButton } from "@/components/app/bookmark-button";
import { AnimatedTabs } from "@/components/app/animated-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { useBookmarks, type BookmarkKind } from "@/lib/library";
import { examLabel } from "@/lib/papers";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/saved")({
  head: () => pageHead("Saved Items", "Notices, notes, events and papers you bookmarked."),
  component: SavedPage,
});

type Row = { id: string; kind: BookmarkKind; title: string; subtitle: string; savedAt: string };
const ICON = { notice: Megaphone, note: FileText, event: CalendarDays, paper: FileStack } as const;
const TABS = [
  { value: "all", label: "All" },
  { value: "notice", label: "Notices" },
  { value: "note", label: "Notes" },
  { value: "event", label: "Events" },
  { value: "paper", label: "Papers" },
];

function SavedPage() {
  const me = useMe();
  const [tab, setTab] = useState("all");
  const { data: bookmarks = [], isLoading: loadingB } = useBookmarks(me?.userId);
  const ids = (k: BookmarkKind) => bookmarks.filter((b) => b.kind === k).map((b) => b.item_id);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["saved-items", bookmarks.map((b) => `${b.kind}:${b.item_id}`).join(",")],
    enabled: !loadingB,
    queryFn: async (): Promise<Row[]> => {
      const none = ["00000000-0000-0000-0000-000000000000"];
      const pick = (k: BookmarkKind) => (ids(k).length ? ids(k) : none);
      const [n, nt, e, p] = await Promise.all([
        supabase.from("notices").select("id,title,category").in("id", pick("notice")),
        supabase.from("notes").select("id,title,subject").in("id", pick("note")),
        supabase.from("events").select("id,title,event_date,venue").in("id", pick("event")),
        supabase.from("question_papers").select("id,subject,exam_type,academic_year").in("id", pick("paper")),
      ]);
      const map = new Map<string, Omit<Row, "savedAt">>();
      (n.data ?? []).forEach((x) => map.set(`notice:${x.id}`, { id: x.id, kind: "notice", title: x.title, subtitle: x.category }));
      (nt.data ?? []).forEach((x) => map.set(`note:${x.id}`, { id: x.id, kind: "note", title: x.title, subtitle: x.subject }));
      (e.data ?? []).forEach((x) => map.set(`event:${x.id}`, { id: x.id, kind: "event", title: x.title, subtitle: `${format(new Date(x.event_date), "d MMM yyyy")} · ${x.venue}` }));
      (p.data ?? []).forEach((x) => map.set(`paper:${x.id}`, { id: x.id, kind: "paper", title: x.subject, subtitle: `${examLabel(x.exam_type)} · ${x.academic_year}` }));
      return bookmarks.flatMap((b) => {
        const r = map.get(`${b.kind}:${b.item_id}`);
        return r ? [{ ...r, savedAt: b.created_at }] : [];
      });
    },
  });

  const shown = rows.filter((r) => tab === "all" || r.kind === tab);

  return (
    <>
      <PageHeader icon={<Bookmark />} title="Saved Items" description="Everything you bookmarked, in one place." />
      <AnimatedTabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />
      {isLoading || loadingB ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={<Bookmark />} title="Nothing saved yet" description="Tap the bookmark icon on any notice, note, event or paper to save it here." />
      ) : (
        <motion.ul layout className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {shown.map((r, i) => {
              const Icon = ICON[r.kind];
              return (
                <motion.li key={`${r.kind}-${r.id}`} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }} exit={{ opacity: 0, x: -20 }} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card interactive-card">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" /></span>
                  <ItemLink row={r} />
                  <span className="hidden text-xs text-muted-foreground sm:block">Saved {format(new Date(r.savedAt), "d MMM")}</span>
                  <BookmarkButton kind={r.kind} id={r.id} />
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </>
  );
}

function ItemLink({ row }: { row: Row }) {
  const inner = (
    <>
      <span className="block truncate font-medium text-foreground">{row.title}</span>
      <span className="block truncate text-xs capitalize text-muted-foreground">{row.subtitle}</span>
    </>
  );
  const cls = "min-w-0 flex-1";
  if (row.kind === "notice") return <Link to="/notices/$id" params={{ id: row.id }} className={cls}>{inner}</Link>;
  if (row.kind === "event") return <Link to="/events/$id" params={{ id: row.id }} className={cls}>{inner}</Link>;
  if (row.kind === "note") return <Link to="/notes" search={{ q: row.title }} className={cls}>{inner}</Link>;
  return <Link to="/papers" search={{ q: row.title }} className={cls}>{inner}</Link>;
}
