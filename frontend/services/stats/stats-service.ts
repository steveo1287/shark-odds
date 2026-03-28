import type {
  GameStatus,
  LeagueKey,
  LeagueSnapshotView,
  TeamGameStatRecord,
  TeamRecord
} from "@/lib/types/domain";
import { buildMatchupHref } from "@/lib/utils/matchups";
import { mockDatabase } from "@/prisma/seed-data";

const ESPN_LEAGUE_PATHS: Partial<Record<LeagueKey, string>> = {
  NBA: "basketball/nba",
  NCAAB: "basketball/mens-college-basketball",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NFL: "football/nfl",
  NCAAF: "football/college-football"
};

const teamMap = new Map(mockDatabase.teams.map((team) => [team.id, team]));
const leagueMap = new Map(mockDatabase.leagues.map((league) => [league.id, league]));
const leagueByKey = new Map(mockDatabase.leagues.map((league) => [league.key, league]));

const OFFSEASON_ITEMS: Partial<Record<LeagueKey, Array<{ title: string; body: string }>>> = {
  NFL: [
    {
      title: "Draft cycle",
      body: "Track draft capital, roster reshaping, and incoming role changes instead of replaying last season's scores."
    },
    {
      title: "Free agency",
      body: "Follow signings, releases, and depth-chart movement that will change prices before Week 1."
    },
    {
      title: "Futures context",
      body: "Offseason market prep belongs here until real NFL slates are back on the board."
    }
  ],
  NCAAF: [
    {
      title: "Portal movement",
      body: "Roster retention and transfer portal churn matter more right now than stale bowl-season results."
    },
    {
      title: "Spring camps",
      body: "Quarterback battles, coordinator changes, and scheme shifts should replace dead scoreboards in the offseason."
    },
    {
      title: "Futures context",
      body: "Keep preseason conference and title angles visible without pretending a live slate exists."
    }
  ],
  BOXING: [
    {
      title: "Fight schedule",
      body: "Card announcements, purse movement, and sanctioning updates are more useful than empty scoreboards."
    },
    {
      title: "Training camp",
      body: "Camp reports and opponent changes are the real pre-fight intelligence lane."
    }
  ],
  UFC: [
    {
      title: "Fight bookings",
      body: "New bout announcements and replacements should stay front and center between live cards."
    },
    {
      title: "Camp updates",
      body: "Weight-cut, injury, and camp-change context matter more than padded placeholder content."
    }
  ]
};

type JsonRecord = Record<string, any>;

