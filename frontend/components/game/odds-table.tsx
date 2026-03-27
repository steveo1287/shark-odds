import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { americanToImplied, stripVig } from "@/lib/odds/index";
import type { MatchupDetailView } from "@/lib/types/domain";
import { formatLongDate } from "@/lib/formatters/date";

type OddsTableProps = {
  detail: MatchupDetailView;
};

function isMissingMarket(value: string) {
  return !value || value === "Pending" || value === "No market" || value === "–";
}

function formatCell(value: string, bestHint: string | null) {
  if (isMissingMarket(value)) {
    return <span className="text-slate-500">–</span>;
  }

  const highlighted = bestHint && value.includes(bestHint);
  const prices = Array.from(value.matchAll(/([+-]\d{2,4})/g))
    .map((match) => Number(match[1]))
    .filter((price) => Number.isFinite(price));
  const noVig =
    prices.length >= 2
      ? stripVig(
          prices
            .map((price) => americanToImplied(price))
            .filter((probability): probability is number => typeof probability === "number")
        )
      : [];

  return (
    <div className="flex flex-col gap-1">
      <span className={highlighted ? "font-medium text-white" : "text-slate-300"}>{value}</span>
      {highlighted ? <span className="text-[11px] uppercase tracking-[0.18em] text-sky-300">Best available</span> : null}
      {noVig.length >= 2 ? (
        <span className="text-[11px] text-slate-500">
          No-vig {`${(noVig[0] * 100).toFixed(1)}% / ${(noVig[1] * 100).toFixed(1)}%`}
        </span>
      ) : null}
    </div>
  );
}

export function OddsTable({ detail }: OddsTableProps) {
  const openingPoint = detail.lineMovement[0] ?? null;
  const currentPoint = detail.lineMovement[detail.lineMovement.length - 1] ?? null;
  const spreadHint = detail.oddsSummary?.bestSpread ?? null;
  const moneylineHint = detail.oddsSummary?.bestMoneyline ?? null;
  const totalHint = detail.oddsSummary?.bestTotal?.replace("O/U ", "") ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <DataTable
        columns={["Sportsbook", "Spread", "Moneyline", "Total"]}
        rows={detail.books.map((row) => [
          row.sportsbook.name,
          formatCell(row.spread, spreadHint),
          formatCell(row.moneyline, moneylineHint),
          formatCell(row.total, totalHint),
        ])}
      />

      <Card className="p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          {detail.lineMovement.length ? "Line Movement History" : "Market Range"}
        </div>
        <div className="mt-4 grid gap-3">
          {openingPoint && currentPoint ? (
            <div className="rounded-2xl border border-line bg-slate-950/65 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Opening vs Current</div>
              <div className="mt-2 text-sm text-slate-300">
                Spread {openingPoint.spreadLine ?? "–"} to {currentPoint.spreadLine ?? "–"} | Total {openingPoint.totalLine ?? "–"} to {currentPoint.totalLine ?? "–"}
              </div>
            </div>
          ) : null}
          {detail.lineMovement.length
            ? detail.lineMovement.map((point) => (
                <div
                  key={point.capturedAt}
                  className="rounded-2xl border border-line bg-slate-950/65 px-4 py-3"
                >
                  <div className="text-xs text-slate-500">{formatLongDate(point.capturedAt)}</div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Spread {point.spreadLine}</span>
                    <span>Total {point.totalLine}</span>
                  </div>
                </div>
              ))
            : detail.marketRanges?.map((range) => (
                <div
                  key={range.label}
                  className="rounded-2xl border border-line bg-slate-950/65 px-4 py-3"
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{range.label}</div>
                  <div className="mt-2 text-sm text-slate-300">{range.value}</div>
                </div>
              ))}
          {!detail.lineMovement.length && !detail.marketRanges?.length ? (
            <div className="rounded-2xl border border-line bg-slate-950/65 px-4 py-3 text-sm text-slate-400">
              Live range analytics and historical snapshots are not available for this matchup yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
