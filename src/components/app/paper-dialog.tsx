import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import { academicYears, EXAM_TYPES, type ExamType } from "@/lib/papers";
import type { Tables } from "@/integrations/supabase/types";

export function PaperDialog({ open, onOpenChange, paper, userId }: { open: boolean; onOpenChange: (o: boolean) => void; paper?: Tables<"question_papers"> | null; userId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [examType, setExamType] = useState<ExamType>("end_sem");
  const [year, setYear] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject(paper?.subject ?? "");
    setBranch(paper?.branch ?? "");
    setSemester(paper?.semester ? String(paper.semester) : "");
    setExamType(paper?.exam_type ?? "end_sem");
    setYear(paper?.academic_year ?? academicYears()[0]!);
    setFile(null);
  }, [open, paper]);

  const save = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !branch || !semester || !year) throw new Error("Fill in subject, branch, semester and academic year");
      if (!paper && !file) throw new Error("Attach the question paper PDF");
      if (file && file.type !== "application/pdf") throw new Error("Only PDF files are allowed");
      if (file && file.size > 25 * 1024 * 1024) throw new Error("PDF must be under 25 MB");
      let fileFields = {};
      if (file) {
        const path = await uploadFile("notes", userId, file);
        fileFields = { file_path: path, file_name: file.name, file_size: file.size };
      }
      const payload = { subject: subject.trim(), branch, semester: Number(semester), exam_type: examType, academic_year: year, ...fileFields };
      const { error } = paper
        ? await supabase.from("question_papers").update(payload).eq("id", paper.id)
        : await supabase.from("question_papers").insert({ ...(payload as typeof payload & { file_path: string; file_name: string }), uploaded_by: userId });
      if (error) throw error;
      if (paper && file) await supabase.storage.from("notes").remove([paper.file_path]);
    },
    onSuccess: () => {
      toast.success(paper ? "Paper updated" : "Paper uploaded");
      qc.invalidateQueries({ queryKey: ["papers"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{paper ? "Edit question paper" : "Upload a previous year paper"}</DialogTitle>
          <DialogDescription>Students in the selected branch and semester will be notified.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Subject" htmlFor="pp-subject">
            <Input id="pp-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Operating Systems" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Branch">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Exam type">
              <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Academic year">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{academicYears().map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-3 rounded-xl border-2 border-dashed bg-muted/40 p-4 text-left transition hover:border-primary/50 hover:bg-primary-soft/40">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileUp className="size-5" /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{file ? file.name : paper ? `Current: ${paper.file_name}` : "Choose a PDF file"}</span>
              <span className="block text-xs text-muted-foreground">{paper ? "Pick a new file to replace it · " : ""}PDF up to 25 MB</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}{paper ? "Save changes" : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
