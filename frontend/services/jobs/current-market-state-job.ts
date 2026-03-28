import { recomputeCurrentMarketState } from "@/services/edges/edge-engine";

export async function currentMarketStateJob(eventId?: string) {
  await recomputeCurrentMarketState(eventId);
  return {
    ok: true,
    eventId: eventId ?? null
  };
}
