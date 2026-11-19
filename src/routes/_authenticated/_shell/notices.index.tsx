import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Megaphone, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NoticeDialog } from "@/components/app/notice-dialog";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { BookmarkButton } from "@/components/app/bookmark-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { canManage, isNew, isStaff } from "@/lib/rules";
import { NOTICE_CATEGORIES, noticeCategory } from "@/lib/constants";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/_shell/notices/")({
  head: () => pageHead("Digital Notice Board", "Official notices from faculty and the college office."),
  component: NoticesPage,
});

function useNotices() {
  return useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function NoticesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data = [], isLoading } = useNotices();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [dialog, setDialog] = useState<{ open: boolean; notice: Tables<"notices"> | null }>({ open: false, notice: null });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter(
      (n) =>
        (cat === "all" || n.category === cat) &&
        (!s || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s)),
    );
  }, [data, q, cat]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice deleted");
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async (n: Tables<"notices">) => {
      const { error } = await supabase.from("notices").update({ pinned: !n.pinned }).eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notices"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const staff = isStaff(me?.role);

  return (
    <>
      <PageHeader
        icon={<Megaphone />}
        title="Digital Notice Board"
        description="Official announcements from faculty and the college office."
        actions={
          staff && (
            <Button variant="hero" onClick={() => setDialog({ open: true, notice: null })}>
              <Plus /> New notice
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notices" className="h-10 rounded-xl bg-card pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "all", label: "All" }, ...NOTICE_CATEGORIES].map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCat(c.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                cat === c.value ? "border-primary bg-primary text-primary-foreground shadow-glow" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title={data.length ? "No notices match your search" : "No notices yet"}
          description={data.length ? "Try a different keyword or category." : staff ? "Publish the first notice for your students." : "Official notices will appear here once they're published."}
          action={staff && !data.length ? <Button onClick={() => setDialog({ open: true, notice: null })}><Plus /> New notice</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((n, i) => {
            const c = noticeCategory(n.category);
            const manage = canManage(me?.role, me?.userId, n.author_id);
            return (
              <article
                key={n.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={cn(
                  "group relative animate-fade-up rounded-2xl border bg-card p-5 shadow-card interactive-card",
                  n.pinned && "border-primary/40 ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="hidden flex-col items-center rounded-xl bg-muted px-3 py-2 text-center sm:flex">
                    <span className="text-[11px] font-medium uppercase text-muted-foreground">{format(new Date(n.created_at), "MMM")}</span>
                    <span className="font-display text-xl font-bold text-foreground">{format(new Date(n.created_at), "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.pinned && <Badge variant="soft"><Pin className="size-3" /> Pinned</Badge>}
                      <Badge variant={c.tone}>{c.label}</Badge>
                      {isNew(n.created_at) && <Badge variant="new">New</Badge>}
                    </div>
                    <Link to="/notices/$id" params={{ id: n.id }} className="mt-2 block">
                      <h3 className="font-display text-lg font-semibold text-foreground transition group-hover:text-primary">{n.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.content}</p>
                    </Link>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {n.author_name ?? "College Office"} · {format(new Date(n.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <BookmarkButton kind="notice" id={n.id} className="shrink-0" />
                  {manage && (
                    <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <Button variant="ghost" size="icon" aria-label={n.pinned ? "Unpin" : "Pin"} onClick={() => togglePin.mutate(n)}>
                        <Pin className={cn(n.pinned && "fill-current text-primary")} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setDialog({ open: true, notice: n })}>
                        <Pencil />
                      </Button>
                      <ConfirmDelete
                        title="Delete this notice?"
                        onConfirm={() => remove.mutate(n.id)}
                        trigger={<Button variant="ghost" size="icon" aria-label="Delete"><Trash2 className="text-destructive" /></Button>}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {me && <NoticeDialog open={dialog.open} notice={dialog.notice} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} userId={me.userId} />}
    </>
  );
}
