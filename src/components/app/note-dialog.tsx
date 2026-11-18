import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

export function NoteDialog({
  open,
  onOpenChange,
  note,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  note?: Tables<"notes"> | null;
  userId: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? "");
    setSubject(note?.subject ?? "");
    setBranch(note?.branch ?? "");
    setSemester(note?.semester ? String(note.semester) : "");
    setDescription(note?.description ?? "");
    setFile(null);
  }, [open, note]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !subject.trim() || !branch || !semester) throw new Error("Fill in title, subject, branch and semester");
      if (!note && !file) throw new Error("Attach a PDF file");
      if (file && file.type !== "application/pdf") throw new Error("Only PDF files are allowed");
      if (file && file.size > 25 * 1024 * 1024) throw new Error("PDF must be under 25 MB");
      let fileFields = {};
      if (file) {
        const path = await uploadFile("notes", userId, file);
        fileFields = { file_path: path, file_name: file.name, file_size: file.size };
      }
      const payload = { title: title.trim(), subject: subject.trim(), branch, semester: Number(semester), description: description.trim() || null, ...fileFields };
      const { error } = note
        ? await supabase.from("notes").update(payload).eq("id", note.id)
        : await supabase.from("notes").insert({ ...(payload as typeof payload & { file_path: string; file_name: string }), uploaded_by: userId });
      if (error) throw error;
      if (note && file) await supabase.storage.from("notes").remove([note.file_path]);
    },
    onSuccess: () => {
      toast.success(note ? "Notes updated" : "Notes uploaded");
      qc.invalidateQueries({ queryKey: ["notes"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Edit notes" : "Upload study material"}</DialogTitle>
          <DialogDescription>Students in the selected branch and semester will be notified.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title" htmlFor="nt-title">
            <Input id="nt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unit 3 — Normalization" />
          </Field>
          <Field label="Subject" htmlFor="nt-subject">
            <Input id="nt-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Database Management Systems" />
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
          </div>
          <Field label="Description" htmlFor="nt-desc">
            <Textarea id="nt-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's covered in these notes?" />
          </Field>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border-2 border-dashed bg-muted/40 p-4 text-left transition hover:border-primary/50 hover:bg-primary-soft/40"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileUp className="size-5" /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{file ? file.name : note ? `Current: ${note.file_name}` : "Choose a PDF file"}</span>
              <span className="block text-xs text-muted-foreground">{note ? "Pick a new file to replace it · " : ""}PDF up to 25 MB</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {note ? "Save changes" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
