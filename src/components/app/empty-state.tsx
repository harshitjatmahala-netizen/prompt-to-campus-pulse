import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <div className={cn("relative flex items-center justify-center rounded-2xl border bg-card text-primary shadow-card [&_svg]:size-6", compact ? "size-11" : "size-14")}>
          {icon}
        </div>
      </div>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
