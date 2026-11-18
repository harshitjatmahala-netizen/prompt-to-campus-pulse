import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { UserAvatar } from "@/components/app/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { ROLE_LABEL, type AppRole } from "@/lib/constants";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/admin/users")({
  head: () => pageHead("Manage users", "Manage CampusConnect users and roles."),
  component: UsersPage,
});

function UsersPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("user_id,role")]);
      return (p.data ?? []).map((u) => {
        const roles = (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role);
        const role: AppRole = roles.includes("admin") ? "admin" : roles.includes("faculty") ? "faculty" : "student";
        return { ...u, role };
      });
    },
  });
  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", id);
      if (del.error) throw del.error;
      const ins = await supabase.from("user_roles").insert({ user_id: id, role });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader icon={<Users />} title="Manage users" description="Promote faculty and admins." />
      {isLoading ? <Skeleton className="h-60 rounded-2xl" /> : (
        <div className="divide-y rounded-2xl border bg-card shadow-card">
          {data.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <UserAvatar src={u.avatar_url} name={u.full_name} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{u.full_name}</p><p className="truncate text-xs text-muted-foreground">{u.email} {u.roll_number ? `· ${u.roll_number}` : ""}</p></div>
              <Select value={u.role} disabled={u.id === me?.userId} onValueChange={(v) => setRole.mutate({ id: u.id, role: v as AppRole })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
