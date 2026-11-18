import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary sm:flex [&_svg]:size-6">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground sm:text-[15px]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
