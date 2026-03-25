import { Prisma } from "@prisma/client";

import { getServerDatabaseResolution, hasUsableServerDatabaseUrl, prisma } from "@/lib/db/prisma";
import type { LeagueKey, SportCode } from "@/lib/types/domain";
import { americanToDecimal, americanToImpliedProbability } from "@/lib/utils/odds";

import type {
  HistoricalOddsBookmaker,
  HistoricalOddsGame,
  HistoricalOddsHarvestResponse,
  HistoricalOddsIngestionResult,
  HistoricalOddsOutcome
} from "./provider-types";

const SHARKEDGE_BACKEND_URL =
  process.env.SHARKEDGE_BACKEND_URL?.trim() || "https://shark-odds-1.onrender.com";
const HISTORICAL_SOURCE_KEY = "oddsharvester_historical" as const;

const HISTORICAL_LEAGUE_CONFIG = {
  NBA: {
    backendSportKey: "basketball_nba",
    leagueName: "NBA",
    sportProfileKey: "basketball",
    sportName: "Basketball",
    sportCode: "BASKETBALL" as SportCode,
    category: "team"
  },
  NCAAB: {
    backendSportKey: "basketball_ncaab",
    leagueName: "NCAA Men's Basketball",
    sportProfileKey: "basketball",
    sportName: "Basketball",
    sportCode: "BASKETBALL" as SportCode,
    category: "team"
  },
  MLB: {
    backendSportKey: "baseball_mlb",
    leagueName: "Major League Baseball",
    sportProfileKey: "baseball",
    sportName: "Baseball",
    sportCode: "BASEBALL" as SportCode,
    category: "team"
  },
  NHL: {
    backendSportKey: "icehockey_nhl",
    leagueName: "National Hockey League",
    sportProfileKey: "hockey",
    sportName: "Hockey",
    sportCode: "HOCKEY" as SportCode,
    category: "team"
  },
  NFL: {
    backendSportKey: "americanfootball_nfl",
    leagueName: "National Football League",
    sportProfileKey: "football",
    sportName: "Football",
    sportCode: "FOOTBALL" as SportCode,
    category: "team"
  },
  NCAAF: {
    backendSportKey: "americanfootball_ncaaf",
    leagueName: "College Football",
    sportProfileKey: "football",
    sportName: "Football",
    sportCode: "FOOTBALL" as SportCode,
    category: "team"
  }
} satisfies Partial<
  Record<
    LeagueKey,
    {
      backendSportKey: string;
      leagueName: string;
      sportProfileKey: string;
      sportName: string;
      sportCode: SportCode;
      category: string;
    }
  >
>;

type SupportedHistoricalLeagueKey = keyof typeof HISTORICAL_LEAGUE_CONFIG;

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function deriveAbbreviation(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts
      .slice(0, 3)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
}

function getSupportedHistoricalLeagues() {
  return Object.keys(HISTORICAL_LEAGUE_CONFIG) as SupportedHistoricalLeagueKey[];
}

function getBackendSportKey(leagueKey: SupportedHistoricalLeagueKey) {
  return HISTORICAL_LEAGUE_CONFIG[leagueKey].backendSportKey;
}

function resolveLeagueKeyFromSportKey(sportKey: string) {
  return (
    getSupportedHistoricalLeagues().find(
      (leagueKey) => HISTORICAL_LEAGUE_CONFIG[leagueKey].backendSportKey === sportKey
    ) ?? null
  );
}

function assertHistoricalStorageAvailable() {
  if (!hasUsableServerDatabaseUrl()) {
    const resolution = getServerDatabaseResolution();
    throw new Error(
      `Historical odds storage requires Postgres. Set DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL before running OddsHarvester ingestion. Current source: ${resolution.key ?? "none"}.`
    );
  }
}

