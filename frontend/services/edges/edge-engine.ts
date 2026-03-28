import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { calculateEV, kellySize, stripVig } from "@/lib/odds/index";

function confidenceLabel(sampleSize: number, edgeDelta: number, hold: number) {
  const base = Math.min(1, sampleSize / 50) * 50;
  const edgeBoost = Math.min(30, Math.abs(edgeDelta) * 100);
  const holdPenalty = Math.min(25, hold * 100);
  return Math.max(0, Math.min(100, base + edgeBoost - holdPenalty));
}

function noVigFromTwoWay(left?: number | null, right?: number | null) {
  if (typeof left !== "number" || typeof right !== "number") {
    return null;
  }
  const stripped = stripVig([left, right]);
  if (stripped.length !== 2) {
    return null;
  }
  return { left: stripped[0], right: stripped[1], hold: left + right - 1 };
}

export async function recomputeCurrentMarketState(eventId?: string) {
  const events = await prisma.event.findMany({
    where: eventId ? { id: eventId } : undefined,
    include: {
      markets: {
        include: {
          sportsbook: true
        }
      }
    }
  });

  for (const event of events) {
    const groups = new Map<string, typeof event.markets>();
    for (const market of event.markets) {
      const key = `${market.marketType}:${market.selectionCompetitorId ?? "none"}`;
      groups.set(key, [...(groups.get(key) ?? []), market]);
    }

    for (const [groupKey, markets] of groups.entries()) {
      const [marketType, playerIdRaw] = groupKey.split(":");
      const playerId = playerIdRaw === "none" ? null : playerIdRaw;
      const home = markets.filter((row) => row.side === "home").sort((a, b) => b.oddsAmerican - a.oddsAmerican)[0];
      const away = markets.filter((row) => row.side === "away").sort((a, b) => b.oddsAmerican - a.oddsAmerican)[0];
      const over = markets.filter((row) => row.side === "over").sort((a, b) => b.oddsAmerican - a.oddsAmerican)[0];
      const under = markets.filter((row) => row.side === "under").sort((a, b) => b.oddsAmerican - a.oddsAmerican)[0];
      const lineRows = markets.filter((row) => typeof row.line === "number");
      const consensusLineValue =
        lineRows.length > 0
          ? lineRows.reduce((sum, row) => sum + (row.line ?? 0), 0) / lineRows.length
          : null;

      const marketStateData = {
        consensusLineValue,
        bestHomeOddsAmerican: home?.oddsAmerican,
        bestHomeBookId: home?.sportsbookId,
        bestAwayOddsAmerican: away?.oddsAmerican,
        bestAwayBookId: away?.sportsbookId,
        bestOverOddsAmerican: over?.oddsAmerican,
        bestOverBookId: over?.sportsbookId,
        bestUnderOddsAmerican: under?.oddsAmerican,
        bestUnderBookId: under?.sportsbookId,
        noVigSource: home && away ? "market-average" : over && under ? "market-average" : null
      };

      const existing = await prisma.currentMarketState.findFirst({
        where: {
          eventId: event.id,
          marketType: marketType as never,
          playerId
        }
      });

      if (existing) {
        await prisma.currentMarketState.update({
          where: { id: existing.id },
          data: marketStateData
        });
      } else {
        await prisma.currentMarketState.create({
          data: {
            eventId: event.id,
            marketType: marketType as never,
            playerId,
            ...marketStateData
          }
        });
      }
    }
  }
}

