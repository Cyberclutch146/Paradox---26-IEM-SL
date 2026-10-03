import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import { getMockInsights } from "@/lib/mock-store";

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const regionId = url.searchParams.get("region") || undefined;

  if (!db) return NextResponse.json(getMockInsights(regionId));
  const rows = db.prepare("SELECT * FROM insights").all() as any[];
  const insights = rows.map((r) => ({
    id: r.id,
    title: r.title,
    value: r.value,
    unit: r.unit,
    trend: r.trend,
    trendValue: r.trendValue,
    sparklineData: JSON.parse(r.sparklineData),
    threshold: r.threshold,
    status: r.status,
  }));
  return NextResponse.json(insights);
}