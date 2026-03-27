import Link from "next/link";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import type { LeagueSnapshotView } from "@/lib/types/domain";
import { formatLongDate } from "@/lib/formatters/date";

type LeagueSnapshotProps = {
  snapshot: LeagueSnapshotView;
};

export function LeagueSnapshot({ snapshot }: LeagueSnapshotProps) {
  const isMlb = snapshot.league.key === "MLB";
  const isFootballOffseason =
    (snapshot.league.key === "NFL" || snapshot.league.key === "NCAAF") &&
    snapshot.seasonState === "OFFSEASON";

  return (
    <Card className="p-5">
      <SectionTitle
        title={`${snapshot.league.key} Pulse`}
        description={
          snapshot.note ??
          "Standings and recent completed results pulled from the live stats provider when available."
        }
      />

      {snapshot.sourceLabel ? (
        <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
          {snapshot.sourceLabel}
        </div>
      ) : null}

      {isFootballOffseason ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { title: "Draft", body: "Draft cycle tracking stays here during the offseason window." },
            { title: "Free Agency", body: "Roster movement replaces stale game cards until the next slate is real." },
            { title: "News", body: "If no provider feed is connected for offseason headlines, SharkEdge keeps this state clean instead of replaying old scores." }
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-slate-950/65 px-4 py-4"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.title}</div>
              <div className="mt-3 text-sm leading-6 text-slate-300">{item.body}</div>
            </div>
          ))}
        </div>
      ) : isMlb && snapshot.featuredGames?.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {snapshot.featuredGames.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="rounded-2xl border border-line bg-slate-950/65 px-4 py-4 transition hover:border-sky-400/30 hover:bg-slate-900/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatLongDate(game.startTime)}
                  </div>
                  <div className="mt-2 font-display text-xl text-white">
                    {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                  </div>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.18em] text-sky-300">
                  {game.status}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-300">
                {typeof game.awayScore === "number" || typeof game.homeScore === "number"
                  ? `${game.awayTeam.abbreviation} ${game.awayScore ?? "–"} | ${game.homeTeam.abbreviation} ${game.homeScore ?? "–"}`
                  : game.stateDetail ?? "Open matchup for live stats"}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {[game.awayTeam, game.homeTeam].map((team) => {
                  const standing = snapshot.standings.find((row) => row.team.id === team.id);
                  return (
                    <div
                      key={team.id}
                      className="rounded-2xl border border-line/70 bg-slate-900/70 px-3 py-3"
                    >
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {team.abbreviation}
                      </div>
                      <div className="mt-2 text-sm text-white">
                        {standing?.record ?? "Open matchup"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {standing ? `${standing.streak} | ${standing.netRating > 0 ? "+" : ""}${standing.netRating.toFixed(1)}` : "Team and player detail live on matchup page"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      ) : (
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-3">
          {snapshot.standings.slice(0, 4).map((row) => (
            <div
              key={row.team.id}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-2xl border border-line bg-slate-950/65 px-4 py-3"
            >
              <div className="font-display text-xl text-slate-300">{row.rank}</div>
              <div>
                <div className="font-medium text-white">{row.team.name}</div>
                <div className="text-sm text-slate-400">{row.record}</div>
              </div>
              <div className="text-sm text-slate-400">{row.streak}</div>
              <div className="text-sm font-medium text-emerald-300">
                {row.netRating > 0 ? "+" : ""}
                {row.netRating.toFixed(1)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          {snapshot.previousGames.map((game) => (
            <div
              key={game.id}
              className="rounded-2xl border border-line bg-slate-950/65 px-4 py-3"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {formatLongDate(game.playedAt)}
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <div className="text-slate-300">
                  {game.awayTeam.abbreviation} <span className="text-white">{game.awayScore}</span>
                </div>
                <div className="text-slate-300">
                  {game.homeTeam.abbreviation} <span className="text-white">{game.homeScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </Card>
  );
}