export async function recomputeEdgeSignals(eventId?: string) {
  const events = await prisma.event.findMany({
    where: eventId ? { id: eventId } : undefined,
    include: {
      currentMarketStates: true,
      eventProjections: {
        orderBy: { modelRun: { createdAt: "desc" } },
        take: 1
      },
      playerProjections: {
        orderBy: { modelRun: { createdAt: "desc" } }
      }
    }
  });

  for (const event of events) {
    await prisma.edgeSignal.updateMany({
      where: { eventId: event.id, isActive: true },
      data: { isActive: false, expiresAt: new Date() }
    });

    const eventProjection = event.eventProjections[0];
    for (const marketState of event.currentMarketStates) {
      if (marketState.marketType === "moneyline" && eventProjection) {
        const noVig = noVigFromTwoWay(
          marketState.bestHomeOddsAmerican ? (marketState.bestHomeOddsAmerican > 0 ? 100 / (marketState.bestHomeOddsAmerican + 100) : Math.abs(marketState.bestHomeOddsAmerican) / (Math.abs(marketState.bestHomeOddsAmerican) + 100)) : null,
          marketState.bestAwayOddsAmerican ? (marketState.bestAwayOddsAmerican > 0 ? 100 / (marketState.bestAwayOddsAmerican + 100) : Math.abs(marketState.bestAwayOddsAmerican) / (Math.abs(marketState.bestAwayOddsAmerican) + 100)) : null
        );

        const homeEV =
          typeof marketState.bestHomeOddsAmerican === "number" && typeof eventProjection.winProbHome === "number"
            ? calculateEV({ offeredOddsAmerican: marketState.bestHomeOddsAmerican, modelProbability: eventProjection.winProbHome })
            : null;
        if (homeEV !== null && marketState.bestHomeBookId) {
          await prisma.edgeSignal.create({
            data: {
              eventId: event.id,
              marketType: marketState.marketType,
              sportsbookId: marketState.bestHomeBookId,
              side: "home",
              lineValue: marketState.consensusLineValue,
              offeredOddsAmerican: marketState.bestHomeOddsAmerican!,
              fairOddsAmerican: null,
              modelProb: eventProjection.winProbHome!,
              noVigProb: noVig?.left ?? null,
              evPercent: homeEV,
              kellyFull: Math.min(25, (kellySize({ offeredOddsAmerican: marketState.bestHomeOddsAmerican!, modelProbability: eventProjection.winProbHome! }) ?? 0)),
              kellyHalf: Math.min(12.5, (kellySize({ offeredOddsAmerican: marketState.bestHomeOddsAmerican!, modelProbability: eventProjection.winProbHome! }) ?? 0) / 2),
              confidenceScore: confidenceLabel(20, homeEV / 100, noVig?.hold ?? 0),
              edgeScore: homeEV + confidenceLabel(20, homeEV / 100, noVig?.hold ?? 0) / 10,
              flagsJson: ["MODEL_EDGE", ...(noVig && (noVig.hold < 0.04) ? ["LOW_HOLD_MARKET"] : [])] as Prisma.InputJsonValue,
              modelRunId: eventProjection.modelRunId,
              isActive: true
            }
          });
        }
      }

      if (marketState.playerId) {
        const projections = event.playerProjections.filter(
          (projection) =>
            projection.playerId === marketState.playerId &&
            (projection.statKey === marketState.marketType || projection.statKey === "other")
        );
        const projection = projections[0];
        const offeredOdds =
          marketState.bestOverOddsAmerican ?? marketState.bestHomeOddsAmerican ?? null;
        if (projection && typeof offeredOdds === "number" && (marketState.bestOverBookId ?? marketState.bestHomeBookId)) {
          const line = marketState.consensusLineValue ?? projection.meanValue;
          const hitProbOver = 1 / (1 + Math.exp(-(projection.meanValue - line) / Math.max(1, projection.stdDev ?? 1)));
          const evPercent = calculateEV({
            offeredOddsAmerican: offeredOdds,
            modelProbability: hitProbOver
          });
          if (evPercent !== null) {
            await prisma.edgeSignal.create({
              data: {
                eventId: event.id,
                marketType: marketState.marketType,
                playerId: projection.playerId,
                sportsbookId: marketState.bestOverBookId ?? marketState.bestHomeBookId!,
                side: marketState.bestOverBookId ? "over" : "home",
                lineValue: line,
                offeredOddsAmerican: offeredOdds,
                modelProb: hitProbOver,
                noVigProb: null,
                evPercent,
                kellyFull: Math.min(25, kellySize({ offeredOddsAmerican: offeredOdds, modelProbability: hitProbOver }) ?? 0),
                kellyHalf: Math.min(12.5, (kellySize({ offeredOddsAmerican: offeredOdds, modelProbability: hitProbOver }) ?? 0) / 2),
                confidenceScore: confidenceLabel(
                  Number((projection.metadataJson as Record<string, unknown> | null)?.sampleSize ?? 10),
                  evPercent / 100,
                  0.05
                ),
                edgeScore: evPercent + confidenceLabel(10, evPercent / 100, 0.05) / 10,
                flagsJson: ["MODEL_EDGE", "PROP_OUTLIER"] as Prisma.InputJsonValue,
                modelRunId: projection.modelRunId,
                isActive: true
              }
            });
          }
        }
      }
    }
  }
}
