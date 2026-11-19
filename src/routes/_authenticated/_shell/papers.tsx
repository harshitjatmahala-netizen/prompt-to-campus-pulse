import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Eye, FileStack, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { PaperDialog } from "@/components/app/paper-dialog";
import { PdfPreview } from "@/components/app/pdf-preview";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { BookmarkButton } from "@/components/app/bookmark-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { canManage, isStaff } from "@/lib/rules";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import { EXAM_TYPES, examLabel } from "@/lib/papers";
import { downloadAndRecord, formatSize } from "@/lib/library";
import { signedUrl } from "@/lib/storage";
import { pageHead } from "@/lib/seo";
import type { Tables } from "@/integrations/supabase/types";

type PapersSearch = { q?: string | undefined };

export const Route = createFileRoute("/_authenticated/_shell/papers")({
  validateSearch: (s: Record<string, unknown>): PapersSearch => ({ q: typeof s["q"] === "string" ? s["q"] : undefined }),
  head: () => pageHead("Previous Year Papers", "Search, preview and download previous year question papers."),
  component: PapersPage,
});

type Paper = Tables<"question_papers">;

function usePapers() {
  return useQuery({
    queryKey: ["papers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("question_papers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function PapersPage() {
  const me = useMe();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [branch, setBranch] = useState("all");
  const [semester, setSemester] = useState("all");
  const [subject, setSubject] = useState("all");
  const [year, setYear] = useState("all");
  const [exam, setExam] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; paper: Paper | null }>({ open: false, paper: null });
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data = [], isLoading } = usePapers();

  const subjects = useMemo(() => [...new Set(data.map((p) => p.subject))].sort(), [data]);
  const years = useMemo(() => [...new Set(data.map((p) => p.academic_year))].sort().reverse(), [data]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((p) =>
      (branch === "all" || p.branch === branch) &&
      (semester === "all" || String(p.semester) === semester) &&
      (subject === "all" || p.subject === subject) &&
      (year === "all" || p.academic_year === year) &&
      (exam === "all" || p.exam_type === exam) &&
      (!s || [p.subject, p.branch, p.academic_year].some((v) => v.toLowerCase().includes(s))),
    );
  }, [data, q, branch, semester, subject, year, exam]);

  const remove = useMutation({
    mutationFn: async (p: Paper) => {
      const { error } = await supabase.from("question_papers").delete().eq("id", p.id);
      if (error) throw error;
      await supabase.storage.from("notes").remove([p.file_path]);
    },
    onSuccess: () => { toast.success("Paper deleted"); qc.invalidateQueries({ queryKey: ["papers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  const title = (p: Paper) => `${p.subject} · ${examLabel(p.exam_type)} ${p.academic_year}`;
  const staff = isStaff(me?.role);
  const filterCls = "h-10 rounded-xl bg-card";

  return (
    <>
      <PageHeader
        icon={<FileStack />}
        title="Previous Year Papers"
        description="Question paper bank for mid and end semester exams."
        actions={staff && <Button variant="hero" onClick={() => setDialog({ open: true, paper: null })}><Plus /> Upload paper</Button>}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search papers" className={`${filterCls} pl-9`} />
        </div>
        <Select value={branch} onValueChange={setBranch}><SelectTrigger className={filterCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All branches</SelectItem>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        <Select value={semester} onValueChange={setSemester}><SelectTrigger className={filterCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All semesters</SelectItem>{SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}</SelectContent></Select>
        <Select value={subject} onValueChange={setSubject}><SelectTrigger className={filterCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={year} onValueChange={setYear}><SelectTrigger className={filterCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All years</SelectItem>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
        <Select value={exam} onValueChange={setExam}><SelectTrigger className={filterCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All exams</SelectItem>{EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileStack />} title={data.length ? "No papers match your filters" : "No papers uploaded yet"} description={data.length ? "Try clearing a filter." : staff ? "Upload the first question paper." : "Question papers shared by faculty will appear here."} />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 8) * 0.04 } }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex flex-col rounded-2xl border bg-card p-5 shadow-card interactive-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-violet-soft text-violet"><FileStack className="size-5" /></div>
                  <div className="flex gap-0.5">
                    <BookmarkButton kind="paper" id={p.id} />
                    {canManage(me?.role, me?.userId, p.uploaded_by) && (
                      <>
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Edit" onClick={() => setDialog({ open: true, paper: p })}><Pencil /></Button>
                        <ConfirmDelete title="Delete this paper?" onConfirm={() => remove.mutate(p)} trigger={<Button variant="ghost" size="icon" className="size-8" aria-label="Delete"><Trash2 className="text-destructive" /></Button>} />
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-primary">{examLabel(p.exam_type)} · {p.academic_year}</p>
                <h3 className="mt-1 font-display text-base font-semibold leading-snug text-foreground">{p.subject}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="muted">{p.branch}</Badge>
                  <Badge variant="muted">Sem {p.semester}</Badge>
                  <Badge variant="muted">{formatSize(p.file_size)}</Badge>
                </div>
                <div className="mt-auto pt-4">
                  <p className="mb-3 text-xs text-muted-foreground">{p.uploaded_by_name ?? "Faculty"} · {format(new Date(p.created_at), "d MMM yyyy")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" disabled={busy === `p-${p.id}`} onClick={() => run(`p-${p.id}`, async () => setPreview({ title: title(p), url: await signedUrl("notes", p.file_path) }))}>
                      {busy === `p-${p.id}` ? <Loader2 className="animate-spin" /> : <Eye />} Preview
                    </Button>
                    <Button size="sm" disabled={busy === `d-${p.id}` || !me} onClick={() => me && run(`d-${p.id}`, () => downloadAndRecord({ userId: me.userId, bucket: "notes", path: p.file_path, fileName: p.file_name, kind: "paper", itemId: p.id, title: title(p) }))}>
                      {busy === `d-${p.id}` ? <Loader2 className="animate-spin" /> : <Download />} Download
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      <PdfPreview preview={preview} onClose={() => setPreview(null)} />
      {me && <PaperDialog open={dialog.open} paper={dialog.paper} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} userId={me.userId} />}
    </>
  );
}
