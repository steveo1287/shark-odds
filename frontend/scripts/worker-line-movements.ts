import { prisma } from "@/lib/db/prisma";
import { lineMovementJob } from "@/services/jobs/line-movement-job";
import { getBooleanArg, getStringArg, logStep, parseArgs } from "./_runtime-utils";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const eventId = getStringArg(args, "eventId");
  const leagueKey = getStringArg(args, "leagueKey");
  const liveOnly = getBooleanArg(args, "liveOnly");

  if (eventId) {
    logStep("worker:line-movements:start", { eventId });
    const result = await lineMovementJob(eventId);
    logStep("worker:line-movements:done", result);
    return;
  }

  const events = await prisma.event.findMany({
    where: {
      ...(leagueKey ? { league: { key: leagueKey } } : {}),
      ...(liveOnly ? { status: "LIVE" } : {}),
      startTime: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 8),
        lte: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    },
    select: { id: true }
  });

  logStep("worker:line-movements:batch", {
    count: events.length,
    leagueKey: leagueKey ?? null,
    liveOnly
  });
  for (const event of events) {
    await lineMovementJob(event.id);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
