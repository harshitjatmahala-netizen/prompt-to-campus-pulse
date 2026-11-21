import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/logo";
import { GoogleButton } from "@/components/app/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkEmailAllowed } from "@/lib/me";
import { LOGIN_DOMAIN_ERROR } from "@/lib/constants";

type AuthSearch = { error?: "domain" | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    error: s["error"] === "domain" ? "domain" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CampusConnect" },
      { name: "description", content: "Sign in or sign up to CampusConnect with your official college email." },
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function verifyAndContinue() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return false;
    if (!(await checkEmailAllowed(user.email))) {
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

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setError("Please enter your college email and password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    if (!(await checkEmailAllowed(trimmed))) {
      setError(LOGIN_DOMAIN_ERROR);
      setLoading(false);
      return;
    }
    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (signInError) {
        setError(
          signInError.message.toLowerCase().includes("email not confirmed")
            ? "Please confirm your email first — check your inbox for the confirmation link."
            : "Incorrect email or password. New here? Switch to Sign up.",
        );
        setLoading(false);
        return;
      }
      await verifyAndContinue();
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        await verifyAndContinue();
      } else {
        setEmailSent(true);
      }
    }
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
            Sign in with your college Google account or your college email and password.
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

          {emailSent ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
              <MailCheck className="size-8 text-primary" />
              <p className="font-medium text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click it,
                then come back and sign in.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEmailSent(false);
                  setMode("signin");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <GoogleButton onClick={handleGoogle} loading={loading || checking} />
              </div>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or with email
                <span className="h-px flex-1 bg-border" />
              </div>

              <Tabs
                value={mode}
                onValueChange={(v) => {
                  setMode(v as "signin" | "signup");
                  setError(null);
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleEmailAuth} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">College email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@jecrcu.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading || checking}>
                  {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Only <span className="font-medium text-foreground">@jecrcu.edu.in</span> emails are accepted.
          </p>
        </div>
      </main>
    </div>
  );
}
