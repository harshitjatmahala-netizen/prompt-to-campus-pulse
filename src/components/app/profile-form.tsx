import { useRef, useState } from "react";
import { z } from "zod";
import { Camera, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";
import { UserAvatar } from "./user-avatar";
import { BRANCHES, SECTIONS, SEMESTERS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import type { Profile } from "@/lib/me";

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone number"),
  college_name: z.string().trim().min(2, "Enter your college name").max(150),
  roll_number: z.string().trim().min(3, "Enter your roll number").max(40),
  branch: z.string().min(1, "Choose your branch"),
  semester: z.coerce.number().int().min(1, "Choose your semester").max(8),
  section: z.string().min(1, "Choose your section"),
});
type FormValues = Omit<z.input<typeof profileSchema>, "semester"> & { semester: string | number };

export function ProfileForm({
  profile,
  submitLabel,
  onSaved,
}: {
  profile: Profile;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [values, setValues] = useState<FormValues>({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    college_name: profile.college_name ?? "JECRC University",
    roll_number: profile.roll_number ?? "",
    branch: profile.branch ?? "",
    semester: profile.semester ?? "",
    section: profile.section ?? "",
  });

  const set = (k: keyof FormValues) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  async function onAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      const path = await uploadFile("media", profile.id, file);
      setAvatar(path);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const errs: typeof errors = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof FormValues] ??= issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, avatar_url: avatar, profile_completed: true })
      .eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["me"] });
    toast.success("Profile saved");
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar src={avatar} name={values.full_name} className="size-20 text-xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-glow transition hover:scale-105"
            aria-label="Change profile photo"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
        </div>
        <div>
          <p className="font-medium text-foreground">Profile photo</p>
          <p className="text-sm text-muted-foreground">Synced from Google. Upload a new one any time.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
          <Input id="full_name" value={values.full_name} onChange={(e) => set("full_name")(e.target.value)} />
        </Field>
        <Field label="College email" htmlFor="email" hint="Verified by Google — can't be changed">
          <div className="relative">
            <Input id="email" value={profile.email} disabled className="pr-9" />
            <Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Field>
        <Field label="Phone number" htmlFor="phone" error={errors.phone}>
          <Input id="phone" inputMode="tel" placeholder="+91 98765 43210" value={values.phone} onChange={(e) => set("phone")(e.target.value)} />
        </Field>
        <Field label="College name" htmlFor="college_name" error={errors.college_name}>
          <Input id="college_name" value={values.college_name} onChange={(e) => set("college_name")(e.target.value)} />
        </Field>
        <Field label="Roll number" htmlFor="roll_number" error={errors.roll_number}>
          <Input id="roll_number" placeholder="26BCON0436" value={values.roll_number} onChange={(e) => set("roll_number")(e.target.value.toUpperCase())} />
        </Field>
        <Field label="Branch" error={errors.branch}>
          <Select value={values.branch} onValueChange={set("branch")}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Semester" error={errors.semester}>
          <Select value={values.semester ? String(values.semester) : ""} onValueChange={set("semester")}>
            <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
            <SelectContent>
              {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Section" error={errors.section}>
          <Select value={values.section} onValueChange={set("section")}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="hero" size="lg" disabled={saving || uploading}>
          {saving && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
