import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type NoticeCategory = Database["public"]["Enums"]["notice_category"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];
export type ClaimStatus = Database["public"]["Enums"]["claim_status"];

export const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Electrical",
  "Mechanical",
  "Civil",
  "AI & Data Science",
  "BCA",
  "MCA",
  "MBA",
] as const;

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const SECTIONS = ["A", "B", "C", "D", "E"] as const;

export const NOTICE_CATEGORIES: { value: NoticeCategory; label: string; tone: BadgeTone }[] = [
  { value: "academic", label: "Academic", tone: "soft" },
  { value: "exam", label: "Exam", tone: "danger" },
  { value: "placement", label: "Placement", tone: "success" },
  { value: "holiday", label: "Holiday", tone: "warning" },
  { value: "sports", label: "Sports", tone: "violet" },
  { value: "general", label: "General", tone: "muted" },
];

export const ITEM_CATEGORIES = [
  "Electronics",
  "ID Card",
  "Wallet",
  "Keys",
  "Bag",
  "Books & Stationery",
  "Clothing",
  "Water Bottle",
  "Jewellery",
  "Other",
] as const;

export const ITEM_STATUSES: { value: ItemStatus; label: string; tone: BadgeTone }[] = [
  { value: "available", label: "Available", tone: "success" },
  { value: "claim_requested", label: "Claim Requested", tone: "warning" },
  { value: "approved", label: "Approved", tone: "info" },
  { value: "collected", label: "Collected", tone: "muted" },
  { value: "archived", label: "Archived", tone: "muted" },
];

export type BadgeTone =
  | "soft"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "rose"
  | "muted"
  | "new";

export const ROLE_LABEL: Record<AppRole, string> = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
};

export function noticeCategory(value: string) {
  return NOTICE_CATEGORIES.find((c) => c.value === value) ?? NOTICE_CATEGORIES[5]!;
}
export function itemStatus(value: string) {
  return ITEM_STATUSES.find((c) => c.value === value) ?? ITEM_STATUSES[0]!;
}

export const LOGIN_DOMAIN_ERROR = "Please login using your official college email.";
