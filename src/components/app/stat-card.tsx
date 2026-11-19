import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CountUp, StaggerItem } from "./motion";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  violet: "bg-violet-soft text-violet",
  rose: "bg-rose-soft text-rose",
  info: "bg-info-soft text-info",
} as const;
export type StatTone = keyof typeof TONES;

export function StatCard({ label, value, icon, tone = "primary", to, hint }: { label: string; value: number; icon: ReactNode; tone?: StatTone; to?: LinkProps["to"]; hint?: string }) {
  const body = (
    <div className="group relative h-full overflow-hidden rounded-2xl border bg-card p-5 shadow-card interactive-card">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
      <span className={cn("relative flex size-10 items-center justify-center rounded-xl [&_svg]:size-5", TONES[tone])}>{icon}</span>
      <p className="relative mt-4 font-display text-3xl font-bold text-foreground"><CountUp value={value} /></p>
      <p className="relative mt-0.5 text-sm text-muted-foreground">{label}</p>
      {hint && <p className="relative mt-1 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
  return <StaggerItem className="h-full">{to ? <Link to={to} className="block h-full">{body}</Link> : body}</StaggerItem>;
}
