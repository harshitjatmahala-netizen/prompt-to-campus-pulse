import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Bell, CalendarDays, CheckCheck, ClipboardList, FileText, Megaphone, PackageSearch, AlarmClock } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  notice: Megaphone,
  note: FileText,
  assignment: ClipboardList,
  deadline: AlarmClock,
  event: CalendarDays,
  claim: PackageSearch,
};

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { data = [] } = useNotifications(userId);
  const unread = data.filter((n) => !n.read).length;

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as { title: string; body: string | null };
          toast(n.title, { description: n.body ?? undefined });
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const markAll = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  async function open(n: (typeof data)[number]) {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    }
    if (n.link) router.history.push(n.link);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-display font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
          </div>
          <Button variant="ghost" size="sm" disabled={!unread} onClick={() => markAll.mutate()}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[400px]">
          {data.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Bell className="size-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">New notices, notes and events will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {data.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/60", !n.read && "bg-primary-soft/40")}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-soft ring-1 ring-border">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </span>
                      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
