import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { MediaImage } from "./media-image";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import type { Tables } from "@/integrations/supabase/types";

export function EventDialog({
  open,
  onOpenChange,
  event,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: Tables<"events"> | null;
  userId: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ title: "", description: "", event_date: "", start_time: "", venue: "", organizer: "", capacity: "" });
  const [banner, setBanner] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      title: event?.title ?? "",
      description: event?.description ?? "",
      event_date: event?.event_date ?? "",
      start_time: event?.start_time?.slice(0, 5) ?? "",
      venue: event?.venue ?? "",
      organizer: event?.organizer ?? "",
      capacity: event?.capacity ? String(event.capacity) : "",
    });
    setBanner(event?.banner_url ?? null);
  }, [open, event]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function onBanner(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      setBanner(await uploadFile("media", userId, file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!f.title.trim() || !f.description.trim() || !f.event_date || !f.start_time || !f.venue.trim() || !f.organizer.trim())
        throw new Error("Please fill in all required fields");
      const payload = {
        title: f.title.trim(),
        description: f.description.trim(),
        event_date: f.event_date,
        start_time: f.start_time,
        venue: f.venue.trim(),
        organizer: f.organizer.trim(),
        capacity: f.capacity ? Number(f.capacity) : null,
        banner_url: banner,
      };
      const { error } = event
        ? await supabase.from("events").update(payload).eq("id", event.id)
        : await supabase.from("events").insert({ ...payload, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(event ? "Event updated" : "Event published");
      qc.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Create event"}</DialogTitle>
          <DialogDescription>Students can view details and register once it's live.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="group relative aspect-[3/1] overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition hover:border-primary/50">
            <MediaImage
              src={banner}
              alt="Event banner"
              className="absolute inset-0 h-full w-full"
              fallback={
                <span className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  Upload banner (optional)
                </span>
              }
            />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onBanner(e.target.files?.[0])} />
          <Field label="Event name" htmlFor="e-title"><Input id="e-title" value={f.title} onChange={set("title")} placeholder="TechFest 2026 — Hackathon" /></Field>
          <Field label="Description" htmlFor="e-desc"><Textarea id="e-desc" rows={4} value={f.description} onChange={set("description")} placeholder="What's happening, who should come, what to bring…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="e-date"><Input id="e-date" type="date" value={f.event_date} onChange={set("event_date")} /></Field>
            <Field label="Time" htmlFor="e-time"><Input id="e-time" type="time" value={f.start_time} onChange={set("start_time")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Venue" htmlFor="e-venue"><Input id="e-venue" value={f.venue} onChange={set("venue")} placeholder="Main Auditorium" /></Field>
            <Field label="Organizer" htmlFor="e-org"><Input id="e-org" value={f.organizer} onChange={set("organizer")} placeholder="Coding Club" /></Field>
          </div>
          <Field label="Capacity (optional)" htmlFor="e-cap"><Input id="e-cap" type="number" min={1} value={f.capacity} onChange={set("capacity")} placeholder="Leave empty for unlimited" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {event ? "Save changes" : "Publish event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
