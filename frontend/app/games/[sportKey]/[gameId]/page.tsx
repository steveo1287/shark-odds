import Link from "next/link";
import type { ReactNode } from "react";

import {
  type Bookmaker,
  type GameDetailResponse,
  type MarketOffer,
  type TeamStat,
  type PlayerLeader,
  type PointRange,
  type RecentResult,
  formatAmericanOdds,
  formatBoardUpdatedTime,
  formatBookmakerMarket,
  formatCommenceTime,
  formatConsensusPoint,
  formatOfferText,
  formatPoint,
  formatRange,
  getGameDetails,
  summarizeBookmakers
} from "../../../../lib/shark-odds";

export const dynamic = "force-dynamic";

type GamePageProps = {
  params: Promise<{
    sportKey: string;
    gameId: string;
  }>;
};

function detailShell(children: ReactNode) {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(22, 16, 48, 0.94), rgba(10, 11, 28, 0.9))",
        border: "1px solid rgba(102, 232, 255, 0.18)",
        borderRadius: 28,
        boxShadow:
          "0 24px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
      }}
    >
      {children}
    </div>
  );
}

function heroStat(label: string, value: string, accent: string) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)"
      }}
    >
      <div
        style={{
          color: accent,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          marginBottom: 8,
          textTransform: "uppercase"
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#fff7fb",
          fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
          fontSize: 24,
          fontWeight: 700
        }}
      >
        {value}
      </div>
    </div>
  );
}

function marketCard(
  title: string,
  offers: MarketOffer[],
  accent: string,
  type: "moneyline" | "spread" | "total"
) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 12
      }}
    >
      <div
        style={{
          color: accent,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase"
        }}
      >
        {title}
      </div>

      {offers.length ? (
        offers.map((offer) => (
          <div
            key={`${title}-${offer.name}`}
            style={{
              display: "grid",
              gap: 6
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div style={{ color: "#fff7fb", fontWeight: 700 }}>
                {formatOfferText(offer, type)}
              </div>
              <div style={{ color: "#c7d0f6", fontSize: 12, whiteSpace: "nowrap" }}>
                {offer.book_count} books
              </div>
            </div>
            <div style={{ color: "#c7d0f6", fontSize: 13, lineHeight: 1.5 }}>
              Best at {summarizeBookmakers(offer.best_bookmakers)}
            </div>
            <div style={{ color: "#9ba4cc", fontSize: 12 }}>
              Avg {formatAmericanOdds(offer.average_price)}
              {offer.consensus_point !== null
                ? ` | Consensus ${formatConsensusPoint(
                    offer.consensus_point,
                    type === "moneyline" ? "spread" : type
                  )}`
                : ""}
            </div>
          </div>
        ))
      ) : (
        <div style={{ color: "#9ba4cc", fontSize: 14 }}>No line available.</div>
      )}
    </div>
  );
}

function rangeCard(title: string, awayTeam: string, homeTeam: string, away: PointRange | null, home: PointRange | null) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)"
      }}
    >
      <div
        style={{
          color: "#ffd28f",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          marginBottom: 10,
          textTransform: "uppercase"
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 8, color: "#fff7fb", fontSize: 14 }}>
        <div>
          {awayTeam}: <span style={{ color: "#c7d0f6" }}>{formatRange(away)}</span>
        </div>
        <div>
          {homeTeam}: <span style={{ color: "#c7d0f6" }}>{formatRange(home)}</span>
        </div>
      </div>
    </div>
  );
}

function totalRangeCard(overRange: PointRange | null, underRange: PointRange | null) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)"
      }}
    >
      <div
        style={{
          color: "#49e7ff",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          marginBottom: 10,
          textTransform: "uppercase"
        }}
      >
        Total Line Range
      </div>
      <div style={{ display: "grid", gap: 8, color: "#fff7fb", fontSize: 14 }}>
        <div>
          Over: <span style={{ color: "#c7d0f6" }}>{formatRange(overRange, false)}</span>
        </div>
        <div>
          Under: <span style={{ color: "#c7d0f6" }}>{formatRange(underRange, false)}</span>
        </div>
      </div>
    </div>
  );
}