function getTeam(teamId: string) {
  return teamMap.get(teamId) as TeamRecord;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resolveTeamRecord(leagueKey: LeagueKey, payload: JsonRecord) {
  const teamId = readString(payload.id) ?? readString(payload.team?.id);
  const name =
    readString(payload.displayName) ??
    readString(payload.shortDisplayName) ??
    readString(payload.name) ??
    readString(payload.team?.displayName) ??
    readString(payload.team?.shortDisplayName) ??
    readString(payload.team?.name) ??
    "Team";
  const abbreviation =
    readString(payload.abbreviation) ??
    readString(payload.team?.abbreviation) ??
    deriveAbbreviation(name);

  const existing =
    (teamId
      ? mockDatabase.teams.find(
          (team) =>
            team.externalIds?.espn === teamId &&
            leagueByKey.get(leagueKey)?.id === team.leagueId
        )
      : undefined) ??
    mockDatabase.teams.find(
      (team) =>
        leagueByKey.get(leagueKey)?.id === team.leagueId &&
        normalizeToken(team.name) === normalizeToken(name)
    );

  if (existing) {
    return existing;
  }

  const league = leagueByKey.get(leagueKey) ?? mockDatabase.leagues[0];

  return {
    id: `espn_${leagueKey.toLowerCase()}_${teamId ?? normalizeToken(name)}`,
    leagueId: league.id,
    name,
    abbreviation,
    externalIds: teamId
      ? {
          espn: teamId
        }
      : {
          source: "espn"
        }
  } satisfies TeamRecord;
}

async function fetchEspnJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 SharkEdge/1.5"
    },
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    throw new Error(`ESPN snapshot request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildNewsItems(payload: JsonRecord) {
  const articles = Array.isArray(payload.articles) ? payload.articles : [];

  return articles
    .map((article: JsonRecord, index: number) => {
      const title = readString(article.headline) ?? readString(article.title);
      if (!title) {
        return null;
      }

      return {
        id:
          readString(article.id) ??
          readString(article.links?.web?.href) ??
          `article-${index}`,
        title,
        href: readString(article.links?.web?.href) ?? readString(article.link) ?? null,
        publishedAt: readString(article.published) ?? readString(article.lastModified) ?? null,
        summary:
          readString(article.description) ??
          readString(article.story) ??
          readString(article.type) ??
          null,
        category:
          readString(article.categories?.[0]?.description) ??
          readString(article.type) ??
          null
      };
    })
    .filter((article): article is NonNullable<typeof article> => article !== null)
    .slice(0, 4);
}

function getStandingEntries(payload: JsonRecord) {
  const directEntries = Array.isArray(payload.standings?.entries)
    ? payload.standings.entries
    : [];
  const groupedEntries = Array.isArray(payload.standings?.groups)
    ? payload.standings.groups.flatMap((group: JsonRecord) =>
        Array.isArray(group?.standings?.entries) ? group.standings.entries : []
      )
    : [];

  return [...directEntries, ...groupedEntries] as JsonRecord[];
}

function pickStat(entry: JsonRecord, names: string[]) {
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const normalizedNames = names.map((name) => name.toLowerCase());

  return (
    stats.find((stat: JsonRecord) =>
      normalizedNames.includes(String(stat.name ?? "").toLowerCase())
    ) ?? null
  );
}

function buildStandings(leagueKey: LeagueKey, payload: JsonRecord) {
  return getStandingEntries(payload)
    .map((entry: JsonRecord, index: number) => {
      const team = resolveTeamRecord(leagueKey, entry.team ?? entry);
      const wins = pickStat(entry, ["wins", "winsAdjusted"]);
      const losses = pickStat(entry, ["losses", "lossesAdjusted"]);
      const streak = pickStat(entry, ["streak"]);
      const rank =
        readNumber(pickStat(entry, ["playoffSeed", "rank", "standingSummary"])?.value) ??
        readNumber(entry?.curatedRank?.current) ??
        index + 1;
      const netRating =
        readNumber(pickStat(entry, ["pointDifferential", "netRating"])?.value) ??
        readNumber(pickStat(entry, ["pointDifferential", "netRating"])?.displayValue) ??
        0;

      return {
        rank,
        team,
        record: `${readString(wins?.displayValue) ?? "0"}-${readString(losses?.displayValue) ?? "0"}`,
        streak: readString(streak?.displayValue) ?? "Even",
        netRating
      };
    })
    .filter((entry) => Boolean(entry.team.name))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 6);
}

function buildPreviousGames(leagueKey: LeagueKey, payload: JsonRecord) {
  const events = Array.isArray(payload.events) ? payload.events : [];

  return events
    .map((event: JsonRecord) => {
      const competition = Array.isArray(event.competitions) ? event.competitions[0] : null;
      const completed = Boolean(
        competition?.status?.type?.completed ?? event?.status?.type?.completed ?? false
      );

      if (!completed) {
        return null;
      }

      const competitors = Array.isArray(competition?.competitors)
        ? competition.competitors
        : [];
      const home = competitors.find(
        (competitor: JsonRecord) => String(competitor.homeAway ?? "").toLowerCase() === "home"
      );
      const away = competitors.find(
        (competitor: JsonRecord) => String(competitor.homeAway ?? "").toLowerCase() === "away"
      );

      if (!home || !away) {
        return null;
      }

      const homeScore = readNumber(home.score?.value ?? home.score);
      const awayScore = readNumber(away.score?.value ?? away.score);

      if (homeScore === null || awayScore === null) {
        return null;
      }

      return {
        id: readString(event.id) ?? `${leagueKey.toLowerCase()}-${readString(event.date) ?? "recent"}`,
        playedAt: readString(event.date) ?? new Date().toISOString(),
        awayTeam: resolveTeamRecord(leagueKey, away.team ?? away),
        homeTeam: resolveTeamRecord(leagueKey, home.team ?? home),
        awayScore,
        homeScore
      };
    })
    .filter(Boolean)
    .slice(0, 6) as LeagueSnapshotView["previousGames"];
}

function mapSnapshotStatus(value: string | null): GameStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "in") {
    return "LIVE";
  }
  if (normalized === "post") {
    return "FINAL";
  }
  if (normalized === "postponed" || normalized === "cancelled" || normalized === "delayed") {
    return "POSTPONED";
  }
  return "PREGAME";
}

function buildFeaturedGames(leagueKey: LeagueKey, payload: JsonRecord) {
  const events = Array.isArray(payload.events) ? payload.events : [];

  return events
    .map((event: JsonRecord) => {
      const competition = Array.isArray(event.competitions) ? event.competitions[0] : null;
      const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
      const home = competitors.find(
        (competitor: JsonRecord) => String(competitor.homeAway ?? "").toLowerCase() === "home"
      );
      const away = competitors.find(
        (competitor: JsonRecord) => String(competitor.homeAway ?? "").toLowerCase() === "away"
      );

      if (!home || !away) {
        return null;
      }

      const eventId = readString(event.id);
      if (!eventId) {
        return null;
      }

      return {
        id: eventId,
        startTime: readString(event.date) ?? new Date().toISOString(),
        awayTeam: resolveTeamRecord(leagueKey, away.team ?? away),
        homeTeam: resolveTeamRecord(leagueKey, home.team ?? home),
        awayScore: readNumber(away.score?.value ?? away.score),
        homeScore: readNumber(home.score?.value ?? home.score),
        status: mapSnapshotStatus(
          readString(competition?.status?.type?.state) ?? readString(event.status?.type?.state)
        ),
        stateDetail:
          readString(competition?.status?.type?.detail) ??
          readString(competition?.status?.type?.shortDetail) ??
          null,
        href: buildMatchupHref(leagueKey, eventId)
      };
    })
    .filter(Boolean)
    .slice(0, 4) as NonNullable<LeagueSnapshotView["featuredGames"]>;
}

function getSeasonState(leagueKey: LeagueKey, featuredGames: NonNullable<LeagueSnapshotView["featuredGames"]>) {
  if (leagueKey === "NFL" || leagueKey === "NCAAF") {
    return featuredGames.length ? "ACTIVE" : "OFFSEASON";
  }

  return "ACTIVE";
}

async function fetchLeagueSnapshot(leagueKey: LeagueKey): Promise<LeagueSnapshotView | null> {
  const leaguePath = ESPN_LEAGUE_PATHS[leagueKey];
  const league = leagueByKey.get(leagueKey);

  if (!league) {
    return null;
  }

  if (!leaguePath) {
    const offseasonItems = OFFSEASON_ITEMS[leagueKey] ?? [];
    if (!offseasonItems.length) {
      return null;
    }

    return {
      league,
      standings: [],
      previousGames: [],
      featuredGames: [],
      seasonState: "OFFSEASON",
      sourceLabel: "SharkEdge offseason context",
      note: `${league.key} is visible with honest context until a stronger free live feed is wired.`,
      newsItems: [],
      offseasonItems
    } satisfies LeagueSnapshotView;
  }

  const [standingsResult, scoreboardResult, newsResult] = await Promise.allSettled([
    fetchEspnJson<JsonRecord>(`${leaguePath}/standings`),
    fetchEspnJson<JsonRecord>(`${leaguePath}/scoreboard?limit=25`),
    fetchEspnJson<JsonRecord>(`${leaguePath}/news`)
  ]);

  const standings =
    standingsResult.status === "fulfilled"
      ? buildStandings(leagueKey, standingsResult.value)
      : [];
  const previousGames =
    scoreboardResult.status === "fulfilled"
      ? buildPreviousGames(leagueKey, scoreboardResult.value)
      : [];
  const featuredGames =
    scoreboardResult.status === "fulfilled"
      ? buildFeaturedGames(leagueKey, scoreboardResult.value)
      : [];
  const newsItems =
    newsResult.status === "fulfilled" ? buildNewsItems(newsResult.value) : [];
  const seasonState = getSeasonState(leagueKey, featuredGames);

  if (
    !standings.length &&
    !previousGames.length &&
    !featuredGames.length &&
    !newsItems.length &&
    seasonState !== "OFFSEASON"
  ) {
    return null;
  }

  return {
    league,
    standings,
    previousGames,
    featuredGames,
    seasonState,
    sourceLabel: "ESPN standings + scoreboard",
    newsItems,
    offseasonItems: seasonState === "OFFSEASON" ? OFFSEASON_ITEMS[leagueKey] ?? [] : [],
    note:
      seasonState === "OFFSEASON"
        ? `${league.key} is in the offseason window right now. SharkEdge keeps this pulse card visible without recycling stale scores.`
        : previousGames.length || standings.length || featuredGames.length || newsItems.length
          ? "Provider-backed league context only. If ESPN does not return standings or completed results here, SharkEdge leaves this panel out."
          : null
  } satisfies LeagueSnapshotView;
}

export async function getLeagueSnapshots(selectedLeague: "ALL" | LeagueKey) {
  const leagueKeys: LeagueKey[] =
    selectedLeague === "ALL"
      ? (["NBA", "NCAAB", "MLB", "NHL", "NFL", "NCAAF", "UFC", "BOXING"] as LeagueKey[])
      : [selectedLeague];

  const snapshots = await Promise.all(leagueKeys.map((leagueKey) => fetchLeagueSnapshot(leagueKey)));

  return snapshots.filter(Boolean) as LeagueSnapshotView[];
}

export function getTeamStatComparison(gameId: string) {
  const game = mockDatabase.games.find((entry) => entry.id === gameId);
  if (!game) {
    return null;
  }

  const away = mockDatabase.teamGameStats.find(
    (entry) => entry.gameId === gameId && entry.teamId === game.awayTeamId
  ) as TeamGameStatRecord | undefined;
  const home = mockDatabase.teamGameStats.find(
    (entry) => entry.gameId === gameId && entry.teamId === game.homeTeamId
  ) as TeamGameStatRecord | undefined;

  if (!away || !home) {
    return null;
  }

  return {
    away: {
      team: getTeam(game.awayTeamId),
      stats: away.statsJson as Record<string, number | string>
    },
    home: {
      team: getTeam(game.homeTeamId),
      stats: home.statsJson as Record<string, number | string>
    }
  };
}

export function getLeagueById(leagueId: string) {
  return leagueMap.get(leagueId) ?? null;
}
