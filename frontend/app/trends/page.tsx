import { SectionTitle } from "@/components/ui/section-title";
import { TrendsDashboard } from "@/components/trends/trends-dashboard";
import { getTrendDashboard, parseTrendFilters } from "@/services/trends/trends-service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrendsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const filters = parseTrendFilters(resolved);
  const data = await getTrendDashboard(filters);

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="Trends Builder"
        description="Run real stored-data trend queries across historical line movement, settled ledger results, and CLV context. Sparse history stays plainly labeled."
      />
      <TrendsDashboard data={data} />
    </div>
  );
}
