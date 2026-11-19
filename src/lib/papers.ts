import type { Database } from "@/integrations/supabase/types";

export type ExamType = Database["public"]["Enums"]["exam_type"];

export const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "mid_sem", label: "Mid Semester" },
  { value: "end_sem", label: "End Semester" },
];

export const examLabel = (v: string) => EXAM_TYPES.find((e) => e.value === v)?.label ?? v;

/** Academic years like "2025-26", newest first, going back `count` years from `now`. */
export function academicYears(now = new Date(), count = 8) {
  // A new academic year starts in July.
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => {
    const y = start - i;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });
}
