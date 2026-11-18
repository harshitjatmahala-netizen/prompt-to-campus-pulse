import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  const url = useMediaUrl(src);
  return (
    <Avatar className={cn("size-9 ring-2 ring-background", className)}>
      {url && <AvatarImage src={url} alt={name ?? ""} referrerPolicy="no-referrer" className="object-cover" />}
      <AvatarFallback className="bg-primary-soft font-medium text-accent-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
