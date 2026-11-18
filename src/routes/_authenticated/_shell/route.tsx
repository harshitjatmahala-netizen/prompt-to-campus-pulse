import { createFileRoute, redirect } from "@tanstack/react-router";
import { meQuery } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/_shell")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me || !me.profile) {
      // No profile means the email domain isn't approved.
      await supabase.auth.signOut();
      context.queryClient.clear();
      throw redirect({ to: "/auth", search: { error: "domain" } });
    }
    if (!me.profile.profile_completed) throw redirect({ to: "/onboarding" });
    return { me };
  },
  component: AppShell,
});
