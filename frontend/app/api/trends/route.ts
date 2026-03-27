import { NextResponse } from "next/server";

import { getTrendBundle } from "@/lib/trends/engine";
import { trendFiltersSchema } from "@/lib/validation/filters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = trendFiltersSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const payload = await getTrendBundle(filters);
  const status = payload.data.some((entry) => entry.sampleSize > 0) ? 200 : 200;

  return NextResponse.json(payload, { status });
}
