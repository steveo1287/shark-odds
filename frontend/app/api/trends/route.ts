import { NextResponse } from "next/server";

import { getTrendApiResponse, parseTrendFilters } from "@/services/trends/trends-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseTrendFilters(
    Object.fromEntries(url.searchParams.entries())
  );
  const data = await getTrendApiResponse(filters);

  return NextResponse.json(data, {
    status: data.setup ? 503 : 200
  });
}
