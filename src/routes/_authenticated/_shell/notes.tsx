import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Eye, FileText, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NoteDialog } from "@/components/app/note-dialog";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PdfPreview } from "@/components/app/pdf-preview";
import { BookmarkButton } from "@/components/app/bookmark-button";
import { downloadAndRecord, formatSize } from "@/lib/library";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { canManage, isStaff } from "@/lib/rules";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import { signedUrl } from "@/lib/storage";
import { pageHead } from "@/lib/seo";
import type { Tables } from "@/integrations/supabase/types";

type NotesSearch = { q?: string | undefined };

export const Route = createFileRoute("/_authenticated/_shell/notes")({
  validateSearch: (s: Record<string, unknown>): NotesSearch => ({ q: typeof s["q"] === "string" ? s["q"] : undefined }),
  head: () => pageHead("Notes", "Download and preview study material shared by faculty."),
  component: NotesPage,
});

function NotesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [branch, setBranch] = useState("all");
  const [semester, setSemester] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; note: Tables<"notes"> | null }>({ open: false, note: null });
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter(
      (n) =>
        (branch === "all" || n.branch === branch) &&
        (semester === "all" || String(n.semester) === semester) &&
        (!s || [n.title, n.subject, n.description ?? ""].some((v) => v.toLowerCase().includes(s))),
    );
  }, [data, q, branch, semester]);

  const remove = useMutation({
    mutationFn: async (n: Tables<"notes">) => {
      const { error } = await supabase.from("notes").delete().eq("id", n.id);
      if (error) throw error;
      await supabase.storage.from("notes").remove([n.file_path]);
    },
    onSuccess: () => {
      toast.success("Notes deleted");
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openPreview(n: Tables<"notes">) {
    setBusy(`p-${n.id}`);
    try {
      setPreview({ title: n.title, url: await signedUrl("notes", n.file_path) });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function download(n: Tables<"notes">) {
    setBusy(`d-${n.id}`);
    try {
      if (!me) return;
      await downloadAndRecord({ userId: me.userId, bucket: "notes", path: n.file_path, fileName: n.file_name, kind: "note", itemId: n.id, title: n.title });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const staff = isStaff(me?.role);

  return (
    <>
      <PageHeader
        icon={<FileText />}
        title="Notes"
        description="Study material uploaded by your faculty — preview or download any time."
        actions={staff && <Button variant="hero" onClick={() => setDialog({ open: true, note: null })}><Plus /> Upload notes</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_200px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, subject or topic" className="h-10 rounded-xl bg-card pl-9" />
        </div>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={semester} onValueChange={setSemester}>
          <SelectTrigger className="h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={data.length ? "No notes match your filters" : "No notes uploaded yet"}
          description={data.length ? "Try clearing the filters." : staff ? "Upload the first PDF for your students." : "Your faculty's study material will appear here."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n, i) => (
            <div key={n.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="group flex animate-fade-up flex-col rounded-2xl border bg-card p-5 shadow-card interactive-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-destructive-soft text-destructive">
                  <FileText className="size-5" />
                </div>
                <div className="flex gap-0.5">
                  <BookmarkButton kind="note" id={n.id} />
                {canManage(me?.role, me?.userId, n.uploaded_by) && (
                  <>
                    <Button variant="ghost" size="icon" className="size-8" aria-label="Edit" onClick={() => setDialog({ open: true, note: n })}><Pencil /></Button>
                    <ConfirmDelete title="Delete these notes?" onConfirm={() => remove.mutate(n)} trigger={<Button variant="ghost" size="icon" className="size-8" aria-label="Delete"><Trash2 className="text-destructive" /></Button>} />
                  </>
                )}
                </div>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-primary">{n.subject}</p>
              <h3 className="mt-1 font-display text-base font-semibold leading-snug text-foreground">{n.title}</h3>
              {n.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{n.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="muted">{n.branch}</Badge>
                <Badge variant="muted">Sem {n.semester}</Badge>
                <Badge variant="muted">{formatSize(n.file_size)}</Badge>
              </div>
              <div className="mt-auto pt-4">
                <p className="mb-3 text-xs text-muted-foreground">{n.uploaded_by_name ?? "Faculty"} · {format(new Date(n.created_at), "d MMM yyyy")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPreview(n)} disabled={busy === `p-${n.id}`}>
                    {busy === `p-${n.id}` ? <Loader2 className="animate-spin" /> : <Eye />} Preview
                  </Button>
                  <Button size="sm" onClick={() => download(n)} disabled={busy === `d-${n.id}`}>
                    {busy === `d-${n.id}` ? <Loader2 className="animate-spin" /> : <Download />} Download
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PdfPreview preview={preview} onClose={() => setPreview(null)} />

      {me && <NoteDialog open={dialog.open} note={dialog.note} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} userId={me.userId} />}
    </>
  );
}
