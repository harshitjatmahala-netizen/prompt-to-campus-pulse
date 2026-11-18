import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { supabase } from "@/integrations/supabase/client";
import type { Me } from "@/lib/me";
import type { Tables } from "@/integrations/supabase/types";

const claimSchema = z.object({
  student_name: z.string().trim().min(2, "Enter your name").max(100),
  roll_number: z.string().trim().min(3, "Enter your roll number").max(40),
  phone: z.string().trim().regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone number"),
  reason: z.string().trim().min(20, "Describe something only the owner would know (at least 20 characters)").max(1000),
});

export function ClaimDialog({
  item,
  me,
  onOpenChange,
}: {
  item: Tables<"lost_found"> | null;
  me: Me;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({ student_name: "", roll_number: "", phone: "", reason: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!item) return;
    setF({
      student_name: me.profile?.full_name ?? "",
      roll_number: me.profile?.roll_number ?? "",
      phone: me.profile?.phone ?? "",
      reason: "",
    });
    setErrors({});
  }, [item, me]);

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = claimSchema.safeParse(f);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
        setErrors(errs);
        throw new Error("Please fix the highlighted fields");
      }
      const { error } = await supabase.from("claim_requests").insert({ ...parsed.data, item_id: item!.id, user_id: me.userId });
      if (error) throw error.code === "23505" ? new Error("You've already requested a claim for this item") : error;
    },
    onSuccess: () => {
      toast.success("Claim request sent", { description: "The admin will verify it and notify you." });
      qc.invalidateQueries({ queryKey: ["lost-found"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request claim · {item?.item_name}</DialogTitle>
          <DialogDescription>The admin will check your details. If approved, collect it from the College Office with your ID card.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Student name" htmlFor="c-name" error={errors["student_name"]}><Input id="c-name" value={f.student_name} onChange={set("student_name")} /></Field>
            <Field label="Roll number" htmlFor="c-roll" error={errors["roll_number"]}><Input id="c-roll" value={f.roll_number} onChange={set("roll_number")} /></Field>
          </div>
          <Field label="Phone number" htmlFor="c-phone" error={errors["phone"]}><Input id="c-phone" value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Proof of ownership" htmlFor="c-reason" error={errors["reason"]} hint="E.g. lock-screen wallpaper, a scratch, what's inside, purchase bill.">
            <Textarea id="c-reason" rows={4} value={f.reason} onChange={set("reason")} placeholder="Describe something only the owner would know…" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="animate-spin" />} Submit claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