function resultCard(result: RecentResult) {
  const accent =
    result.result === "W" ? "#74f7bf" : result.result === "L" ? "#ff9ccf" : "#ffd28f";

  return (
    <div
      key={result.id}
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 8
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div style={{ color: "#fff7fb", fontWeight: 700 }}>{result.opponent}</div>
        <div style={{ color: accent, fontWeight: 800 }}>{result.result}</div>
      </div>
      <div style={{ color: "#c7d0f6", fontSize: 13 }}>
        {result.location} | {formatCommenceTime(result.commence_time)}
      </div>
      <div style={{ color: "#fff7fb", fontSize: 14 }}>
        {result.team_score}-{result.opponent_score} | Margin {result.margin > 0 ? "+" : ""}
        {result.margin}
      </div>
    </div>
  );
}

function teamFormCard(
  teamName: string,
  form: GameDetailResponse["team_form"][string],
  accent: string
) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 22,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 16
      }}
    >
      <div>
        <div
          style={{
            color: accent,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            marginBottom: 8,
            textTransform: "uppercase"
          }}
        >
          Team Form
        </div>
        <div
          style={{
            color: "#fff7fb",
            fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
            fontSize: 28,
            fontWeight: 700
          }}
        >
          {teamName}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12
        }}
      >
        {heroStat("Record", form.summary.record, accent)}
        {heroStat(
          "Avg For",
          form.summary.avg_points_for?.toString() ?? "--",
          "#49e7ff"
        )}
        {heroStat(
          "Avg Against",
          form.summary.avg_points_against?.toString() ?? "--",
          "#ff76c1"
        )}
        {heroStat(
          "Avg Margin",
          form.summary.avg_margin?.toString() ?? "--",
          "#ffd28f"
        )}
        {heroStat(
          "Avg Total",
          form.summary.avg_total?.toString() ?? "--",
          "#74f7bf"
        )}
      </div>

      <div
        style={{
          color: "#b8c4ef",
          fontSize: 13,
          lineHeight: 1.6
        }}
      >
        Last five is now sourced from team schedules when ESPN has the matchup
        mapped, with an Odds API fallback if the team feed is missing.
      </div>

      <div
        style={{
          color: accent,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase"
        }}
      >
        Last 5 Games
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {form.recent_results.length ? (
          form.recent_results.map((result) => resultCard(result))
        ) : (
          <div style={{ color: "#9ba4cc" }}>No recent completed games returned.</div>
        )}
      </div>
    </div>
  );
}

function teamStatsCard(teamName: string, stats: TeamStat[], accent: string) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 22,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 16
      }}
    >
      <div>
        <div
          style={{
            color: accent,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            marginBottom: 8,
            textTransform: "uppercase"
          }}
        >
          Team Betting Stats
        </div>
        <div
          style={{
            color: "#fff7fb",
            fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
            fontSize: 28,
            fontWeight: 700
          }}
        >
          {teamName}
        </div>
      </div>

      {stats.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12
          }}
        >
          {stats.map((stat) => (
            <div
              key={`${teamName}-${stat.key}`}
              style={{
                padding: 16,
                borderRadius: 18,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <div
                style={{
                  color: "#b8c4ef",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                  textTransform: "uppercase"
                }}
              >
                {stat.label}
              </div>
              <div style={{ color: "#fff7fb", fontSize: 24, fontWeight: 800 }}>
                {stat.display_value}
              </div>
              <div style={{ color: "#9ba4cc", fontSize: 12, marginTop: 6 }}>
                {stat.rank ? `Rank ${stat.rank}` : "Season average"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#9ba4cc" }}>No team stats returned for this matchup.</div>
      )}
    </div>
  );
}

function playerLeaderCard(leader: PlayerLeader) {
  return (
    <div
      key={`${leader.category_key}-${leader.athlete_id}`}
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 10
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div
          style={{
            color: "#9ba4cc",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase"
          }}
        >
          {leader.label}
        </div>
        <div style={{ color: "#49e7ff", fontWeight: 800 }}>{leader.display_value}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {leader.headshot ? (
          <img
            src={leader.headshot}
            alt={leader.athlete_name}
            width={44}
            height={44}
            style={{
              borderRadius: "999px",
              objectFit: "cover",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}
          />
        ) : null}
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "#fff7fb", fontWeight: 700 }}>{leader.athlete_name}</div>
          <div style={{ color: "#b8c4ef", fontSize: 13 }}>
            {[leader.position, leader.games_played ? `${leader.games_played} GP` : null]
              .filter(Boolean)
              .join(" | ")}
          </div>
        </div>
      </div>
    </div>
  );
}

function playerLeadersTeamCard(teamName: string, leaders: PlayerLeader[], accent: string) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 22,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 16
      }}
    >
      <div>
        <div
          style={{
            color: accent,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            marginBottom: 8,
            textTransform: "uppercase"
          }}
        >
          Player Leaders
        </div>
        <div
          style={{
            color: "#fff7fb",
            fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
            fontSize: 28,
            fontWeight: 700
          }}
        >
          {teamName}
        </div>
      </div>

      {leaders.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {leaders.map((leader) => playerLeaderCard(leader))}
        </div>
      ) : (
        <div style={{ color: "#9ba4cc" }}>No player leader stats returned.</div>
      )}
    </div>
  );
}

