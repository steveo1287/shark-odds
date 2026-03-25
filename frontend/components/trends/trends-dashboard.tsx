import Link from "next/link";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { SetupStateCard } from "@/components/ui/setup-state-card";
import { StatCard } from "@/components/ui/stat-card";
import type { TrendDashboardView } from "@/lib/types/domain";
import { BOARD_SPORTS } from "@/lib/config/board-sports";

type TrendsDashboardProps = {
  data: TrendDashboardView;
};

export function TrendsDashboard({ data }: TrendsDashboardProps) {
  if (data.setup) {
    return <SetupStateCard title={data.setup.title} detail={data.setup.detail} steps={data.setup.steps} />;
  }

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            name="sport"
            defaultValue={data.filters.sport}
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="ALL">All sports</option>
            <option value="BASKETBALL">Basketball</option>
            <option value="BASEBALL">Baseball</option>
            <option value="HOCKEY">Hockey</option>
            <option value="FOOTBALL">Football</option>
            <option value="MMA">MMA</option>
            <option value="BOXING">Boxing</option>
          </select>
          <select
            name="league"
            defaultValue={data.filters.league}
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="ALL">All leagues</option>
            {BOARD_SPORTS.map((sport) => (
              <option key={sport.leagueKey} value={sport.leagueKey}>
                {sport.leagueLabel}
              </option>
            ))}
          </select>
          <select
            name="market"
            defaultValue={data.filters.market}
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="ALL">All markets</option>
            <option value="spread">Spread</option>
            <option value="moneyline">Moneyline</option>
            <option value="total">Total</option>
            <option value="player_points">Player Points</option>
            <option value="player_rebounds">Player Rebounds</option>
            <option value="player_assists">Player Assists</option>
            <option value="player_threes">Player Threes</option>
            <option value="fight_winner">Fight Winner</option>
            <option value="method_of_victory">Method of Victory</option>
            <option value="round_total">Round Total</option>
            <option value="round_winner">Round Winner</option>
          </select>
          <select
            name="sportsbook"
            defaultValue={data.filters.sportsbook}
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="all">All books</option>
            <option value="DraftKings">DraftKings</option>
            <option value="FanDuel">FanDuel</option>
            <option value="BetMGM">BetMGM</option>
            <option value="Caesars">Caesars</option>
          </select>
          <select
            name="side"
            defaultValue={data.filters.side}
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="ALL">All sides</option>
            <option value="HOME">Home</option>
            <option value="AWAY">Away</option>
            <option value="OVER">Over</option>
            <option value="UNDER">Under</option>
            <option value="FAVORITE">Favorite</option>
            <option value="UNDERDOG">Underdog</option>
            <option value="COMPETITOR_A">Competitor A</option>
            <option value="COMPETITOR_B">Competitor B</option>
          </select>
          <input
            name="subject"
            defaultValue={data.filters.subject}
            placeholder="Subject"
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <input
            name="team"
            defaultValue={data.filters.team}
            placeholder="Team"
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <input
            name="player"
            defaultValue={data.filters.player}
            placeholder="Player"
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <input
            name="fighter"
            defaultValue={data.filters.fighter}
            placeholder="Fighter"
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <input
            name="opponent"
            defaultValue={data.filters.opponent}
            placeholder="Opponent"
            className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="window"
              defaultValue={data.filters.window}
              className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
            >
              <option value="30d">30d</option>
              <option value="90d">90d</option>
              <option value="365d">365d</option>
              <option value="all">All history</option>
            </select>
            <select
              name="sample"
              defaultValue={String(data.filters.sample)}
              className="rounded-2xl border border-line bg-slate-950 px-4 py-3 text-sm text-white"
            >
              <option value="3">3+</option>
              <option value="5">5+</option>
              <option value="10">10+</option>
              <option value="20">20+</option>
            </select>
          </div>
          <div className="flex items-center">
            <button
              type="submit"
              className="w-full rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-300"
            >
              Run
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-sky-300">Real Data</div>
        <div className="mt-3 font-display text-3xl font-semibold text-white">
          Historical movement, CLV, and ledger-backed trend queries
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{data.sourceNote}</p>
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-slate-950/65 p-4 text-sm text-slate-300">
          Active query: <span className="text-white">{data.querySummary}</span>
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-slate-950/65 p-4 text-sm text-slate-300">
          Saved trend label: <span className="text-white">{data.savedTrendName}</span>
        </div>
      </Card>

      {data.sampleNote ? (
        <Card className="border-amber-300/25 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100">
          {data.sampleNote}
        </Card>
      ) : null}

      {data.cards.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.cards.map((card) => (
            <Card key={card.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {card.title}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {card.sampleSize} sample
                </div>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-white">{card.value}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                <span>{card.dateRange}</span>
                {card.hitRate ? <span>Hit {card.hitRate}</span> : null}
                {card.roi ? <span>ROI {card.roi}</span> : null}
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-400">{card.note}</div>
              {card.href ? (
                <Link href={card.href} className="mt-4 inline-flex text-sm text-sky-300">
                  Open context
                </Link>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5 text-sm text-slate-400">
          No real trend cards match this query yet. SharkEdge is keeping the surface honest instead of rendering preview cards.
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.insights.map((insight) => (
          <Card key={insight.id} className="p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{insight.title}</div>
            <div className="mt-3 font-display text-3xl font-semibold text-white">{insight.value}</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">{insight.note}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="grid gap-3">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Largest Market Moves
          </div>
          {data.movementRows.length ? (
            <DataTable
              compact
              columns={["Market", "Move", "Context", "Matchup"]}
              rows={data.movementRows.map((row) => [
                row.label,
                row.movement,
                row.note,
                row.href ? (
                  <Link href={row.href} className="text-sky-300">
                    Open
                  </Link>
                ) : (
                  <span className="text-slate-500">No link</span>
                )
              ])}
            />
          ) : (
            <Card className="p-5 text-sm text-slate-400">
              No harvested movement rows match this query yet.
            </Card>
          )}
        </div>

        <div className="grid gap-3">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            CLV + Segment Read
          </div>
          {data.segmentRows.length ? (
            <DataTable
              compact
              columns={["Segment", "Value", "Context"]}
              rows={data.segmentRows.map((row) => [row.label, row.movement, row.note])}
            />
          ) : (
            <Card className="p-5 text-sm text-slate-400">
              Segment tables stay blank until this query has enough settled bets or harvested odds history to say something honest.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
