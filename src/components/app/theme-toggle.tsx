import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className="rounded-xl"
    >
      {resolved === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
