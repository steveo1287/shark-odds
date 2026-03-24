"use client";

import { DataTable } from "@/components/ui/data-table";
import { formatAmericanOdds, formatLine, formatUnits } from "@/lib/formatters/odds";
import type { LedgerBetView } from "@/lib/types/ledger";
import { formatLedgerMarketType } from "@/lib/utils/ledger";

type BetTableProps = {
  bets: LedgerBetView[];
  onEdit: (bet: LedgerBetView) => void;
  onArchive: (bet: LedgerBetView) => void;
  onDelete: (bet: LedgerBetView) => void;
};

export function BetTable({ bets, onEdit, onArchive, onDelete }: BetTableProps) {
  return (
    <DataTable
      columns={[
        "Placed",
        "Sport",
        "Event",
        "Market",
        "Selection",
        "Line",
        "Odds",
        "Book",
        "Stake",
        "Result",
        "CLV",
        "Actions"
      ]}
      rows={bets.map((bet) => [
        bet.placedAt.slice(0, 16).replace("T", " "),
        `${bet.league}`,
        bet.eventLabel ?? "--",
        bet.betType === "PARLAY" ? `${bet.legs.length}-Leg Parlay` : formatLedgerMarketType(bet.marketType),
        bet.selection,
        bet.line === null ? "--" : formatLine(bet.line),
        formatAmericanOdds(bet.oddsAmerican),
        bet.sportsbook?.name ?? "--",
        formatUnits(bet.riskAmount).replace(/^\+/, ""),
        bet.result,
        typeof bet.clvPercentage === "number" ? `${bet.clvPercentage > 0 ? "+" : ""}${bet.clvPercentage.toFixed(2)}%` : "--",
        <div key={bet.id} className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onEdit(bet)} className="text-sky-300">
            Edit
          </button>
          <button type="button" onClick={() => onArchive(bet)} className="text-amber-300">
            Archive
          </button>
          <button type="button" onClick={() => onDelete(bet)} className="text-rose-300">
            Delete
          </button>
        </div>
      ])}
    />
  );
}
