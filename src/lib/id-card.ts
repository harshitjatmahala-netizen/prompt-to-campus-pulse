import type { AppRole } from "@/lib/constants";

export function campusIdNumber(profileId: string) {
  const compact = profileId.replace(/[^a-f0-9]/gi, "").toUpperCase();
  return `CC-${compact.slice(0, 10)}`;
}

export function academicYearFor(date: Date) {
  const startYear = date.getFullYear() - (date.getMonth() < 7 ? 1 : 0);
  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}

export function campusIdQrValue(id: string, role: AppRole) {
  return JSON.stringify({ issuer: "CampusConnect", id, role });
}