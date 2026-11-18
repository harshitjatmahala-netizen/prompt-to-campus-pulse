import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Check, Clock, MapPin, Megaphone, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { EventDialog } from "@/components/app/event-dialog";
import { EventBanner } from "@/components/app/event-banner";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { UserAvatar } from "@/components/app/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { canManage, isStaff } from "@/lib/rules";
import { eventDateTime, useEventsData, useToggleRegistration } from "@/lib/events";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/events/$id")({
  head: () => pageHead("Event details", "Event details and registration on CampusConnect."),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const { data = [], isLoading } = useEventsData(me?.userId);
  const toggle = useToggleRegistration(me?.userId);
  const e = data.find((x) => x.id === id);
  const manage = !!e && canManage(me?.role, me?.userId, e.created_by);

  const { data: registrants = [] } = useQuery({
    queryKey: ["event-registrants", id],
    enabled: isStaff(me?.role),
    queryFn: async () => {
      const { data: regs } = await supabase.from("event_registrations").select("user_id,created_at").eq("event_id", id).order("created_at");
      const ids = (regs ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url,roll_number,branch,semester").in("id", ids);
      return profs ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/events" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-40 rounded-2xl" /></div>;
  if (!e) return <EmptyState icon={<CalendarDays />} title="Event not found" description="It may have been removed." />;

  const dt = eventDateTime(e.event_date, e.start_time);
  const past = dt < new Date();
  const full = !!e.capacity && e.count >= e.capacity && !e.registered;

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2"><Link to="/events"><ArrowLeft /> All events</Link></Button>
      <div className="animate-fade-up overflow-hidden rounded-3xl border bg-card shadow-card">
        <EventBanner src={e.banner_url} title={e.title} className="aspect-[21/8]" />
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="soft"><Megaphone className="size-3" /> {e.organizer}</Badge>
              {e.registered && <Badge variant="success"><Check className="size-3" /> You're registered</Badge>}
              {past && <Badge variant="muted">Ended</Badge>}
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{e.title}</h1>
            <div className="mt-6 whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{e.description}</div>
          </div>
          <aside className="h-fit space-y-4 rounded-2xl border bg-muted/40 p-5">
            {[
              { icon: CalendarDays, label: "Date", value: format(dt, "EEEE, d MMMM yyyy") },
              { icon: Clock, label: "Time", value: format(dt, "h:mm a") },
              { icon: MapPin, label: "Venue", value: e.venue },
              { icon: Users, label: "Registrations", value: `${e.count}${e.capacity ? ` of ${e.capacity}` : ""}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-card text-primary shadow-soft"><Icon className="size-4" /></span>
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground">{value}</p></div>
              </div>
            ))}
            {!past && (
              <Button className="w-full" size="lg" variant={e.registered ? "outline" : "hero"} disabled={toggle.isPending || full} onClick={() => toggle.mutate({ eventId: e.id, registered: e.registered })}>
                {full ? "Event full" : e.registered ? "Cancel registration" : "Register now"}
              </Button>
            )}
            {manage && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
                <ConfirmDelete title="Delete this event?" description="Registrations will also be removed." onConfirm={() => remove.mutate()} trigger={<Button variant="outline" className="text-destructive"><Trash2 /> Delete</Button>} />
              </div>
            )}
          </aside>
        </div>
      </div>

      {isStaff(me?.role) && (
        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground">Registered students ({registrants.length})</h2>
          {registrants.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {registrants.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <UserAvatar src={r.avatar_url} name={r.full_name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{[r.roll_number, r.branch, r.semester && `Sem ${r.semester}`].filter(Boolean).join(" · ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {me && <EventDialog open={editing} onOpenChange={setEditing} event={e} userId={me.userId} />}
    </div>
  );
}
