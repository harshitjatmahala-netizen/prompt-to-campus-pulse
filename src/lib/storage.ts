import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = "notes" | "media";

export async function uploadFile(bucket: Bucket, userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedUrl(bucket: Bucket, path: string, download?: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** Resolves a stored media value: full URLs pass through, storage paths get a signed URL. */
export function useMediaUrl(value: string | null | undefined) {
  const isRemote = !!value && /^https?:\/\//.test(value);
  const { data } = useQuery({
    queryKey: ["signed", "media", value],
    queryFn: () => signedUrl("media", value as string),
    enabled: !!value && !isRemote,
    staleTime: 50 * 60_000,
  });
  if (!value) return null;
  return isRemote ? value : (data ?? null);
}
