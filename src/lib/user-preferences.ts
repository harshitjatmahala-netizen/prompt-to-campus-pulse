import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserPreferences = Tables<"user_preferences">;
export type UserPreferenceUpdates = Partial<Omit<UserPreferences, "user_id" | "updated_at">>;
export type AppearanceTheme = "light" | "dark" | "system";
export type AccentColor = "blue" | "purple" | "green" | "orange" | "red";
export type InterfaceDensity = "compact" | "comfortable";
export type MotionPreference = "full" | "reduced";
export type FontSize = "small" | "medium" | "large";

export function defaultUserPreferences(userId: string): UserPreferences {
  return {
    user_id: userId,
    appearance_theme: "system",
    accent_color: "blue",
    interface_density: "comfortable",
    motion_preference: "full",
    font_size: "medium",
    tour_completed: false,
    updated_at: new Date(0).toISOString(),
  };
}

export function userPreferencesQuery(userId: string) {
  return queryOptions({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? defaultUserPreferences(userId);
    },
  });
}

export async function saveUserPreferences(userId: string, updates: UserPreferenceUpdates) {
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, updated_at: new Date().toISOString(), ...updates });
  if (error) throw error;
}

export function applyInterfacePreferences(preferences: UserPreferences) {
  const root = document.documentElement;
  root.dataset.accent = preferences.accent_color;
  root.dataset.density = preferences.interface_density;
  root.dataset.motion = preferences.motion_preference;
  root.dataset.fontSize = preferences.font_size;
}