import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Megaphone, Pencil, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { NoticeDialog } from "@/components/app/notice-dialog";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { canManage, isNew } from "@/lib/rules";
import { noticeCategory } from "@/lib/constants";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/notices/$id")({
  head: () => pageHead("Notice", "Read the full notice on CampusConnect."),
  component: NoticeDetail,
});

function NoticeDetail() {
  const { id } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const { data: n, isLoading } = useQuery({
    queryKey: ["notices", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice deleted");
      qc.invalidateQueries({ queryKey: ["notices"] });
      navigate({ to: "/notices" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link to="/notices"><ArrowLeft /> All notices</Link>
      </Button>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !n ? (
        <EmptyState icon={<Megaphone />} title="Notice not found" description="It may have been removed." />
      ) : (
        <article className="animate-fade-up rounded-3xl border bg-card p-6 shadow-card sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            {n.pinned && <Badge variant="soft"><Pin className="size-3" /> Pinned</Badge>}
            <Badge variant={noticeCategory(n.category).tone}>{noticeCategory(n.category).label}</Badge>
            {isNew(n.created_at) && <Badge variant="new">New</Badge>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground">{n.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Published by <span className="font-medium text-foreground">{n.author_name ?? "College Office"}</span> ·{" "}
            {format(new Date(n.created_at), "EEEE, d MMMM yyyy 'at' h:mm a")}
          </p>
          <div className="my-8 h-px bg-border" />
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{n.content}</div>
          {canManage(me?.role, me?.userId, n.author_id) && (
            <div className="mt-10 flex gap-2 border-t pt-6">
              <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
              <ConfirmDelete
                title="Delete this notice?"
                onConfirm={() => remove.mutate()}
                trigger={<Button variant="outline" className="text-destructive"><Trash2 /> Delete</Button>}
              />
            </div>
          )}
        </article>
      )}
      {me && n && <NoticeDialog open={editing} onOpenChange={setEditing} notice={n} userId={me.userId} />}
    </div>
  );
}
