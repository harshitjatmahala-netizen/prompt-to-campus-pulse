import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, Bell, CalendarDays, CheckCheck, ClipboardList, FileStack, FileText, Megaphone, PackageSearch, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { AnimatedTabs } from "@/components/app/animated-tabs";
import { useNotifications } from "@/components/app/notification-bell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { categoryOf, NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/notifications")({
  head: () => pageHead("Notifications", "All your CampusConnect notifications, by category."),
  component: NotificationsPage,
});

const ICONS: Record<string, typeof Bell> = { notice: Megaphone, note: FileText, assignment: ClipboardList, deadline: AlarmClock, event: CalendarDays, claim: PackageSearch, paper: FileStack };

function NotificationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const { data = [], isLoading } = useNotifications(me?.userId ?? "");
  const key = ["notifications", me?.userId];
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const markAll = useMutation({
    mutationFn: async () => { await supabase.from("notifications").update({ read: true }).eq("user_id", me!.userId).eq("read", false); },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").delete().eq("id", id); },
    onSuccess: refresh,
  });

  const tabs = [
    { value: "all", label: "All", count: data.filter((n) => !n.read).length },
    ...NOTIFICATION_CATEGORIES.map((c) => ({ value: c.value, label: c.label, count: data.filter((n) => !n.read && categoryOf(n.type) === c.value).length })),
  ];
  const shown = data.filter((n) => tab === "all" || categoryOf(n.type) === tab);

  async function open(n: (typeof data)[number]) {
    if (!n.read) { await supabase.from("notifications").update({ read: true }).eq("id", n.id); refresh(); }
    if (n.link) router.history.push(n.link);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={<Bell />} title="Notifications" description="Notices, notes, deadlines, events and Lost & Found updates." actions={<Button variant="outline" disabled={!tabs[0]!.count} onClick={() => markAll.mutate()}><CheckCheck /> Mark all read</Button>} />
      <AnimatedTabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {isLoading ? (
        <div className="grid gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={<Bell />} title="You're all caught up" description="New updates in this category will appear here." />
      ) : (
        <motion.ul key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="grid gap-2">
          <AnimatePresence mode="popLayout">
            {shown.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <motion.li key={n.id} layout exit={{ opacity: 0, x: 30 }} className={cn("group flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-card transition hover:shadow-elevated", !n.read && "border-primary/30 bg-primary-soft/30")}>
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" /></span>
                  <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <span className="block font-medium text-foreground">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </button>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                  <Button variant="ghost" size="icon" className="size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete notification" onClick={() => remove.mutate(n.id)}><Trash2 /></Button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
