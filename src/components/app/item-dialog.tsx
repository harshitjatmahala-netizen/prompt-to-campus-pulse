import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";
import { MediaImage } from "./media-image";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { ITEM_CATEGORIES, ITEM_STATUSES, type ItemStatus } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

export function ItemDialog({
  open,
  onOpenChange,
  item,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: Tables<"lost_found"> | null;
  userId: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ item_name: "", category: "", description: "", location_found: "", date_found: "", storage_number: "" });
  const [status, setStatus] = useState<ItemStatus>("available");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      item_name: item?.item_name ?? "",
      category: item?.category ?? "",
      description: item?.description ?? "",
      location_found: item?.location_found ?? "",
      date_found: item?.date_found ?? new Date().toISOString().slice(0, 10),
      storage_number: item?.storage_number ?? "",
    });
    setStatus(item?.status ?? "available");
    setImage(item?.image_url ?? null);
  }, [open, item]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function onImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      setImage(await uploadFile("media", userId, file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!f.item_name.trim() || !f.category || !f.location_found.trim() || !f.date_found || !f.storage_number.trim())
        throw new Error("Please fill in all required fields");
      const payload = {
        item_name: f.item_name.trim(),
        category: f.category,
        description: f.description.trim() || null,
        location_found: f.location_found.trim(),
        date_found: f.date_found,
        storage_number: f.storage_number.trim(),
        image_url: image,
        status,
      };
      const { error } = item
        ? await supabase.from("lost_found").update(payload).eq("id", item.id)
        : await supabase.from("lost_found").insert({ ...payload, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(item ? "Item updated" : "Found item published");
      qc.invalidateQueries({ queryKey: ["lost-found"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit found item" : "Publish a found item"}</DialogTitle>
          <DialogDescription>Items handed over to the College Office. Students can request a claim.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative aspect-[16/9] overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition hover:border-primary/50">
            <MediaImage
              src={image}
              alt="Item photo"
              className="absolute inset-0 h-full w-full"
              fallback={
                <span className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  Upload a photo of the item
                </span>
              }
            />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onImage(e.target.files?.[0])} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item name" htmlFor="i-name"><Input id="i-name" value={f.item_name} onChange={set("item_name")} placeholder="Black boAt earbuds" /></Field>
            <Field label="Category">
              <Select value={f.category} onValueChange={(v) => setF((s) => ({ ...s, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{ITEM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Description" htmlFor="i-desc"><Textarea id="i-desc" rows={3} value={f.description} onChange={set("description")} placeholder="Visible marks, colour, brand… (avoid details only the owner would know)" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location found" htmlFor="i-loc"><Input id="i-loc" value={f.location_found} onChange={set("location_found")} placeholder="Library, 2nd floor" /></Field>
            <Field label="Date found" htmlFor="i-date"><Input id="i-date" type="date" value={f.date_found} onChange={set("date_found")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Office storage no." htmlFor="i-store"><Input id="i-store" value={f.storage_number} onChange={set("storage_number")} placeholder="LF-0142" /></Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ITEM_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {item ? "Save changes" : "Publish item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
