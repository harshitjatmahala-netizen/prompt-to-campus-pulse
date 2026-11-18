import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/logo";
import { GoogleButton } from "@/components/app/google-button";
import { allowedDomainsQuery } from "@/lib/me";
import { isAllowedEmail } from "@/lib/rules";
import { LOGIN_DOMAIN_ERROR } from "@/lib/constants";

type AuthSearch = { error?: "domain" | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    error: s["error"] === "domain" ? "domain" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CampusConnect" },
      { name: "description", content: "Sign in to CampusConnect with your official college Google account." },
      { property: "og:title", content: "Sign in — CampusConnect" },
      { property: "og:description", content: "Use your official college email to access your university portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(search.error === "domain" ? LOGIN_DOMAIN_ERROR : null);

  async function verifyAndContinue() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return false;
    const allowed = await queryClient.fetchQuery(allowedDomainsQuery);
    if (!isAllowedEmail(user.email, allowed)) {
      await supabase.auth.signOut();
      queryClient.clear();
      setError(LOGIN_DOMAIN_ERROR);
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    navigate({ to: "/dashboard", replace: true });
    return true;
  }

  useEffect(() => {
    // Returning from a full-page Google redirect lands here with a session.
    verifyAndContinue().finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
      extraParams: { hd: "jecrcu.edu.in", prompt: "select_account" },
    });
    if (result.error) {
      setError(result.error.message || "Sign in failed. Please try again.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    await verifyAndContinue();
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-ink p-12 text-ink-foreground lg:flex lg:flex-col dark:text-foreground">
        <div className="absolute inset-0 grid-pattern opacity-[0.08]" />
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-40 left-10 size-[22rem] rounded-full bg-primary-glow/25 blur-3xl" />
        <Link to="/" className="relative">
          <span className="inline-flex items-center gap-2.5">
            <Logo compact />
            <span className="font-display text-lg font-bold">CampusConnect</span>
          </span>
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Everything your campus shares, in one calm place.
          </h2>
          <p className="mt-4 text-base opacity-75">
            Notices, study material, deadlines, events and Lost & Found — built for students, faculty and the
            college office.
          </p>
          <div className="mt-10 grid gap-3">
            {[
              { icon: ShieldCheck, text: "Only verified college accounts can sign in" },
              { icon: Sparkles, text: "Personalised for your branch and semester" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
                <Icon className="size-4 opacity-80" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="relative flex items-center justify-center bg-background bg-mesh px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-10 inline-flex lg:hidden">
            <Logo />
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your official college Google account to continue.
          </p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="mt-1 opacity-80">Use your @jecrcu.edu.in account. Personal Gmail accounts aren't allowed.</p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <GoogleButton onClick={handleGoogle} loading={loading || checking} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Only <span className="font-medium text-foreground">@jecrcu.edu.in</span> emails are accepted.
          </p>
        </div>
      </main>
    </div>
  );
}
