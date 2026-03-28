import { invalidateHotCache } from "@/lib/cache/live-cache";
import { prisma } from "@/lib/db/prisma";
import { recomputeCurrentMarketState } from "@/services/edges/edge-engine";

export async function currentMarketStateJob(eventId?: string) {
  await recomputeCurrentMarketState(eventId);

  if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { league: true }
    });
    if (event) {
      await invalidateHotCache(`board:v1:${event.league.key}`);
      await invalidateHotCache(`event:v1:${event.id}`);
    }
  } else {
    await invalidateHotCache("board:v1:all");
  }

  return {
    ok: true,
    eventId: eventId ?? null
  };
}
