import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client";
import { ProfileForm } from "@/components/app/profile-form";
import { Logo } from "@/components/app/logo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete your profile — CampusConnect" },
      { name: "description", content: "Finish setting up your CampusConnect profile." },
      { property: "og:title", content: "Complete your profile — CampusConnect" },
      { property: "og:description", content: "Finish setting up your CampusConnect profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me || !me.profile) {
      await supabase.auth.signOut();
      context.queryClient.clear();
      throw redirect({ to: "/auth", search: { error: "domain" } });
    }
  },
  component: Onboarding,
});

function Onboarding() {
  const { data: me } = useSuspenseQuery(meQuery);
  const navigate = useNavigate();
  if (!me?.profile) return null;
  const first = me.profile.full_name.split(" ")[0];

  return (
    <div className="min-h-screen bg-background bg-mesh px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <div className="mt-10 animate-fade-up">
          <p className="text-sm font-medium text-primary">Step 1 of 1 · Profile setup</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">Welcome, {first} 👋</h1>
          <p className="mt-2 text-muted-foreground">
            We've filled in what Google shared. Add a few college details so we can personalise your notes and
            assignments.
          </p>
        </div>
        <div className="mt-8 rounded-3xl border bg-card p-6 shadow-elevated sm:p-8">
          <ProfileForm
            profile={me.profile}
            submitLabel="Finish setup"
            onSaved={() => navigate({ to: "/dashboard", replace: true })}
          />
        </div>
      </div>
    </div>
  );
}
