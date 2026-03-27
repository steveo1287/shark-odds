import Link from "next/link";

import { BoardFilterBar } from "@/components/board/filter-bar";
import { LeagueSnapshot } from "@/components/board/league-snapshot";
import { SportSection } from "@/components/board/sport-section";
import { SportSupportGrid } from "@/components/board/sport-support-grid";
import { TopPlaysPanel } from "@/components/board/top-plays-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";
import { StatCard } from "@/components/ui/stat-card";
import { getATSTrend, getFavoriteROI, getOUTrend } from "@/lib/trends/engine";
import {
  getBoardPageData,
  getTopPlayCards,
  parseBoardFilters
} from "@/services/odds/odds-service";

function BoardWatchFallback({
  games
}: {
  games: Awaited<ReturnType<typeof getBoardPageData>>["games"];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {games.slice(0, 4).map((game) => (
        <Card key={game.id} className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{game.leagueKey}</div>
          <div className="mt-2 font-display text-2xl font-semibold text-white">
            {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            Current board watch only. No forced play language.
          </div>
          <div className="mt-4 grid gap-2 rounded-2xl border border-line bg-slate-950/55 p-4 text-sm">
            <div className="text-white">
              Spread: {game.spread.lineLabel} at {game.spread.bestBook}
            </div>
            <div className="text-white">
              ML: {game.moneyline.lineLabel} at {game.moneyline.bestBook}
            </div>
            <div className="text-white">
              Total: {game.total.lineLabel} at {game.total.bestBook}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function formatTrendMetric(value: number | null, suffix = "%") {
  return typeof value === "number" ? `${value.toFixed(1)}${suffix}` : "Unavailable";
}

function formatTrendHeadline(card: Awaited<ReturnType<typeof getATSTrend>>["value"]) {
  if (typeof card.roi === "number") {
    return `ROI ${card.roi.toFixed(1)}%`;
  }

  if (typeof card.hitRate === "number") {
    return `${card.hitRate.toFixed(1)}% hit`;
  }

  return card.sampleSize ? `${card.sampleSize} rows` : "No sample yet";
}

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const filters = parseBoardFilters(resolved);
  const [data, topPlays, atsTrend, ouTrend, favoriteTrend] = await Promise.all([
    getBoardPageData(filters),
    getTopPlayCards(8),
    getATSTrend({ window: "90d", sample: 10 }),
    getOUTrend({ window: "90d", sample: 10 }),
    getFavoriteROI({ window: "90d", sample: 10 })
  ]);
  const liveCount = data.sportSections.filter((section) => section.status === "LIVE").length;
  const partialCount = data.sportSections.filter((section) => section.status === "PARTIAL").length;
  const comingSoonCount = data.sportSections.filter((section) => section.status === "COMING_SOON").length;
  const livePropSportCount = data.sportSections.filter(
    (section) => section.propsStatus === "LIVE"
  ).length;
  const staleCount = data.sportSections.filter((section) => section.stale).length;
  const coverageLabel = data.source === "live" ? "Live board" : "Coverage map";
  const edgePulseCards = [atsTrend.value, ouTrend.value, favoriteTrend.value];
  const edgePulseMatches = Array.from(
    new Map(
      edgePulseCards
        .flatMap((card) => card.todayMatches)
        .map((match) => [`${match.id}:${match.href}`, match] as const)
    ).values()
  ).slice(0, 4);

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="Pregame market board"
        description={
          data.source === "live"
            ? "Every target sport stays visible, but only sports with real board support render live rows. Partial and pending leagues stay in view with explicit provider states."
            : "The support map stays visible even when the current odds feed is unavailable, so SharkEdge never hides unsupported sports behind fake empty board states."
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={data.source === "live" ? "Board Rows" : "Tracked Events"}
          value={`${data.summary.totalGames}`}
          note={
            data.source === "live"
              ? "Current rows rendered from the active board feed"
              : "Score/state visibility only while current odds are limited"
          }
        />
        <StatCard
          label="Board Source"
          value={coverageLabel}
          note={data.source === "live" ? "Current odds and score state connected" : "Support map and fallback score state only"}
        />
        <StatCard
          label="LIVE Sports"
          value={`${liveCount}`}
          note="Real score/state adapters and matchup coverage"
        />
        <StatCard
          label="Partial / Soon"
          value={`${partialCount} / ${comingSoonCount}`}
          note="Visible in-product without fake live board depth"
        />
        <StatCard
          label="Props Live"
          value={`${livePropSportCount}`}
          note={staleCount ? `${staleCount} section${staleCount === 1 ? "" : "s"} flagged stale` : "Fresh provider state in the current window"}
        />
      </div>

      <BoardFilterBar
        leagues={data.leagues}
        sportsbooks={data.sportsbooks}
        dates={data.availableDates}
        defaults={filters}
      />

      <Card className="grid gap-3 p-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-sky-300">
            {data.source === "live" ? "Board Live" : "Coverage View"}
          </div>
          <div className="mt-3 font-display text-2xl font-semibold text-white">
            Multi-sport market scanning with honest board depth by league.
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Basketball remains the deepest live prop coverage right now, while the broader board, matchup context, and historical foundation keep every target sport visible without pretending they all have the same adapter depth.
          </p>
        </div>
        <div className="grid gap-2 rounded-2xl border border-line bg-slate-950/60 p-4 text-sm text-slate-300">
          <div>Live now: NBA, NCAAB, MLB, NHL, NFL, NCAAF</div>
          <div>Partial: UFC</div>
          <div>Coming soon: Boxing</div>
          <div>{data.source === "live" ? "Current board feed connected" : "Current board feed limited"}</div>
          <div>{data.sourceNote}</div>
        </div>
      </Card>

      <SportSupportGrid sections={data.sportSections} />

      <section className="grid gap-4">
        <SectionTitle
          title="Top Plays"
          description="Only real live prop signals show up here. If the current feed does not surface a real edge, SharkEdge leaves this section blank instead of manufacturing a play."
        />
        {topPlays.length ? (
          <TopPlaysPanel plays={topPlays} />
        ) : data.games.length ? (
          <BoardWatchFallback games={data.games} />
        ) : (
          <Card className="p-5 text-sm leading-7 text-slate-400">
            Top Plays is live only when the current prop mesh returns real positive market-EV spots. With no qualifying edge right now, SharkEdge falls back to matchup watch cards instead of inventing a play.
          </Card>
        )}
      </section>

      <section className="grid gap-4">
        <SectionTitle
          title="Edge Pulse"
          description="Real historical reads from stored results and odds history. SharkEdge shows sample, ROI, and today-match context without forcing a play."
        />
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {edgePulseCards.map((card) => (
              <Card key={card.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {card.title}
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {card.confidence}
                  </div>
                </div>
                <div className="mt-3 font-display text-2xl font-semibold text-white">
                  {formatTrendHeadline(card)}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <div>Hit rate: {formatTrendMetric(card.hitRate)}</div>
                  <div>ROI: {formatTrendMetric(card.roi)}</div>
                  <div>Sample: {card.sampleSize}</div>
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {card.dateRange}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  {card.warning ?? card.contextLabel}
                </div>
                <Link href="/trends" className="mt-4 inline-flex text-sm text-sky-300">
                  Open Trends
                </Link>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Today Matches The Trend
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-white">
                  {edgePulseMatches.length
                    ? `${edgePulseMatches.length} live slate matches`
                    : "No matching games right now"}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  This stays tied to the current event catalog and stored trend filters. If there are no matches, SharkEdge says so.
                </div>
              </div>
              <Link
                href="/trends"
                className="w-fit rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300"
              >
                Full Trends Center
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {edgePulseMatches.length ? (
                edgePulseMatches.map((match) => (
                  <Link
                    key={`${match.id}-${match.href}`}
                    href={match.href}
                    className="rounded-2xl border border-line bg-slate-950/70 p-4 transition hover:border-sky-400/30 hover:bg-slate-900/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-sky-300">
                          {match.tag}
                        </div>
                        <div className="mt-2 font-semibold text-white">{match.matchup}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {match.league} |{" "}
                          {new Date(match.startTime).toLocaleString("en-US", {
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
                <div className="rounded-2xl border border-dashed border-line bg-slate-950/65 p-5 text-sm leading-6 text-slate-400">
                  No current games match the strongest stored ATS, totals, or favorite ROI reads in this window. SharkEdge keeps the section active without inventing a slate edge.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {data.snapshots.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.snapshots.map((snapshot) => (
            <LeagueSnapshot key={snapshot.league.id} snapshot={snapshot} />
          ))}
        </div>
      ) : null}

      {data.liveMessage ? (
        <EmptyState title="Limited live window" description={data.liveMessage} />
      ) : null}

      {data.sportSections.length ? (
        <div className="grid gap-6">
          {data.sportSections.map((section) => (
            <SportSection key={section.leagueKey} section={section} focusMarket={filters.market} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No sports match this filter"
          description="Widen the league or date filter to bring the full support map back into view."
        />
      )}
    </div>
  );
}
