import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsBookmarked, useToggleBookmark, type BookmarkKind } from "@/lib/library";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/utils";

export function BookmarkButton({ kind, id, className }: { kind: BookmarkKind; id: string; className?: string }) {
  const me = useMe();
  const saved = useIsBookmarked(me?.userId, kind, id);
  const toggle = useToggleBookmark(me?.userId);
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle.mutate({ kind, id, saved }); }}
    >
      <Bookmark className={cn("transition-transform", saved && "scale-110 fill-primary text-primary")} />
    </Button>
  );
}
