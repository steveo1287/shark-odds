import Link from "next/link";

import { BoardFilterBar } from "@/components/board/filter-bar";
import { LeagueSnapshot } from "@/components/board/league-snapshot";
import { SportSection } from "@/components/board/sport-section";
import { SportSupportGrid } from "@/components/board/sport-support-grid";
import { TopPlaysPanel } from "@/components/board/top-plays-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";
import { getATSTrend, getFavoriteROI, getOUTrend } from "@/lib/trends/engine";
import { formatGameDateTime } from "@/lib/formatters/date";
import {
  getBoardPageData,
  getTopPlayCards,
  parseBoardFilters
} from "@/services/odds/odds-service";

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

function FeaturedBoardRail({
  games
}: {
  games: Awaited<ReturnType<typeof getBoardPageData>>["games"];
}) {
  const featuredGames = games.slice(0, 4);

  if (!featuredGames.length) {
    return (
      <Card className="p-5 text-sm leading-6 text-slate-400">
        No full board rows are active in this exact window. SharkEdge keeps the league map and
        matchup drill-ins visible instead of padding the homepage with fake board depth.
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {featuredGames.map((game) => (
        <Link
          key={game.id}
          href={game.detailHref ?? `/game/${game.id}`}
          className="rounded-2xl border border-line bg-slate-950/70 p-4 transition hover:border-sky-400/30 hover:bg-slate-900/80"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {game.leagueKey} | {formatGameDateTime(game.startTime)}
              </div>
              <div className="mt-2 font-display text-xl text-white">
                {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-sky-300">{game.status}</div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-2xl border border-line/70 bg-slate-900/75 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">Spread</div>
              <div className="mt-2 text-sm font-medium text-white">{game.spread.lineLabel}</div>
              <div className="mt-1 text-slate-400">{game.spread.bestBook}</div>
            </div>
            <div className="rounded-2xl border border-line/70 bg-slate-900/75 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">ML</div>
              <div className="mt-2 text-sm font-medium text-white">{game.moneyline.lineLabel}</div>
              <div className="mt-1 text-slate-400">{game.moneyline.bestBook}</div>
            </div>
            <div className="rounded-2xl border border-line/70 bg-slate-900/75 px-3 py-3">
              <div className="uppercase tracking-[0.18em] text-slate-500">Total</div>
              <div className="mt-2 text-sm font-medium text-white">{game.total.lineLabel}</div>
              <div className="mt-1 text-slate-400">{game.total.bestBook}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-slate-400">{game.bestBookCount} books compared</div>
            <div className="text-sky-300">Open matchup</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TopSignalRail({
  topPlays,
  edgePulseCards,
  edgePulseMatches,
  games
}: {
  topPlays: Awaited<ReturnType<typeof getTopPlayCards>>;
  edgePulseCards: Array<Awaited<ReturnType<typeof getATSTrend>>["value"]>;
  edgePulseMatches: Array<Awaited<ReturnType<typeof getATSTrend>>["value"]["todayMatches"][number]>;
  games: Awaited<ReturnType<typeof getBoardPageData>>["games"];
}) {
  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-sky-300">Top Signals</div>
            <div className="mt-2 font-display text-2xl font-semibold text-white">
              {topPlays.length ? `${topPlays.length} actionable props` : "No forced play"}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Only real signals or board-watch context belong here. If the market is flat, SharkEdge
              says so.
            </div>
          </div>
          <Link href="/props" className="text-sm text-sky-300">
            Full props
          </Link>
        </div>

        <div className="mt-4">
          {topPlays.length ? (
            <TopPlaysPanel plays={topPlays.slice(0, 3)} />
          ) : games.length ? (
            <div className="grid gap-3">
              {games.slice(0, 3).map((game) => (
                <Link
                  key={game.id}
                  href={game.detailHref ?? `/game/${game.id}`}
                  className="rounded-2xl border border-line bg-slate-950/70 px-4 py-4 transition hover:border-sky-400/30 hover:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Board watch
                      </div>
                      <div className="mt-2 font-medium text-white">
                        {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                      </div>
                    </div>
                    <div className="text-sm text-sky-300">{game.edgeScore.label}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-400">
                    Spread {game.spread.lineLabel} | Total {game.total.lineLabel}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-slate-950/70 px-4 py-4 text-sm leading-6 text-slate-400">
              No qualifying signal or board-watch event is active right now.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-sky-300">Trend + Movement</div>
            <div className="mt-2 font-display text-2xl font-semibold text-white">
              Real stored context
            </div>
          </div>
          <Link href="/trends" className="text-sm text-sky-300">
            Open trends
          </Link>
        </div>

        <div className="mt-4 grid gap-3">
          {edgePulseCards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-line bg-slate-950/70 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {card.title}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {card.confidence}
                </div>
              </div>
              <div className="mt-2 text-lg font-semibold text-white">{formatTrendHeadline(card)}</div>
              <div className="mt-2 text-sm text-slate-400">
                Hit {formatTrendMetric(card.hitRate)} | ROI {formatTrendMetric(card.roi)} | Sample{" "}
                {card.sampleSize}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                {card.warning ?? card.contextLabel}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-line bg-slate-950/70 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Today matches this read
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {edgePulseMatches.length
                ? `${edgePulseMatches.length} matchup${edgePulseMatches.length === 1 ? "" : "s"}`
                : "No matching games right now"}
            </div>
            <div className="mt-3 grid gap-2">
              {edgePulseMatches.length ? (
                edgePulseMatches.slice(0, 3).map((match) => (
                  <Link
                    key={`${match.id}-${match.href}`}
                    href={match.href}
                    className="rounded-2xl border border-line/70 bg-slate-900/80 px-3 py-3 text-sm transition hover:border-sky-400/30"
                  >
                    <div className="font-medium text-white">{match.matchup}</div>
                    <div className="mt-1 text-slate-400">
                      {match.league} | {match.tag}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm leading-6 text-slate-400">
                  Current event filters do not surface a qualifying matchup in this window.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
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
        title="Daily board"
        description="Compact live board coverage, real signals, league-aware news, and honest offseason states. SharkEdge should feel worth opening every day, not like a support checklist."
      />

      <BoardFilterBar
        leagues={data.leagues}
        sportsbooks={data.sportsbooks}
        dates={data.availableDates}
        defaults={filters}
      />

      <Card className="grid gap-4 p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-sky-300">
            {data.source === "live" ? "Live intelligence board" : "Coverage-first board view"}
          </div>
          <div className="mt-3 font-display text-3xl font-semibold text-white">
            Scan the slate, catch the signal, skip the clutter.
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Live board rows stay tied to real odds support. Offseason leagues pivot into useful
            context instead of stale scores, and weaker sports stay visible without pretending they
            have full board depth.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-slate-950/60 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Board rows</div>
            <div className="mt-2 text-2xl font-semibold text-white">{data.summary.totalGames}</div>
            <div className="mt-1 text-xs text-slate-400">Rendered current rows and score-led cards.</div>
          </div>
          <div className="rounded-2xl border border-line bg-slate-950/60 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Live sports</div>
            <div className="mt-2 text-2xl font-semibold text-white">{liveCount}</div>
            <div className="mt-1 text-xs text-slate-400">Real active board support right now.</div>
          </div>
          <div className="rounded-2xl border border-line bg-slate-950/60 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Partial / soon</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {partialCount} / {comingSoonCount}
            </div>
            <div className="mt-1 text-xs text-slate-400">Visible without fake board depth.</div>
          </div>
          <div className="rounded-2xl border border-line bg-slate-950/60 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Board state</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {data.source === "live" ? "Current feed connected" : "Fallback coverage mode"}
            </div>
            <div className="mt-1 text-xs text-slate-400">{data.sourceNote}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="grid gap-4">
          <SectionTitle
            title="Featured matchups"
            description="Odds-first cards built for scanning the current slate fast."
          />
          <FeaturedBoardRail games={data.games} />
        </section>

        <section className="grid gap-4">
          <SectionTitle
            title="Signal rail"
            description="One rail for top signals and stored trend context instead of spreading the same information across three modules."
          />
          <TopSignalRail
            topPlays={topPlays}
            edgePulseCards={edgePulseCards}
            edgePulseMatches={edgePulseMatches}
            games={data.games}
          />
        </section>
      </div>

      {data.snapshots.length ? (
        <section className="grid gap-4">
          <SectionTitle
            title="League pulse"
            description="Current matchups when the league is active, offseason context when it is not, and free headline rails where they exist."
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {data.snapshots.map((snapshot) => (
              <LeagueSnapshot key={snapshot.league.id} snapshot={snapshot} />
            ))}
          </div>
        </section>
      ) : null}

      {data.liveMessage ? (
        <EmptyState title="Limited live window" description={data.liveMessage} />
      ) : null}

      <section className="grid gap-4">
        <SectionTitle
          title="Coverage map"
          description="Keep support-state visibility lower on the page. Useful, honest, and out of the way."
        />
        <SportSupportGrid sections={data.sportSections} />
      </section>

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
