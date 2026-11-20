import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type Ctx = { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void };
const ThemeContext = createContext<Ctx | null>(null);

export const themeInitScript = `(function(){try{var t=localStorage.getItem('cc-theme')||'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

function resolve(t: Theme): "light" | "dark" {
  if (t === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (localStorage.getItem("cc-theme") as Theme | null) ?? "light";
    setThemeState(stored);
    setResolved(resolve(stored));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("cc-theme", t);
    setThemeState(t);
    const r = resolve(t);
    setResolved(r);
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", r === "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  }, []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
