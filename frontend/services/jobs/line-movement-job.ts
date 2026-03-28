import { prisma } from "@/lib/db/prisma";

export async function lineMovementJob(eventId?: string) {
  const markets = await prisma.eventMarket.findMany({
    where: eventId ? { eventId } : undefined,
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 2
      }
    }
  });

  let created = 0;
  for (const market of markets) {
    if (market.snapshots.length < 2 || !market.sportsbookId) {
      continue;
    }
    const [latest, previous] = market.snapshots;
    if (latest.oddsAmerican === previous.oddsAmerican && latest.line === previous.line) {
      continue;
    }
    await prisma.lineMovement.create({
      data: {
        eventId: market.eventId,
        marketType: market.marketType,
        sportsbookId: market.sportsbookId,
        side: market.side ?? market.selection,
        playerId: null,
        lineValue: latest.line,
        oldOddsAmerican: previous.oddsAmerican,
        newOddsAmerican: latest.oddsAmerican,
        oldLineValue: previous.line,
        newLineValue: latest.line,
        movementType:
          latest.line !== previous.line
            ? "steam"
            : "stale-correction"
      }
    });
    created += 1;
  }

  return { created };
}
