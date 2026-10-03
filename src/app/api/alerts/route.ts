import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import { getMockAlerts } from "@/lib/mock-store";

export function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") || "arunachal";
  if (!db) return NextResponse.json(getMockAlerts(region));
  let query = "SELECT * FROM alerts";
  let params: any[] = [];
  
  if (region) {
    query += " WHERE regionId = ?";
    params.push(region);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  const alerts = rows.map((r) => ({
    id: r.id,
    severity: r.severity,
    regionId: r.regionId,
    region: r.region,
    description: r.description,
    timestamp: r.timestamp,
    type: r.type,
  }));

  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(alerts);
}