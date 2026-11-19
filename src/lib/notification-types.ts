/** Notification center categories, mapped from the stored notification type. */
export type NotificationCategory = "academic" | "assignments" | "events" | "notes" | "lost-found" | "system";

export const NOTIFICATION_CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: "academic", label: "Academic" },
  { value: "assignments", label: "Assignments" },
  { value: "events", label: "Events" },
  { value: "notes", label: "Notes" },
  { value: "lost-found", label: "Lost & Found" },
  { value: "system", label: "System" },
];

export function categoryOf(type: string): NotificationCategory {
  switch (type) {
    case "notice":
    case "paper":
      return "academic";
    case "assignment":
    case "deadline":
      return "assignments";
    case "event":
      return "events";
    case "note":
      return "notes";
    case "claim":
      return "lost-found";
    default:
      return "system";
  }
}

/** Preference toggles shown in Settings; keys match the stored preference columns. */
export const PREFERENCE_TYPES = [
  { key: "notice", label: "New notices" },
  { key: "note", label: "Notes uploaded" },
  { key: "paper", label: "Previous year papers uploaded" },
  { key: "assignment", label: "New assignments" },
  { key: "deadline", label: "Assignment deadline reminders" },
  { key: "event", label: "New events" },
  { key: "claim", label: "Lost & Found claim updates" },
] as const;
