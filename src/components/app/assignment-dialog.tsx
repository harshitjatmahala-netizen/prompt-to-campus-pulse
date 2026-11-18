import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, SEMESTERS } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

export function AssignmentDialog({
  open,
  onOpenChange,
  assignment,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment?: Tables<"assignments"> | null;
  userId: string;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [branch, setBranch] = useState("all");
  const [semester, setSemester] = useState("all");
  const [due, setDue] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(assignment?.title ?? "");
    setSubject(assignment?.subject ?? "");
    setDescription(assignment?.description ?? "");
    setBranch(assignment?.branch ?? "all");
    setSemester(assignment?.semester ? String(assignment.semester) : "all");
    setDue(assignment ? format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm") : "");
  }, [open, assignment]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !subject.trim() || !due) throw new Error("Fill in title, subject and due date");
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || null,
        branch: branch === "all" ? null : branch,
        semester: semester === "all" ? null : Number(semester),
        due_date: new Date(due).toISOString(),
      };
      const { error } = assignment
        ? await supabase.from("assignments").update({ ...payload, reminder_sent: false }).eq("id", assignment.id)
        : await supabase.from("assignments").insert({ ...payload, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(assignment ? "Assignment updated" : "Assignment created");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit assignment" : "Create assignment"}</DialogTitle>
          <DialogDescription>Students get notified and reminded before the deadline.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title" htmlFor="a-title">
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lab report: Sorting algorithms" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject" htmlFor="a-subject">
              <Input id="a-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Data Structures" />
            </Field>
            <Field label="Due date & time" htmlFor="a-due">
              <Input id="a-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Branch">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Instructions" htmlFor="a-desc">
            <Textarea id="a-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should students submit?" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {assignment ? "Save changes" : "Create assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
