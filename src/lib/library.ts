import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, type Bucket } from "./storage";

export type BookmarkKind = "notice" | "note" | "event" | "paper";
export type DownloadKind = "note" | "paper";

export function useBookmarks(userId?: string) {
  return useQuery({
    queryKey: ["bookmarks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookmarks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIsBookmarked(userId: string | undefined, kind: BookmarkKind, id: string) {
  const { data = [] } = useBookmarks(userId);
  return data.some((b) => b.kind === kind && b.item_id === id);
}

export function useToggleBookmark(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id, saved }: { kind: BookmarkKind; id: string; saved: boolean }) => {
      if (!userId) throw new Error("Please sign in again");
      const { error } = saved
        ? await supabase.from("bookmarks").delete().eq("user_id", userId).eq("kind", kind).eq("item_id", id)
        : await supabase.from("bookmarks").insert({ user_id: userId, kind, item_id: id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.saved ? "Removed from saved items" : "Saved for later");
      qc.invalidateQueries({ queryKey: ["bookmarks", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Starts a file download and records it in the user's download history. */
export async function downloadAndRecord(opts: {
  userId: string;
  bucket: Bucket;
  path: string;
  fileName: string;
  kind: DownloadKind;
  itemId: string;
  title: string;
}) {
  const url = await signedUrl(opts.bucket, opts.path, opts.fileName);
  await supabase.from("downloads").insert({ user_id: opts.userId, kind: opts.kind, item_id: opts.itemId, title: opts.title });
  window.location.assign(url);
}

export function formatSize(bytes?: number | null) {
  if (!bytes) return "PDF";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
