import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import { getMockRiskZones } from "@/lib/mock-store";

export function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") || "arunachal";
  if (!db) return NextResponse.json(getMockRiskZones(region));
  let query = "SELECT * FROM risk_zones";
  let params: any[] = [];
  
  if (region && region !== "kerala") {
    query += " WHERE regionId = ?";
    params.push(region);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  const features = rows.map((r) => ({
    type: "Feature",
    properties: {
      zone_id: r.zone_id,
      name: r.name,
      district: r.district,
      regionId: r.regionId,
      riskLevel: r.riskLevel,
      riskScore: r.riskScore,
      riskRange: [r.riskRangeMin, r.riskRangeMax],
      confident: r.confident === 1,
      driver: r.driver,
      meanSlope: r.meanSlope,
      elevationRange: r.elevationRange,
      exposure: { villages: r.exposureVillages, roadKm: r.exposureRoadKm },
      riskType: r.riskType,
      description: r.description,
    },
    geometry: { type: "Polygon", coordinates: JSON.parse(r.coordinates) },
  }));

  return NextResponse.json({ type: "FeatureCollection", features });
}