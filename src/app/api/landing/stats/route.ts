import { NextResponse } from "next/server";

export const dynamic = "force-static";

const LANDING_STATS = {
  totalOrders: 200_000,
  activeShops: 250,
  successRate: 98.6,
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export function GET() {
  return NextResponse.json(LANDING_STATS, { headers: CACHE_HEADERS });
}
