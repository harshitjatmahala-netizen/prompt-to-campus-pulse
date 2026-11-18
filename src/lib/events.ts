import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function eventDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`);
}

export function useEventsData(userId?: string) {
  return useQuery({
    queryKey: ["events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [ev, counts, mine] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: true }),
        supabase.rpc("event_registration_counts"),
        supabase.from("event_registrations").select("event_id").eq("user_id", userId!),
      ]);
      if (ev.error) throw ev.error;
      const countMap = new Map((counts.data ?? []).map((c) => [c.event_id, Number(c.total)]));
      const mineSet = new Set((mine.data ?? []).map((m) => m.event_id));
      return ev.data.map((e) => ({ ...e, registered: mineSet.has(e.id), count: countMap.get(e.id) ?? 0 }));
    },
  });
}

export function useToggleRegistration(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, registered }: { eventId: string; registered: boolean }) => {
      if (!userId) return;
      const { error } = registered
        ? await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("user_id", userId)
        : await supabase.from("event_registrations").insert({ event_id: eventId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.registered ? "Registration cancelled" : "You're registered! 🎉");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event-registrants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
