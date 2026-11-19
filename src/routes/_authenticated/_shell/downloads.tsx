import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, FileStack, FileText, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Stagger, StaggerItem } from "@/components/app/motion";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/downloads")({
  head: () => pageHead("Download History", "Notes and previous year papers you downloaded."),
  component: DownloadsPage,
});

function DownloadsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["downloads", me?.userId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("downloads").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("downloads").delete().eq("user_id", me!.userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("History cleared"); qc.invalidateQueries({ queryKey: ["downloads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        icon={<History />}
        title="Download History"
        description="Notes and question papers you've downloaded."
        actions={data.length > 0 && <ConfirmDelete title="Clear download history?" description="Your files stay available — only this list is cleared." onConfirm={() => clear.mutate()} trigger={<Button variant="outline"><Trash2 /> Clear history</Button>} />}
      />
      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={<Download />} title="No downloads yet" description="Notes and papers you download will be listed here with the date." />
      ) : (
        <Stagger className="overflow-hidden rounded-2xl border bg-card shadow-card">
          {data.map((d) => {
            const Icon = d.kind === "note" ? FileText : FileStack;
            const inner = (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{d.title}</span>
                <Badge variant="muted" className="hidden sm:inline-flex">{d.kind === "note" ? "Notes" : "Paper"}</Badge>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(d.created_at), "d MMM yyyy, h:mm a")}</span>
              </>
            );
            const cls = "flex items-center gap-3 border-b px-4 py-3 transition last:border-0 hover:bg-muted/50";
            return (
              <StaggerItem key={d.id}>
                {d.kind === "note"
                  ? <Link to="/notes" search={{ q: d.title }} className={cls}>{inner}</Link>
                  : <Link to="/papers" search={{ q: d.title.split(" · ")[0] }} className={cls}>{inner}</Link>}
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