async function fetchBackendJson<T>(path: string) {
  const response = await fetch(`${SHARKEDGE_BACKEND_URL}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`Historical odds backend request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

export async function getHistoricalOddsProviderStatus() {
  return fetchBackendJson<Record<string, unknown>>("/api/historical/odds/provider-status");
}

async function fetchHistoricalHarvest(
  league: SupportedHistoricalLeagueKey | "ALL"
): Promise<HistoricalOddsHarvestResponse> {
  const sportKey =
    league === "ALL" ? null : encodeURIComponent(getBackendSportKey(league));
  const path = sportKey
    ? `/api/historical/odds/harvest?sport_key=${sportKey}`
    : "/api/historical/odds/harvest";

  return fetchBackendJson<HistoricalOddsHarvestResponse>(path);
}

async function ensureLeagueProfile(
  tx: Prisma.TransactionClient,
  leagueKey: SupportedHistoricalLeagueKey
) {
  const config = HISTORICAL_LEAGUE_CONFIG[leagueKey];
  const sport = await tx.sport.upsert({
    where: {
      key: config.sportProfileKey
    },
    update: {
      name: config.sportName,
      code: config.sportCode,
      category: config.category
    },
    create: {
      key: config.sportProfileKey,
      name: config.sportName,
      code: config.sportCode,
      category: config.category
    }
  });

  const league = await tx.league.upsert({
    where: {
      key: leagueKey
    },
    update: {
      name: config.leagueName,
      sport: config.sportCode,
      sportId: sport.id
    },
    create: {
      key: leagueKey,
      name: config.leagueName,
      sport: config.sportCode,
      sportId: sport.id
    }
  });

  return {
    sport,
    league
  };
}

async function ensureCompetitor(
  tx: Prisma.TransactionClient,
  args: {
    leagueKey: SupportedHistoricalLeagueKey;
    sportId: string;
    leagueId: string;
    name: string;
  }
) {
  const key = `${args.leagueKey}:${normalizeToken(args.name)}`;

  return tx.competitor.upsert({
    where: {
      key
    },
    update: {
      name: args.name,
      shortName: args.name,
      abbreviation: deriveAbbreviation(args.name),
      type: "TEAM",
      sportId: args.sportId,
      leagueId: args.leagueId,
      metadataJson: {
        sourceType: "HARVESTED_HISTORICAL"
      },
      externalIds: {
        oddsharvester: args.name
      }
    },
    create: {
      key,
      type: "TEAM",
      name: args.name,
      shortName: args.name,
      abbreviation: deriveAbbreviation(args.name),
      sportId: args.sportId,
      leagueId: args.leagueId,
      metadataJson: {
        sourceType: "HARVESTED_HISTORICAL"
      },
      externalIds: {
        oddsharvester: args.name
      }
    }
  });
}

async function ensureSportsbook(tx: Prisma.TransactionClient, bookmaker: HistoricalOddsBookmaker) {
  return tx.sportsbook.upsert({
    where: {
      key: bookmaker.key
    },
    update: {
      name: bookmaker.title,
      region: "US",
      isActive: true
    },
    create: {
      key: bookmaker.key,
      name: bookmaker.title,
      region: "US",
      isActive: true
    }
  });
}

function getSelectionRole(
  outcome: HistoricalOddsOutcome,
  game: HistoricalOddsGame
): "AWAY" | "HOME" | "OVER" | "UNDER" | null {
  const normalizedName = normalizeToken(outcome.name ?? "");

  if (normalizedName === "over") {
    return "OVER";
  }

  if (normalizedName === "under") {
    return "UNDER";
  }

  if (normalizedName === normalizeToken(game.away_team)) {
    return "AWAY";
  }

  if (normalizedName === normalizeToken(game.home_team)) {
    return "HOME";
  }

  return null;
}

function buildMarketLabel(
  marketType: "moneyline" | "spread" | "total",
  outcome: HistoricalOddsOutcome
) {
  const outcomeName = outcome.name ?? "Selection";
  const pointLabel =
    typeof outcome.point === "number"
      ? ` ${outcome.point > 0 ? "+" : ""}${outcome.point}`
      : "";

  if (marketType === "moneyline") {
    return `${outcomeName} moneyline`;
  }

  if (marketType === "spread") {
    return `${outcomeName} spread${pointLabel}`;
  }

  return `${outcomeName} ${typeof outcome.point === "number" ? outcome.point : ""}`.trim();
}

async function upsertHistoricalMarket(
  tx: Prisma.TransactionClient,
  args: {
    eventId: string;
    sportsbookId: string;
    marketType: "moneyline" | "spread" | "total";
    outcome: HistoricalOddsOutcome;
    game: HistoricalOddsGame;
    awayCompetitorId: string;
    homeCompetitorId: string;
    capturedAt: Date;
  }
) {
  if (typeof args.outcome.price !== "number") {
    return null;
  }

  const side = getSelectionRole(args.outcome, args.game);
  const selectionCompetitorId =
    side === "AWAY"
      ? args.awayCompetitorId
      : side === "HOME"
        ? args.homeCompetitorId
        : null;

  const existing = await tx.eventMarket.findFirst({
    where: {
      eventId: args.eventId,
      sportsbookId: args.sportsbookId,
      marketType: args.marketType,
      selection: args.outcome.name ?? "Selection",
      side,
      line: args.outcome.point ?? null,
      sourceKey: HISTORICAL_SOURCE_KEY
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const eventMarket = existing
    ? await tx.eventMarket.update({
        where: {
          id: existing.id
        },
        data: {
          marketLabel: buildMarketLabel(args.marketType, args.outcome),
          selection: args.outcome.name ?? "Selection",
          side,
          line: args.outcome.point ?? null,
          oddsAmerican: args.outcome.price,
          oddsDecimal: americanToDecimal(args.outcome.price),
          impliedProbability: americanToImpliedProbability(args.outcome.price),
          isLive: false,
          sourceKey: HISTORICAL_SOURCE_KEY,
          selectionCompetitorId,
          updatedAt: args.capturedAt
        }
      })
    : await tx.eventMarket.create({
        data: {
          eventId: args.eventId,
          sportsbookId: args.sportsbookId,
          marketType: args.marketType,
          marketLabel: buildMarketLabel(args.marketType, args.outcome),
          selection: args.outcome.name ?? "Selection",
          side,
          line: args.outcome.point ?? null,
          oddsAmerican: args.outcome.price,
          oddsDecimal: americanToDecimal(args.outcome.price),
          impliedProbability: americanToImpliedProbability(args.outcome.price),
          isLive: false,
          sourceKey: HISTORICAL_SOURCE_KEY,
          selectionCompetitorId,
          updatedAt: args.capturedAt
        }
      });

  await tx.eventMarketSnapshot.create({
    data: {
      eventMarketId: eventMarket.id,
      capturedAt: args.capturedAt,
      line: args.outcome.point ?? null,
      oddsAmerican: args.outcome.price,
      impliedProbability: americanToImpliedProbability(args.outcome.price)
    }
  });

  return eventMarket.id;
}

async function ingestHistoricalGame(
  tx: Prisma.TransactionClient,
  args: {
    leagueKey: SupportedHistoricalLeagueKey;
    game: HistoricalOddsGame;
    capturedAt: Date;
  }
) {
  const { sport, league } = await ensureLeagueProfile(tx, args.leagueKey);
  const awayCompetitor = await ensureCompetitor(tx, {
    leagueKey: args.leagueKey,
    sportId: sport.id,
    leagueId: league.id,
    name: args.game.away_team
  });
  const homeCompetitor = await ensureCompetitor(tx, {
    leagueKey: args.leagueKey,
    sportId: sport.id,
    leagueId: league.id,
    name: args.game.home_team
  });
  const event = await tx.event.upsert({
    where: {
      externalEventId: `${HISTORICAL_SOURCE_KEY}:${args.game.id}`
    },
    update: {
      sportId: sport.id,
      leagueId: league.id,
      providerKey: HISTORICAL_SOURCE_KEY,
      name: `${args.game.away_team} at ${args.game.home_team}`,
      startTime: new Date(args.game.commence_time ?? args.capturedAt.toISOString()),
      status: "SCHEDULED",
      resultState: "PENDING",
      eventType: "TEAM_HEAD_TO_HEAD",
      venue: null,
      scoreJson: Prisma.JsonNull,
      stateJson: Prisma.JsonNull,
      resultJson: Prisma.JsonNull,
      metadataJson: {
        sourceType: "HARVESTED_HISTORICAL",
        bookmakersAvailable: args.game.bookmakers_available
      },
      syncState: "FRESH",
      lastSyncedAt: args.capturedAt
    },
    create: {
      externalEventId: `${HISTORICAL_SOURCE_KEY}:${args.game.id}`,
      sportId: sport.id,
      leagueId: league.id,
      providerKey: HISTORICAL_SOURCE_KEY,
      name: `${args.game.away_team} at ${args.game.home_team}`,
      startTime: new Date(args.game.commence_time ?? args.capturedAt.toISOString()),
      status: "SCHEDULED",
      resultState: "PENDING",
      eventType: "TEAM_HEAD_TO_HEAD",
      venue: null,
      scoreJson: Prisma.JsonNull,
      stateJson: Prisma.JsonNull,
      resultJson: Prisma.JsonNull,
      metadataJson: {
        sourceType: "HARVESTED_HISTORICAL",
        bookmakersAvailable: args.game.bookmakers_available
      },
      syncState: "FRESH",
      lastSyncedAt: args.capturedAt
    }
  });

  await tx.eventParticipant.deleteMany({
    where: {
      eventId: event.id
    }
  });

  await tx.eventParticipant.createMany({
    data: [
      {
        eventId: event.id,
        competitorId: awayCompetitor.id,
        role: "AWAY",
        sortOrder: 0,
        isHome: false,
        metadataJson: {
          sourceType: "HARVESTED_HISTORICAL"
        }
      },
      {
        eventId: event.id,
        competitorId: homeCompetitor.id,
        role: "HOME",
        sortOrder: 1,
        isHome: true,
        metadataJson: {
          sourceType: "HARVESTED_HISTORICAL"
        }
      }
    ]
  });

  let marketCount = 0;
  let snapshotCount = 0;

  for (const bookmaker of args.game.bookmakers) {
    const sportsbook = await ensureSportsbook(tx, bookmaker);
    const marketGroups = [
      {
        marketType: "moneyline" as const,
        outcomes: bookmaker.markets.moneyline
      },
      {
        marketType: "spread" as const,
        outcomes: bookmaker.markets.spread
      },
      {
        marketType: "total" as const,
        outcomes: bookmaker.markets.total
      }
    ];

    for (const group of marketGroups) {
      for (const outcome of group.outcomes) {
        const eventMarketId = await upsertHistoricalMarket(tx, {
          eventId: event.id,
          sportsbookId: sportsbook.id,
          marketType: group.marketType,
          outcome,
          game: args.game,
          awayCompetitorId: awayCompetitor.id,
          homeCompetitorId: homeCompetitor.id,
          capturedAt: args.capturedAt
        });

        if (eventMarketId) {
          marketCount += 1;
          snapshotCount += 1;
        }
      }
    }
  }

  return {
    eventId: event.id,
    marketCount,
    snapshotCount
  };
}

export async function ingestHistoricalOddsSnapshots(
  league: SupportedHistoricalLeagueKey | "ALL" = "ALL"
): Promise<HistoricalOddsIngestionResult> {
  assertHistoricalStorageAvailable();
  const payload = await fetchHistoricalHarvest(league);

  if (!payload.configured) {
    throw new Error(payload.message ?? "Historical odds harvesting is not configured.");
  }

  const capturedAt = new Date(payload.generated_at);
  const summary = {
    sourceKey: HISTORICAL_SOURCE_KEY,
    capturedAt: capturedAt.toISOString(),
    leagues: [] as LeagueKey[],
    sportCount: 0,
    gameCount: 0,
    marketCount: 0,
    snapshotCount: 0
  };

  for (const sport of payload.sports) {
    const leagueKey = resolveLeagueKeyFromSportKey(sport.key);
    if (!leagueKey) {
      continue;
    }

    summary.leagues.push(leagueKey);
    summary.sportCount += 1;

    for (const game of sport.games) {
      const result = await prisma.$transaction((tx) =>
        ingestHistoricalGame(tx, {
          leagueKey,
          game,
          capturedAt
        })
      );

      summary.gameCount += 1;
      summary.marketCount += result.marketCount;
      summary.snapshotCount += result.snapshotCount;
    }
  }

  summary.leagues = Array.from(new Set(summary.leagues));
  return summary;
}
