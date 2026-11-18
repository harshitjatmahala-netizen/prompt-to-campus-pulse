import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="13" r="1.4" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Campus<span className="text-primary">Connect</span>
        </span>
      )}
    </span>
  );
}
