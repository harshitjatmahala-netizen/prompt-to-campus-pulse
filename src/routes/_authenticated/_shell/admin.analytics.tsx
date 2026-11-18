import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/admin/analytics")({
  head: () => pageHead("Analytics", "CampusConnect usage at a glance."),
  component: AnalyticsPage,
});

const TABLES = [
  ["profiles", "Users"], ["notices", "Notices"], ["notes", "Notes"], ["assignments", "Assignments"],
  ["events", "Events"], ["event_registrations", "Event registrations"], ["lost_found", "Lost & Found items"], ["claim_requests", "Claim requests"],
] as const;

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => Promise.all(TABLES.map(async ([t, label]) => {
      const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
      return { label, count: count ?? 0 };
    })),
  });
  return (
    <>
      <PageHeader icon={<BarChart3 />} title="Analytics" description="How your campus is using CampusConnect." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />) : data.map((d) => (
          <div key={d.label} className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">{d.label}</p>
            <p className="mt-1 font-display text-4xl font-bold text-foreground">{d.count}</p>
          </div>
        ))}
      </div>
    </>
  );
}
