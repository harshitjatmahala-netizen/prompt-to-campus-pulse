import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Camera, Loader2, LogOut, Monitor, Moon, Palette, Settings, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { FadeIn } from "@/components/app/motion";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { signOut } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { ROLE_LABEL } from "@/lib/constants";
import { PREFERENCE_TYPES } from "@/lib/notification-types";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/settings")({
  head: () => pageHead("Settings", "Profile photo, phone, appearance and notification preferences."),
  component: SettingsPage,
});

type PrefKey = (typeof PREFERENCE_TYPES)[number]["key"];
const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  useEffect(() => { setPhone(me?.profile?.phone ?? ""); }, [me?.profile?.phone]);

  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs", me?.userId],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", me!.userId).maybeSingle();
      return data;
    },
  });
  const setPref = useMutation({
    mutationFn: async ({ key, value }: { key: PrefKey; value: boolean }) => {
      const { error } = await supabase.from("notification_preferences").upsert({ user_id: me!.userId, [key]: value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const savePhone = useMutation({
    mutationFn: async () => {
      if (!/^[+]?[0-9\s-]{10,15}$/.test(phone.trim())) throw new Error("Enter a valid phone number");
      const { error } = await supabase.from("profiles").update({ phone: phone.trim() }).eq("id", me!.userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Phone number updated"); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPhoto(file?: File) {
    if (!file || !me) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    try {
      const path = await uploadFile("media", me.userId, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", me.userId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile photo updated");
    } catch (e) { toast.error((e as Error).message); } finally { setUploading(false); }
  }

  const section = "rounded-2xl border bg-card p-6 shadow-card";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader icon={<Settings />} title="Settings" description="Personalise your CampusConnect experience." />
      <FadeIn className={section}>
        <h2 className="flex items-center gap-2 font-display font-semibold"><UserRound className="size-4 text-primary" /> Profile</h2>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <UserAvatar src={me?.profile?.avatar_url} name={me?.profile?.full_name ?? ""} className="size-20 text-xl" />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change profile photo" className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-glow transition hover:scale-110">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          <div className="flex-1">
            <label htmlFor="set-phone" className="text-sm font-medium">Phone number</label>
            <div className="mt-1.5 flex gap-2">
              <Input id="set-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              <Button onClick={() => savePhone.mutate()} disabled={savePhone.isPending || phone === (me?.profile?.phone ?? "")}>{savePhone.isPending && <Loader2 className="animate-spin" />}Save</Button>
            </div>
            <Link to="/profile" className="mt-2 inline-block text-xs text-primary hover:underline">Edit full profile →</Link>
          </div>
        </div>
      </FadeIn>
      <FadeIn delay={0.05} className={section}>
        <h2 className="flex items-center gap-2 font-display font-semibold"><Palette className="size-4 text-primary" /> Appearance</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setTheme(value)} className={cn("flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition hover:-translate-y-0.5", theme === value ? "border-primary bg-primary-soft text-accent-foreground shadow-glow" : "hover:bg-muted")}>
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={0.1} className={section}>
        <h2 className="flex items-center gap-2 font-display font-semibold"><Bell className="size-4 text-primary" /> Notification preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose which updates you want to be notified about.</p>
        <ul className="mt-4 divide-y rounded-xl border">
          {PREFERENCE_TYPES.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{label}</span>
              <Switch checked={prefs ? prefs[key] : true} onCheckedChange={(v) => setPref.mutate({ key, value: v })} aria-label={label} />
            </li>
          ))}
        </ul>
      </FadeIn>
      <FadeIn delay={0.15} className={section}>
        <h2 className="font-display font-semibold">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">{me?.email} · {me ? ROLE_LABEL[me.role] : ""}</p>
        <Button variant="outline" className="mt-4 text-destructive" onClick={async () => { await signOut(qc); navigate({ to: "/auth", replace: true }); }}><LogOut /> Sign out</Button>
      </FadeIn>
    </div>
  );
}
