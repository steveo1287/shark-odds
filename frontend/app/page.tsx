import { BoardFilterBar } from "@/components/board/filter-bar";
import { GameCard } from "@/components/board/game-card";
import { LeagueSnapshot } from "@/components/board/league-snapshot";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";
import { StatCard } from "@/components/ui/stat-card";
import { parseBoardFilters, getBoardPageData } from "@/services/odds/odds-service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const filters = parseBoardFilters(resolved);
  const data = await getBoardPageData(filters);
  const gamesByLeague = data.games.reduce<Record<string, typeof data.games>>((groups, game) => {
    groups[game.leagueKey] = [...(groups[game.leagueKey] ?? []), game];
    return groups;
  }, {});
  const leagueOrder =
    filters.league === "ALL"
      ? ["NCAAB", "NBA", "MLB", "NHL", "NFL", "NCAAF"]
      : [filters.league];

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="Pregame market board"
        description={
          data.source === "live"
            ? "Live pregame pricing is now surfacing across basketball, baseball, hockey, and football sections. Basketball still gets the deepest scoreboard context, while the broader board rides the backend market feed."
            : "Fallback board data is active, but the product shell now reflects the Phase 1.5 multi-sport ledger core instead of the old mock tracker state."
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Games" value={`${data.summary.totalGames}`} note="Current filtered board" />
        <StatCard label="Props" value={`${data.summary.totalProps}`} note="Basic player prop coverage" />
        <StatCard label="Books" value={`${data.summary.totalSportsbooks}`} note="Major U.S. books" />
        <StatCard
          label="Core Sports"
          value="8"
          note="NBA, NCAAB, MLB, NHL, NFL, NCAAF, UFC, Boxing"
        />
        <StatCard
          label="Mode"
          value={data.source === "live" ? "Live odds" : filters.status === "live" ? "Live preview" : "Pregame"}
          note={data.sourceNote}
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
          <div className="text-xs uppercase tracking-[0.2em] text-sky-300">Phase 1.5 Live State</div>
          <div className="mt-3 font-display text-2xl font-semibold text-white">
            The live board is now multi-league, even though basketball still has the richest game context.
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Bets, performance, and active tracking run on a normalized event and participant model that is ready for team sports and combat sports. The board now exposes every league the live odds feed can support honestly today, while deeper matchup context continues to expand league by league.
          </p>
        </div>
        <div className="grid gap-2 rounded-2xl border border-line bg-slate-950/60 p-4 text-sm text-slate-300">
          <div>Live board feed: NBA, NCAAB, MLB, NHL, NFL, NCAAF</div>
          <div>Live event sync foundation: NBA, NCAAB, MLB, NHL, NFL, NCAAF</div>
          <div>Ledger-ready sports: NBA, NCAAB, MLB, NHL, NFL, NCAAF, UFC, Boxing</div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {data.snapshots.map((snapshot) => (
          <LeagueSnapshot key={snapshot.league.id} snapshot={snapshot} />
        ))}
      </div>

      {data.liveMessage ? (
        <EmptyState title="Live board coming next" description={data.liveMessage} />
      ) : null}

      {data.games.length ? (
        <div className="grid gap-6">
          {leagueOrder.map((leagueKey) =>
            gamesByLeague[leagueKey]?.length ? (
              <section key={leagueKey} className="grid gap-4">
                <SectionTitle
                  title={`${leagueKey} Slate`}
                  description={`${gamesByLeague[leagueKey].length} current games on the board.`}
                />
                <div className="grid gap-4 2xl:grid-cols-2">
                  {gamesByLeague[leagueKey].map((game) => (
                    <GameCard key={game.id} game={game} focusMarket={filters.market} />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      ) : (
        <EmptyState
          title="No games match these filters"
          description="Try widening the date, league, or sportsbook filter to bring more of the board back in."
        />
      )}
    </div>
  );
}
