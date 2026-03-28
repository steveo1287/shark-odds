import { MarketType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

function getNumericStat(stats: Prisma.JsonValue, keys: string[]) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return null;
  }
  const record = stats as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return null;
  }
  const mean = average(values) ?? 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, values.length - 1);
  return Math.sqrt(variance);
}

function buildSportFeatureSet(sportKey: string) {
  switch (sportKey) {
    case "NBA":
    case "NCAAB":
      return {
        offense: ["points", "PTS", "points_per_game"],
        defense: ["opp_points", "oppPTS", "points_allowed"],
        pace: ["pace", "possessions"],
        player: {
          player_points: ["points", "PTS"],
          player_rebounds: ["rebounds", "REB"],
          player_assists: ["assists", "AST"],
          player_threes: ["threes", "FG3M", "3PM"]
        }
      };
    case "MLB":
      return {
        offense: ["runs", "R", "runs_per_game"],
        defense: ["runs_allowed", "RA", "era"],
        pace: ["innings", "plate_appearances"],
        player: {
          other: ["hits", "H", "strikeouts", "SO", "total_bases", "TB"]
        }
      };
    case "NHL":
      return {
        offense: ["goals", "G", "goals_per_game", "xgf"],
        defense: ["goals_allowed", "GA", "xga"],
        pace: ["shots", "SOG", "tempo"],
        player: {
          other: ["shots", "SOG", "points", "PTS", "saves", "SV"]
        }
      };
    case "NFL":
    case "NCAAF":
      return {
        offense: ["yards", "total_yards", "epa_offense", "points"],
        defense: ["yards_allowed", "epa_defense", "points_allowed"],
        pace: ["plays", "plays_per_game"],
        player: {
          other: ["passing_yards", "rushing_yards", "receiving_yards", "receptions", "touchdowns"]
        }
      };
    case "UFC":
    case "BOXING":
      return {
        offense: ["strikes_landed", "sig_strikes", "finish_rate"],
        defense: ["strikes_absorbed", "sig_strikes_absorbed"],
        pace: ["control_time", "rounds"],
        player: {
          other: ["sig_strikes", "takedowns", "rounds"]
        }
      };
    default:
      return {
        offense: ["points"],
        defense: ["opp_points"],
        pace: ["pace"],
        player: {
          other: ["points"]
        }
      };
  }
}

export async function buildEventProjectionFromHistory(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      league: true,
      participants: {
        include: {
          competitor: {
            include: {
              team: {
                include: {
                  teamGameStats: {
                    orderBy: { createdAt: "desc" },
                    take: 12
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!event) {
    throw new Error("Event not found for projection build.");
  }

  const features = buildSportFeatureSet(event.league.key);
  const teams = event.participants
    .map((participant) => participant.competitor.team)
    .filter(Boolean);

  if (teams.length < 2) {
    return null;
  }

  const [awayTeam, homeTeam] = teams;
  const homeOffense = average(homeTeam!.teamGameStats.map((row) => getNumericStat(row.statsJson, features.offense)).filter((v): v is number => v !== null)) ?? 0;
  const awayOffense = average(awayTeam!.teamGameStats.map((row) => getNumericStat(row.statsJson, features.offense)).filter((v): v is number => v !== null)) ?? 0;
  const homeDefense = average(homeTeam!.teamGameStats.map((row) => getNumericStat(row.statsJson, features.defense)).filter((v): v is number => v !== null)) ?? 0;
  const awayDefense = average(awayTeam!.teamGameStats.map((row) => getNumericStat(row.statsJson, features.defense)).filter((v): v is number => v !== null)) ?? 0;
  const pace = average([
    ...(homeTeam!.teamGameStats.map((row) => getNumericStat(row.statsJson, features.pace)).filter((v): v is number => v !== null)),
    ...(awayTeam!.teamGameStats.map((row) => getNumericStat(row.statsJson, features.pace)).filter((v): v is number => v !== null))
  ]) ?? 1;

  const projectedHomeScore = (homeOffense + awayDefense) / 2;
  const projectedAwayScore = (awayOffense + homeDefense) / 2;
  const projectedTotal = projectedHomeScore + projectedAwayScore;
  const projectedSpreadHome = projectedHomeScore - projectedAwayScore;
  const winProbHome = 1 / (1 + Math.exp(-projectedSpreadHome / Math.max(1, pace / 10)));

  return {
    modelKey: `team-efficiency-${event.league.key.toLowerCase()}`,
    modelVersion: "v1",
    eventId: event.id,
    projectedHomeScore,
    projectedAwayScore,
    projectedTotal,
    projectedSpreadHome,
    winProbHome,
    winProbAway: 1 - winProbHome,
    metadata: {
      sport: event.league.sport,
      league: event.league.key,
      pace
    }
  };
}

export async function buildPlayerPropProjectionsForEvent(eventId: string) {
  const players = await prisma.player.findMany({
    where: {
      team: {
        homeGames: { some: { id: eventId } }
      }
    }
  }).catch(() => []);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { league: true }
  });
  if (!event) {
    return [];
  }

  const features = buildSportFeatureSet(event.league.key);
  const statKeys = Object.entries(features.player);

  const roster = await prisma.player.findMany({
    where: {
      OR: [
        {
          team: {
            homeGames: {
              some: {
                id: eventId
              }
            }
          }
        },
        {
          team: {
            awayGames: {
              some: {
                id: eventId
              }
            }
          }
        }
      ]
    },
    include: {
      playerGameStats: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });

  return roster.flatMap((player) => {
    return statKeys.map(([marketType, keys]) => {
      const values = player.playerGameStats
        .map((row) => getNumericStat(row.statsJson, keys))
        .filter((value): value is number => value !== null);
      const meanValue = average(values);
      if (meanValue === null) {
        return null;
      }
      const stdDev = standardDeviation(values) ?? 0;
      return {
        modelKey: `player-props-${event.league.key.toLowerCase()}`,
        modelVersion: "v1",
        eventId: event.id,
        playerId: player.id,
        statKey: marketType === "other" ? keys[0] : marketType,
        meanValue,
        medianValue: values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? meanValue,
        stdDev,
        hitProbOver: {},
        hitProbUnder: {},
        metadata: {
          sampleSize: values.length
        }
      };
    }).filter(Boolean);
  });
}
