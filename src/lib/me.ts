import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { AppRole } from "./constants";

export type Profile = Tables<"profiles">;
export type Me = { userId: string; email: string; profile: Profile | null; role: AppRole };

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    const list = (roles ?? []).map((r) => r.role);
    const role: AppRole = list.includes("admin") ? "admin" : list.includes("faculty") ? "faculty" : "student";
    return { userId: user.id, email: user.email ?? "", profile: profile ?? null, role };
  },
  staleTime: 60_000,
});

export function useMe() {
  const { data } = useQuery(meQuery);
  return data ?? null;
}

export const allowedDomainsQuery = queryOptions({
  queryKey: ["allowed-domains"],
  queryFn: async () => {
    const { data } = await supabase.from("allowed_domains").select("domain");
    return (data ?? []).map((d) => d.domain);
  },
  staleTime: 10 * 60_000,
});