function sportsbookCard(bookmaker: Bookmaker, detail: GameDetailResponse) {
  const game = detail.game;

  return (
    <div
      key={bookmaker.key}
      style={{
        padding: 18,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "grid",
        gap: 12
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div style={{ color: "#fff7fb", fontWeight: 800 }}>{bookmaker.title}</div>
        <div style={{ color: "#49e7ff", fontSize: 12 }}>U.S. Book</div>
      </div>

      <div style={{ color: "#c7d0f6", fontSize: 13, lineHeight: 1.6 }}>
        <div>
          Moneyline:{" "}
          {formatBookmakerMarket(
            bookmaker.markets.moneyline,
            "moneyline",
            game.home_team,
            game.away_team
          )}
        </div>
        <div>
          Spread:{" "}
          {formatBookmakerMarket(
            bookmaker.markets.spread,
            "spread",
            game.home_team,
            game.away_team
          )}
        </div>
        <div>
          Total:{" "}
          {formatBookmakerMarket(
            bookmaker.markets.total,
            "total",
            game.home_team,
            game.away_team
          )}
        </div>
      </div>
    </div>
  );
}

export default async function GameDetailPage({ params }: GamePageProps) {
  const { sportKey, gameId } = await params;
  const detail = await getGameDetails(sportKey, gameId);
  const game = detail.game;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 18px 64px"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 1380,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <Link
          href={`/?league=${detail.sport.key}`}
          style={{
            color: "#49e7ff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none"
          }}
        >
          {"<-"} Back to {detail.sport.short_title}
        </Link>

        {detailShell(
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 22,
              padding: 28
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(73, 231, 255, 0.14)",
                  border: "1px solid rgba(73, 231, 255, 0.24)",
                  color: "#adf8ff",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase"
                }}
              >
                {detail.sport.title} Deep Dive
              </div>

              <h1
                style={{
                  margin: "18px 0 10px",
                  color: "#fff7fb",
                  fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
                  fontSize: "clamp(2.6rem, 6vw, 5rem)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.05em"
                }}
              >
                {game.away_team}
                <br />
                at {game.home_team}
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#d9d3ff",
                  fontSize: 17,
                  lineHeight: 1.7
                }}
              >
                {formatCommenceTime(game.commence_time)}
              </p>

              <p
                style={{
                  margin: "16px 0 0",
                  color: "#b7c4ef",
                  lineHeight: 1.7
                }}
              >
                Updated {formatBoardUpdatedTime(detail.generated_at)}. This page layers
                current odds, book-by-book comparisons, line range analytics, and
                recent team results into one cleaner betting workflow.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: 16
              }}
            >
              {heroStat(
                "Best Moneyline",
                game.market_stats.moneyline[0]
                  ? formatOfferText(game.market_stats.moneyline[0], "moneyline")
                  : "No line",
                "#49e7ff"
              )}
              {heroStat(
                "Best Spread",
                game.market_stats.spread[0]
                  ? formatOfferText(game.market_stats.spread[0], "spread")
                  : "No line",
                "#ff76c1"
              )}
              {heroStat(
                "Best Total",
                game.market_stats.total[0]
                  ? formatOfferText(game.market_stats.total[0], "total")
                  : "No line",
                "#ffd28f"
              )}
            </div>
          </div>
        )}

        {detailShell(
          <div
            style={{
              padding: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18
            }}
          >
            {marketCard(
              "Moneyline Consensus",
              game.market_stats.moneyline,
              "#49e7ff",
              "moneyline"
            )}
            {marketCard(
              "Spread Consensus",
              game.market_stats.spread,
              "#ff76c1",
              "spread"
            )}
            {marketCard(
              "Total Consensus",
              game.market_stats.total,
              "#ffd28f",
              "total"
            )}
            {rangeCard(
              "Spread Range",
              game.away_team,
              game.home_team,
              detail.line_analytics.spread_range[game.away_team],
              detail.line_analytics.spread_range[game.home_team]
            )}
            {totalRangeCard(
              detail.line_analytics.total_range.over,
              detail.line_analytics.total_range.under
            )}
            <div
              style={{
                padding: 18,
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, rgba(255, 76, 181, 0.14), rgba(73, 231, 255, 0.12))",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <div
                style={{
                  color: "#ff9ccf",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  marginBottom: 10,
                  textTransform: "uppercase"
                }}
              >
                Verified Users
              </div>
              <div
                style={{
                  color: "#fff7fb",
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 10
                }}
              >
                Handle, tickets, and tracked history
              </div>
              <div style={{ color: "#d9d3ff", fontSize: 14, lineHeight: 1.6 }}>
                {detail.verified_user_stats.message}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24
          }}
        >
          {detailShell(
            <div style={{ padding: 24 }}>
              {teamFormCard(game.away_team, detail.team_form[game.away_team], "#49e7ff")}
            </div>
          )}
          {detailShell(
            <div style={{ padding: 24 }}>
              {teamFormCard(game.home_team, detail.team_form[game.home_team], "#ff76c1")}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24
          }}
        >
          {detailShell(
            <div style={{ padding: 24 }}>
              {teamStatsCard(game.away_team, detail.team_stats[game.away_team], "#49e7ff")}
            </div>
          )}
          {detailShell(
            <div style={{ padding: 24 }}>
              {teamStatsCard(game.home_team, detail.team_stats[game.home_team], "#ff76c1")}
            </div>
          )}
        </div>

        {detail.sport.key.startsWith("basketball_") ? (
          <div
            style={{
              display: "grid",
              gap: 24
            }}
          >
            {detailShell(
              <div style={{ padding: 24, display: "grid", gap: 16 }}>
                <div>
                  <div
                    style={{
                      color: "#49e7ff",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      marginBottom: 8,
                      textTransform: "uppercase"
                    }}
                  >
                    Player Leaders
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#fff7fb",
                      fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
                      fontSize: "clamp(1.7rem, 3vw, 2.4rem)",
                      lineHeight: 1.05
                    }}
                  >
                    PPG, APG, SPG, BPG, and RPG leaders
                  </h2>
                </div>

                <div style={{ color: "#b8c4ef", fontSize: 14, lineHeight: 1.7 }}>
                  {detail.player_leaders.message}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 24
                  }}
                >
                  {playerLeadersTeamCard(
                    game.away_team,
                    detail.player_leaders.teams[game.away_team] ?? [],
                    "#49e7ff"
                  )}
                  {playerLeadersTeamCard(
                    game.home_team,
                    detail.player_leaders.teams[game.home_team] ?? [],
                    "#ff76c1"
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {detailShell(
          <div style={{ padding: 24, display: "grid", gap: 18 }}>
            <div>
              <div
                style={{
                  color: "#49e7ff",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  marginBottom: 8,
                  textTransform: "uppercase"
                }}
              >
                Sportsbook Comparison
              </div>
              <h2
                style={{
                  margin: 0,
                  color: "#fff7fb",
                  fontFamily: "var(--font-display), 'Avenir Next', sans-serif",
                  fontSize: "clamp(1.8rem, 4vw, 2.5rem)"
                }}
              >
                DraftKings, FanDuel, BetMGM, and friends
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 16
              }}
            >
              {game.bookmakers.map((bookmaker) => sportsbookCard(bookmaker, detail))}
            </div>
          </div>
        )}

        {detail.notes.length ? (
          detailShell(
            <div style={{ padding: 24, display: "grid", gap: 10 }}>
              <div
                style={{
                  color: "#ffd28f",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase"
                }}
              >
                Notes
              </div>
              {detail.notes.map((note) => (
                <div key={note} style={{ color: "#d9d3ff", lineHeight: 1.6 }}>
                  {note}
                </div>
              ))}
            </div>
          )
        ) : null}
      </section>
    </main>
  );
}
