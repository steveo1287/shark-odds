"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SweatBoardItem } from "@/lib/types/ledger";
import { formatSyncAge } from "@/lib/utils/ledger";

function statusTone(status: SweatBoardItem["eventStatus"] | SweatBoardItem["result"]) {
  switch (status) {
    case "LIVE":
      return "brand" as const;
    case "FINAL":
    case "WIN":
      return "success" as const;
    case "LOSS":
      return "danger" as const;
    case "POSTPONED":
    case "CANCELED":
    case "DELAYED":
      return "premium" as const;
    default:
      return "muted" as const;
  }
}

type SweatBoardProps = {
  items: SweatBoardItem[];
};

export function SweatBoard({ items }: SweatBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <Card key={item.betId} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {item.league} {item.betType === "PARLAY" ? "Parlay" : "Straight"}
              </div>
              <div className="mt-2 font-display text-xl font-semibold text-white">
                {item.eventLabel ?? item.label}
              </div>
              <div className="mt-2 text-sm text-slate-400">{item.label}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(item.eventStatus)}>{item.eventStatus ?? "Pending"}</Badge>
              <Badge tone={statusTone(item.result)}>{item.result}</Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-line/80 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-white">
                {item.scoreboard ?? item.eventStateDetail ?? "Awaiting live scoring"}
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {formatSyncAge(item.lastUpdatedAt)}
              </div>
            </div>
            <div className="text-sm text-slate-400">
              {item.notes.join(" ")}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {item.legs.map((leg) => (
              <div
                key={leg.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-slate-950/45 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {leg.marketLabel}: {leg.selection}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {leg.eventLabel ?? "Event pending"}
                  </div>
                </div>
                <Badge tone={statusTone(leg.result)}>{leg.result}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
