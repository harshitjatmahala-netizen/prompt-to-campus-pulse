import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Pill tabs with a sliding active indicator. */
export function AnimatedTabs({ tabs, value, onChange, className }: { tabs: { value: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void; className?: string }) {
  const id = useId();
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-soft", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn("relative shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {active && <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-lg bg-primary shadow-glow" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative flex items-center gap-1.5">
              {t.label}
              {!!t.count && <span className={cn("rounded-full px-1.5 text-[10px] leading-4", active ? "bg-primary-foreground/20" : "bg-muted")}>{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
