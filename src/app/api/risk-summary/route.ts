import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { computeRiskSummary } from "@/lib/risk-summary";

import { getMockRiskSummary } from "@/lib/mock-store";

export function GET(request: NextRequest) {
  const regionId = request.nextUrl.searchParams.get("region");
  if (!db) return NextResponse.json(getMockRiskSummary(regionId || undefined));
  if (!regionId) return NextResponse.json({ error: "Missing region" }, { status: 400 });

  // Get region
  const regionRow = db.prepare("SELECT * FROM regions WHERE id = ?").get(regionId) as any;
  if (!regionRow) return NextResponse.json(null);

  const region = {
    id: regionRow.id,
    name: regionRow.name,
    subLabel: regionRow.subLabel,
    type: regionRow.id === "kerala" || regionRow.id === "uttarakhand" || regionRow.id === "assam" ? "state" : (regionRow.id === "kochi" || regionRow.id === "mumbai" ? "metro" : "district"),
    center: { lat: regionRow.mapCenterLat, lng: regionRow.mapCenterLng },
    zoom: regionRow.mapZoom,
  } as any;

  // Get zones
  let query = "SELECT * FROM risk_zones";
  let params: any[] = [];
  if (regionId !== "kerala") {
    query += " WHERE regionId = ?";
    params.push(regionId);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  const zones = rows.map((r) => ({
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
  })) as any[];

  // Compute summary
  const summary = computeRiskSummary(region, zones, []);
  
  return NextResponse.json(summary);
}