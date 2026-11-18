import type { ReactNode } from "react";
import { useMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function MediaImage({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const url = useMediaUrl(src);
  if (!url) return <>{fallback}</>;
  return <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
