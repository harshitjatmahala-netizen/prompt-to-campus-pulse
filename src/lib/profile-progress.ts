import type { Profile } from "@/lib/me";

export type ProfileChecklistItem = { label: string; complete: boolean };
export type ProfileProgressSource = Pick<
  Profile,
  "full_name" | "email" | "roll_number" | "branch" | "phone" | "avatar_url"
>;

export function profileChecklist(profile: ProfileProgressSource | null | undefined) {
  const items: ProfileChecklistItem[] = [
    { label: "Name", complete: !!profile?.full_name.trim() },
    { label: "College email", complete: !!profile?.email.trim() },
    { label: "Roll number", complete: !!profile?.roll_number?.trim() },
    { label: "Branch", complete: !!profile?.branch?.trim() },
    { label: "Phone number", complete: !!profile?.phone?.trim() },
    { label: "Profile photo", complete: !!profile?.avatar_url },
  ];
  const completed = items.filter((item) => item.complete).length;
  return { items, completed, total: items.length, percent: Math.round((completed / items.length) * 100) };
}