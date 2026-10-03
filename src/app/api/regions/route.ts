import { NextResponse } from "next/server";
import db from "@/lib/db";

import { getMockRegions } from "@/lib/mock-store";

export function GET() {
  if (!db) return NextResponse.json(getMockRegions());
  const rows = db.prepare("SELECT * FROM regions").all() as any[];
  const regions = rows.map((r) => ({
    id: r.id,
    name: r.name,
    subLabel: r.subLabel,
    type: r.id === "kerala" || r.id === "uttarakhand" || r.id === "assam" ? "state" : (r.id === "kochi" || r.id === "mumbai" ? "metro" : "district"),
    center: { lat: r.mapCenterLat, lng: r.mapCenterLng },
    zoom: r.mapZoom,
  }));
  return NextResponse.json(regions);
}