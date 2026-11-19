import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";
import { supabase } from "@/integrations/supabase/client";
import { NOTICE_CATEGORIES, type NoticeCategory } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

export function NoticeDialog({
  open,
  onOpenChange,
  notice,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notice?: Tables<"notices"> | null;
  userId: string;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("general");
  const [pinned, setPinned] = useState(false);
  const [eventDate, setEventDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(notice?.title ?? "");
    setContent(notice?.content ?? "");
    setCategory(notice?.category ?? "general");
    setPinned(notice?.pinned ?? false);
    setEventDate(notice?.event_date ?? "");
  }, [open, notice]);

  const save = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 3) throw new Error("Title must be at least 3 characters");
      if (content.trim().length < 10) throw new Error("Write a few more words in the notice");
      const payload = { title: title.trim(), content: content.trim(), category, pinned, event_date: eventDate || null };
      const { error } = notice
        ? await supabase.from("notices").update(payload).eq("id", notice.id)
        : await supabase.from("notices").insert({ ...payload, author_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(notice ? "Notice updated" : "Notice published");
      qc.invalidateQueries({ queryKey: ["notices"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{notice ? "Edit notice" : "Publish a notice"}</DialogTitle>
          <DialogDescription>Students will be notified as soon as it's published.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title" htmlFor="n-title">
            <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid-semester exam schedule released" />
          </Field>
          <Field label="Category">
            <Select value={category} onValueChange={(v) => setCategory(v as NoticeCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTICE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Calendar date (optional)" htmlFor="n-date" hint="For holidays and exams — shows the notice on the campus calendar.">
            <Input id="n-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label="Details" htmlFor="n-content">
            <Textarea id="n-content" rows={7} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the full notice here…" />
          </Field>
          <label className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Pin to top</span>
              <span className="block text-xs text-muted-foreground">Pinned notices stay above everything else.</span>
            </span>
            <Switch checked={pinned} onCheckedChange={setPinned} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {notice ? "Save changes" : "Publish notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
