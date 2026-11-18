import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { useMe } from "@/lib/me";
import { signOut } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/settings")({
  head: () => pageHead("Settings", "Appearance and account settings."),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader icon={<Settings />} title="Settings" />
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold">Appearance</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["light", "dark", "system"] as Theme[]).map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} className={cn("rounded-xl border px-4 py-3 text-sm font-medium capitalize transition", theme === t ? "border-primary bg-primary-soft text-accent-foreground" : "hover:bg-muted")}>{t}</button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">{me?.email} · {me ? ROLE_LABEL[me.role] : ""}</p>
        <Button variant="outline" className="mt-4 text-destructive" onClick={async () => { await signOut(qc); navigate({ to: "/auth", replace: true }); }}><LogOut /> Sign out</Button>
      </section>
    </div>
  );
}
