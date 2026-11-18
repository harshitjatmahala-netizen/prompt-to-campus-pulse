import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, FileText, Megaphone, PackageSearch, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { globalSearch, type SearchHit } from "@/lib/search";

const GROUPS: { kind: SearchHit["kind"]; label: string; icon: typeof Megaphone }[] = [
  { kind: "notice", label: "Notices", icon: Megaphone },
  { kind: "note", label: "Notes", icon: FileText },
  { kind: "event", label: "Events", icon: CalendarDays },
  { kind: "item", label: "Lost & Found", icon: PackageSearch },
];

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data = [], isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => globalSearch(dq),
    enabled: dq.trim().length >= 2,
  });

  function go(hit: SearchHit) {
    setOpen(false);
    if (hit.kind === "notice") navigate({ to: "/notices/$id", params: { id: hit.id } });
    else if (hit.kind === "event") navigate({ to: "/events/$id", params: { id: hit.id } });
    else if (hit.kind === "note") navigate({ to: "/notes", search: { q: hit.title } });
    else navigate({ to: "/lost-found", search: { q: hit.title } });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border bg-card/70 px-3 text-sm text-muted-foreground shadow-soft transition hover:border-primary/40 hover:bg-card"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search notices, notes, events…</span>
        <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search CampusConnect</DialogTitle>
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:py-2.5">
            <CommandInput value={q} onValueChange={setQ} placeholder="Search across notices, notes, events and Lost & Found…" />
            <CommandList className="max-h-[420px]">
              {dq.trim().length < 2 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Type at least 2 characters to search.</div>
              ) : (
                <CommandEmpty>{isFetching ? "Searching…" : "No results found."}</CommandEmpty>
              )}
              {GROUPS.map(({ kind, label, icon: Icon }) => {
                const hits = data.filter((h) => h.kind === kind);
                if (!hits.length) return null;
                return (
                  <CommandGroup key={kind} heading={label}>
                    {hits.map((h) => (
                      <CommandItem key={h.id} value={`${kind}-${h.id}`} onSelect={() => go(h)} className="gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{h.title}</span>
                          <span className="block truncate text-xs capitalize text-muted-foreground">{h.subtitle}</span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
