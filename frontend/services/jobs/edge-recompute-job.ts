import { buildEventProjectionFromHistory, buildPlayerPropProjectionsForEvent } from "@/services/modeling/model-engine";
import { recomputeCurrentMarketState, recomputeEdgeSignals } from "@/services/edges/edge-engine";
import { ingestEventProjection, ingestPlayerProjection } from "@/services/market-data/market-data-service";

function isProjection(
  value: Awaited<ReturnType<typeof buildPlayerPropProjectionsForEvent>>[number]
): value is NonNullable<Awaited<ReturnType<typeof buildPlayerPropProjectionsForEvent>>[number]> {
  return value !== null;
}

export async function edgeRecomputeJob(eventId: string) {
  const eventProjection = await buildEventProjectionFromHistory(eventId);
  if (eventProjection) {
    await ingestEventProjection(eventProjection);
  }

  const playerProjections = await buildPlayerPropProjectionsForEvent(eventId);
  for (const projection of playerProjections.filter(isProjection)) {
    await ingestPlayerProjection(projection);
  }

  await recomputeCurrentMarketState(eventId);
  await recomputeEdgeSignals(eventId);

  return {
    eventId,
    eventProjectionBuilt: Boolean(eventProjection),
    playerProjectionCount: playerProjections.length
  };
}
