import { CalendarDays } from "lucide-react";
import { MediaImage } from "./media-image";
import { cn } from "@/lib/utils";

export function EventBanner({ src, title, className }: { src?: string | null; title: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-gradient-ink", className)}>
      <MediaImage
        src={src}
        alt={title}
        className="absolute inset-0 h-full w-full"
        fallback={
          <>
            <div className="absolute inset-0 grid-pattern opacity-10" />
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/50 blur-2xl" />
            <div className="absolute -bottom-12 left-6 size-32 rounded-full bg-primary-glow/40 blur-2xl" />
            <CalendarDays className="absolute bottom-4 right-4 size-10 text-ink-foreground/30 dark:text-foreground/30" />
          </>
        }
      />
    </div>
  );
}
