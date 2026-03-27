import Link from "next/link";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { getATSTrend, getOUTrend, getRecentForm } from "@/lib/trends/engine";
import type { TrendFilters } from "@/lib/types/domain";
import { trendFiltersSchema } from "@/lib/validation/filters";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: keyof TrendFilters
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: Record<string, string | string[] | undefined>) {
  return trendFiltersSchema.parse({
    sport: readValue(searchParams, "sport"),
    league: readValue(searchParams, "league"),
    market: readValue(searchParams, "market"),
    sportsbook: readValue(searchParams, "sportsbook"),
    side: readValue(searchParams, "side"),
    subject: readValue(searchParams, "subject"),
    team: readValue(searchParams, "team"),
    player: readValue(searchParams, "player"),
    fighter: readValue(searchParams, "fighter"),
    opponent: readValue(searchParams, "opponent"),
    window: readValue(searchParams, "window"),
    sample: readValue(searchParams, "sample")
  });
}

function toneClass(confidence: string) {
  if (confidence === "strong") return "border-emerald-400/25 bg-emerald-500/8";
  if (confidence === "moderate") return "border-sky-400/25 bg-sky-500/8";
  if (confidence === "weak") return "border-amber-300/25 bg-amber-400/8";
  return "border-line bg-slate-950/65";
}

function formatMetric(label: string, value: number | null, suffix = "%") {
  return value === null ? `${label}: Unavailable` : `${label}: ${value.toFixed(1)}${suffix}`;
}

export default async function TrendsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const filters = buildFilters(resolved);
  const subject = filters.team || filters.subject || filters.player || filters.fighter || "League";

  const [ats, ou, recentForm] = await Promise.all([
    getATSTrend(filters),
    getOUTrend(filters),
    getRecentForm(subject, filters.sport, filters)
  ]);

  const cards = [ats.value, ou.value, recentForm.value];
  const todayMatches = Array.from(
    new Map(cards.flatMap((card) => card.todayMatches).map((match) => [`${match.id}:${match.href}`, match])).values()
  );
  const sampleWarning = cards.find((card) => card.warning)?.warning ?? null;

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="Trends Center"
        description="Real historical trend cards built from stored odds, official event results, and the current event catalog."
      />

      <Card className="p-5">
        <form action="/trends" method="get" className="grid gap-3 md:grid-cols-5">
          <select name="sport" defaultValue={filters.sport} className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white">
            <option value="ALL">All sports</option>
            <option value="BASKETBALL">Basketball</option>
            <option value="BASEBALL">Baseball</option>
            <option value="HOCKEY">Hockey</option>
            <option value="FOOTBALL">Football</option>
            <option value="MMA">MMA</option>
            <option value="BOXING">Boxing</option>
          </select>
          <input
            name="team"
            defaultValue={filters.team}
            placeholder="Team / subject"
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <select name="window" defaultValue={filters.window} className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white">
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="365d">365d</option>
            <option value="all">All history</option>
          </select>
          <select name="sample" defaultValue={String(filters.sample)} className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white">
            <option value="3">3+</option>
            <option value="5">5+</option>
            <option value="10">10+</option>
            <option value="20">20+</option>
          </select>
          <button type="submit" className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-200">
            Run Trends
          </button>
        </form>
      </Card>

      {sampleWarning ? (
        <Card className="border-amber-300/25 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100">
          {sampleWarning}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id} className={`p-5 ${toneClass(card.confidence)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.title}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.confidence}</div>
            </div>
            <div className="mt-3 font-display text-3xl font-semibold text-white">
              {card.hitRate !== null ? `${card.hitRate.toFixed(1)}%` : card.sampleSize ? `${card.sampleSize}` : "No sample"}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <div>{formatMetric("Hit rate", card.hitRate)}</div>
              <div>{formatMetric("ROI", card.roi)}</div>
              <div>Sample: {card.sampleSize}</div>
              <div>Record: {card.wins}-{card.losses}{card.pushes ? `-${card.pushes}` : ""}</div>
            </div>
            <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{card.dateRange}</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              {card.warning ?? card.contextLabel}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Today's Matching Games</div>
        <div className="mt-2 font-display text-2xl font-semibold text-white">
          {todayMatches.length ? `${todayMatches.length} game${todayMatches.length === 1 ? "" : "s"} match today` : "No games match today"}
        </div>
        <div className="mt-3 grid gap-3">
          {todayMatches.length ? (
            todayMatches.map((match) => (
              <Link key={`${match.id}-${match.href}`} href={match.href} className="rounded-2xl border border-line bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-sky-300">{match.tag}</div>
                    <div className="mt-2 font-semibold text-white">{match.matchup}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {match.league} | {new Date(match.startTime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                  <div className="text-sm text-sky-300">Open matchup</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-slate-950/65 p-5 text-sm text-slate-400">
              No games in today&apos;s Event catalog match the current trend filters. SharkEdge is showing the real slate instead of inventing matches.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
