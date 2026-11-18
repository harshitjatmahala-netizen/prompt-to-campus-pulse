import type { AppRole } from "./constants";

/** Email domain check. `allowed` is the list of approved college domains. */
export function isAllowedEmail(email: string | null | undefined, allowed: string[]) {
  if (!email) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && allowed.map((d) => d.toLowerCase()).includes(domain);
}

export const isStaff = (role: AppRole | null | undefined) => role === "faculty" || role === "admin";
export const isAdmin = (role: AppRole | null | undefined) => role === "admin";

/** Faculty manage only their own content; admins manage everything; students manage nothing. */
export function canManage(role: AppRole | null | undefined, userId: string | undefined, ownerId: string) {
  if (role === "admin") return true;
  if (role === "faculty") return !!userId && userId === ownerId;
  return false;
}

/** Only admins publish or edit Lost & Found items. */
export const canPublishLostFound = (role: AppRole | null | undefined) => role === "admin";

export type AssignmentState = "completed" | "overdue" | "due-soon" | "pending";

export function daysRemaining(due: Date, now = new Date()) {
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

export function assignmentState(due: Date, completed: boolean, now = new Date()): AssignmentState {
  if (completed) return "completed";
  if (due.getTime() < now.getTime()) return "overdue";
  if (due.getTime() - now.getTime() <= 2 * 86_400_000) return "due-soon";
  return "pending";
}

/** A notice is "new" for 3 days after publishing. */
export function isNew(createdAt: string | Date, now = new Date()) {
  return now.getTime() - new Date(createdAt).getTime() < 3 * 86_400_000;
}

/** Students can request a claim only while an item is available or already has claims pending. */
export const canRequestClaim = (status: string) => status === "available" || status === "claim_requested";
