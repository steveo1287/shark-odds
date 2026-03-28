import { readHotCache, writeHotCache } from "@/lib/cache/live-cache";
import { prisma } from "@/lib/db/prisma";
import { getBoardFeed } from "@/services/market-data/market-data-service";

export async function getBoardApi(
  leagueKey?: string,
  options?: { skipCache?: boolean }
) {
  return getBoardFeed(leagueKey, options);
}

export async function getEdgesApi(options?: { skipCache?: boolean }) {
  const cacheKey = "edges:v1:all";
  if (!options?.skipCache) {
    const cached = await readHotCache<unknown>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const signals = await prisma.edgeSignal.findMany({
    where: { isActive: true },
    include: {
      event: { include: { league: true } },
      player: true,
      sportsbook: true
    },
    orderBy: [{ edgeScore: "desc" }, { evPercent: "desc" }],
    take: 100
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    count: signals.length,
    data: signals.map((signal) => ({
      id: signal.id,
      eventId: signal.eventId,
      eventLabel: signal.event.name,
      league: signal.event.league.key,
      marketType: signal.marketType,
      player: signal.player?.name ?? null,
      sportsbook: signal.sportsbook.name,
      side: signal.side,
      lineValue: signal.lineValue,
      offeredOddsAmerican: signal.offeredOddsAmerican,
      fairOddsAmerican: signal.fairOddsAmerican,
      modelProb: signal.modelProb,
      noVigProb: signal.noVigProb,
      evPercent: signal.evPercent,
      kellyFull: signal.kellyFull,
      kellyHalf: signal.kellyHalf,
      confidenceScore: signal.confidenceScore,
      edgeScore: signal.edgeScore,
      flags: signal.flagsJson,
      expiresAt: signal.expiresAt?.toISOString() ?? null
    }))
  };
  await writeHotCache(cacheKey, payload, 45);
  return payload;
}

export async function getEventApi(
  eventId: string,
  options?: { skipCache?: boolean }
) {
  const cacheKey = `event:v1:${eventId}`;
  if (!options?.skipCache) {
    const cached = await readHotCache<unknown>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      league: true,
      participants: {
        include: { competitor: true }
      },
      currentMarketStates: {
        include: {
          bestHomeBook: true,
          bestAwayBook: true,
          bestOverBook: true,
          bestUnderBook: true
        }
      },
      eventProjections: {
        orderBy: { modelRun: { createdAt: "desc" } },
        take: 1
      },
      playerProjections: {
        include: { player: true },
        orderBy: { meanValue: "desc" },
        take: 25
      },
      edgeSignals: {
        where: { isActive: true },
        orderBy: [{ edgeScore: "desc" }, { evPercent: "desc" }],
        take: 20,
        include: { player: true, sportsbook: true }
      },
      lineMovements: {
        orderBy: { movedAt: "desc" },
        take: 25,
        include: { sportsbook: true, player: true }
      },
      eventResult: true
    }
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    event
  };
  await writeHotCache(cacheKey, payload, 45);
  return payload;
}

export async function getPropsApi() {
  const projections = await prisma.playerProjection.findMany({
    include: {
      event: { include: { league: true } },
      player: true,
      modelRun: true
    },
    orderBy: [{ meanValue: "desc" }],
    take: 200
  });

  return {
    generatedAt: new Date().toISOString(),
    count: projections.length,
    data: projections.map((projection) => ({
      id: projection.id,
      eventId: projection.eventId,
      eventLabel: projection.event.name,
      league: projection.event.league.key,
      playerId: projection.playerId,
      playerName: projection.player.name,
      statKey: projection.statKey,
      meanValue: projection.meanValue,
      medianValue: projection.medianValue,
      stdDev: projection.stdDev,
      metadata: projection.metadataJson
    }))
  };
}

export async function getLineMovementsApi() {
  const rows = await prisma.lineMovement.findMany({
    include: {
      event: { include: { league: true } },
      sportsbook: true,
      player: true
    },
    orderBy: { movedAt: "desc" },
    take: 200
  });

  return {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    data: rows
  };
}
