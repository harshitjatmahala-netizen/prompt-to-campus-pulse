import { describe, expect, it } from "vitest";
import { academicYearFor, campusIdNumber, campusIdQrValue } from "./id-card";
import { profileChecklist } from "./profile-progress";

describe("CampusConnect identity details", () => {
  it("creates a stable, readable campus ID from the profile ID", () => {
    expect(campusIdNumber("3eae50a7-5b7c-496e-a2eb-0f229435890d")).toBe("CC-3EAE50A7B5");
  });

  it("uses an August academic-year boundary", () => {
    expect(academicYearFor(new Date(2026, 6, 1))).toBe("2025–26");
    expect(academicYearFor(new Date(2026, 7, 1))).toBe("2026–27");
  });

  it("keeps the QR payload free of private profile fields", () => {
    expect(campusIdQrValue("CC-1234567890", "student")).toBe(
      '{"issuer":"CampusConnect","id":"CC-1234567890","role":"student"}',
    );
  });

  it("shows the completion percent and missing fields", () => {
    const progress = profileChecklist({
      full_name: "A Student",
      email: "student@jecrcu.edu.in",
      roll_number: "26BCON0436",
      branch: "Computer Science",
      phone: "+91 9876543210",
      avatar_url: null,
    });
    expect(progress.percent).toBe(83);
    expect(progress.items.filter((item) => !item.complete).map((item) => item.label)).toEqual(["Profile photo"]);
  });
});