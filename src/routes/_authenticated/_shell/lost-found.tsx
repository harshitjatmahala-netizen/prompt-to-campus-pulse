import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Archive, Box, CalendarDays, CheckCircle2, Inbox, MapPin, PackageCheck, PackageSearch, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { ItemDialog } from "@/components/app/item-dialog";
import { ClaimDialog } from "@/components/app/claim-dialog";
import { MediaImage } from "@/components/app/media-image";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { canPublishLostFound, canRequestClaim } from "@/lib/rules";
import { ITEM_CATEGORIES, ITEM_STATUSES, itemStatus, type ItemStatus } from "@/lib/constants";
import { pageHead } from "@/lib/seo";
import type { Tables } from "@/integrations/supabase/types";

type LFSearch = { q?: string | undefined };

export const Route = createFileRoute("/_authenticated/_shell/lost-found")({
  validateSearch: (s: Record<string, unknown>): LFSearch => ({ q: typeof s["q"] === "string" ? s["q"] : undefined }),
  head: () => pageHead("Lost & Found", "Find items handed in to the College Office and request a claim."),
  component: LostFoundPage,
});

const STEPS = [
  { icon: Box, text: "Found items are handed to the College Office" },
  { icon: PackageSearch, text: "Admin publishes them here" },
  { icon: Inbox, text: "Recognise yours? Request a claim" },
  { icon: PackageCheck, text: "Once approved, collect it from the office" },
];

function LostFoundPage() {
  const me = useMe();
  const qc = useQueryClient();
  const admin = canPublishLostFound(me?.role);
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState(admin ? "all" : "open");
  const [dialog, setDialog] = useState<{ open: boolean; item: Tables<"lost_found"> | null }>({ open: false, item: null });
  const [claimItem, setClaimItem] = useState<Tables<"lost_found"> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lost-found", me?.userId],
    enabled: !!me,
    queryFn: async () => {
      const [items, claims] = await Promise.all([
        supabase.from("lost_found").select("*").order("created_at", { ascending: false }),
        supabase.from("claim_requests").select("item_id,status,user_id"),
      ]);
      if (items.error) throw items.error;
      return { items: items.data, claims: claims.data ?? [] };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (status === "open" && !["available", "claim_requested", "approved"].includes(i.status)) return false;
      if (status !== "all" && status !== "open" && i.status !== status) return false;
      if (!admin && i.status === "archived") return false;
      return !s || [i.item_name, i.description ?? "", i.location_found, i.category].some((v) => v.toLowerCase().includes(s));
    });
  }, [data, q, category, status, admin]);

  const setItemStatus = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: ItemStatus }) => {
      const { error } = await supabase.from("lost_found").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Marked as ${itemStatus(v.s).label}`);
      qc.invalidateQueries({ queryKey: ["lost-found"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lost_found").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["lost-found"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myClaim = (itemId: string) => data?.claims.find((c) => c.item_id === itemId && c.user_id === me?.userId);
  const pendingCount = (itemId: string) => data?.claims.filter((c) => c.item_id === itemId && c.status === "pending").length ?? 0;

  return (
    <>
      <PageHeader
        icon={<PackageSearch />}
        title="Lost & Found"
        description="Items handed in to the College Office. Lost something? Search here first."
        actions={
          admin && (
            <>
              <Button variant="outline" asChild><Link to="/admin/claims"><Inbox /> Claim requests</Link></Button>
              <Button variant="hero" onClick={() => setDialog({ open: true, item: null })}><Plus /> Publish item</Button>
            </>
          )
        }
      />

      {!admin && (
        <ol className="mb-8 grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-4">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center gap-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
              </span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items, places, colours…" className="h-10 rounded-xl bg-card pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open items</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {ITEM_STATUSES.filter((s) => admin || s.value !== "archived").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title={data?.items.length ? "No items match your search" : "Nothing in Lost & Found right now"}
          description={admin ? "Publish items handed in to the College Office." : "Items handed in to the College Office will appear here."}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((i, idx) => {
            const st = itemStatus(i.status);
            const claim = myClaim(i.id);
            const pending = pendingCount(i.id);
            return (
              <div key={i.id} style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }} className="group flex animate-fade-up flex-col overflow-hidden rounded-2xl border bg-card shadow-card interactive-card">
                <div className="relative aspect-[4/3] bg-muted">
                  <MediaImage
                    src={i.image_url}
                    alt={i.item_name}
                    className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105"
                    fallback={<div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-soft to-muted"><PackageSearch className="size-12 text-primary/40" /></div>}
                  />
                  <Badge variant={st.tone} className="absolute left-3 top-3 shadow-soft">{st.label}</Badge>
                  {admin && pending > 0 && <Badge variant="warning" className="absolute right-3 top-3 shadow-soft">{pending} pending claim{pending > 1 ? "s" : ""}</Badge>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{i.category}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">{i.item_name}</h3>
                  {i.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.description}</p>}
                  <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><MapPin className="size-4" /> {i.location_found}</span>
                    <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> Found {format(new Date(i.date_found), "d MMM yyyy")}</span>
                    <span className="inline-flex items-center gap-2"><Archive className="size-4" /> Office storage <span className="font-mono text-foreground">{i.storage_number}</span></span>
                  </div>
                  <div className="mt-auto pt-5">
                    {admin ? (
                      <div className="flex flex-wrap gap-2">
                        {i.status === "approved" && (
                          <Button size="sm" variant="success" onClick={() => setItemStatus.mutate({ id: i.id, s: "collected" })}><CheckCircle2 /> Mark collected</Button>
                        )}
                        {i.status !== "archived" && i.status !== "approved" && (
                          <Button size="sm" variant="outline" onClick={() => setItemStatus.mutate({ id: i.id, s: "archived" })}><Archive /> Archive</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDialog({ open: true, item: i })}><Pencil /> Edit</Button>
                        <ConfirmDelete title="Delete this item?" onConfirm={() => remove.mutate(i.id)} trigger={<Button size="sm" variant="ghost" className="text-destructive" aria-label="Delete"><Trash2 /></Button>} />
                      </div>
                    ) : claim ? (
                      <div className="rounded-xl border bg-muted/50 px-3 py-2.5 text-sm">
                        {claim.status === "pending" && <span className="text-warning-foreground dark:text-warning">⏳ Your claim is being verified</span>}
                        {claim.status === "approved" && <span className="font-medium text-success">✓ Approved — collect from the College Office</span>}
                        {claim.status === "rejected" && <span className="text-destructive">Your claim wasn't approved</span>}
                      </div>
                    ) : canRequestClaim(i.status) ? (
                      <Button className="w-full" onClick={() => setClaimItem(i)}>This is mine — Request claim</Button>
                    ) : (
                      <Button className="w-full" variant="secondary" disabled>{st.label}</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {me && admin && <ItemDialog open={dialog.open} item={dialog.item} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} userId={me.userId} />}
      {me && <ClaimDialog item={claimItem} me={me} onOpenChange={(o) => !o && setClaimItem(null)} />}
    </>
  );
}
