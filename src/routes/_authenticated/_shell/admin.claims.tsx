import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { ClaimStatus } from "@/lib/constants";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/admin/claims")({
  head: () => pageHead("Claim requests", "Verify Lost & Found claim requests."),
  component: ClaimsPage,
});

function ClaimsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["claims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("claim_requests").select("*, lost_found(item_name,storage_number)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClaimStatus }) => {
      const { error } = await supabase.from("claim_requests").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Claim updated"); qc.invalidateQueries({ queryKey: ["claims"] }); qc.invalidateQueries({ queryKey: ["lost-found"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const tone = { pending: "warning", approved: "success", rejected: "danger" } as const;
  return (
    <>
      <PageHeader icon={<Inbox />} title="Claim requests" description="Approve a claim, then mark the item collected once the student picks it up." />
      {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : !data.length ? <EmptyState icon={<Inbox />} title="No claim requests" /> : (
        <div className="grid gap-3">
          {data.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-semibold">{c.lost_found?.item_name} <span className="font-mono text-xs text-muted-foreground">{c.lost_found?.storage_number}</span></p>
                <Badge variant={tone[c.status]} className="capitalize">{c.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.student_name} · {c.roll_number} · {c.phone} · {format(new Date(c.created_at), "d MMM, h:mm a")}</p>
              <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">{c.reason}</p>
              {c.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="success" onClick={() => review.mutate({ id: c.id, status: "approved" })}><Check /> Approve</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => review.mutate({ id: c.id, status: "rejected" })}><X /> Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
