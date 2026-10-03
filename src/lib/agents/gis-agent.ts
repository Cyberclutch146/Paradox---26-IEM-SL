/**
 * Agent 3 — Satellite/GIS.
 *
 * Gives a risk zone a place: its centre, bounding box, approximate area,
 * terrain (slope / relief, when the GIS pipeline has supplied it) and what is
 * exposed inside it (villages, road km). Keyed by zone_id, the join key the
 * Risk-Scoring Agent also uses.
 */
import type { RiskZoneFeature } from "@/data/types";
import { getMockRiskZones } from "@/lib/mock-store";
import type { GisFinding } from "./types";

const KM_PER_DEG_LAT = 110.574;

function describeZone(zone: RiskZoneFeature): GisFinding {
  const ring = zone.geometry.coordinates[0] ?? [];
  const lngs = ring.map(([lng]) => lng);
  const lats = ring.map(([, lat]) => lat);
  const bbox = {
    minLat: Math.min(...lats),
    minLng: Math.min(...lngs),
    maxLat: Math.max(...lats),
    maxLng: Math.max(...lngs),
  };
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const kmPerDegLng = 111.32 * Math.cos((midLat * Math.PI) / 180);
  const areaKm2 =
    (bbox.maxLat - bbox.minLat) * KM_PER_DEG_LAT * (bbox.maxLng - bbox.minLng) * kmPerDegLng;
  const p = zone.properties;

  return {
    regionId: p.regionId,
    zoneId: p.zone_id,
    zoneName: p.name,
    centroid: {
      lat: Number(midLat.toFixed(3)),
      lng: Number(((bbox.minLng + bbox.maxLng) / 2).toFixed(3)),
    },
    bbox,
    areaKm2: Math.round(areaKm2),
    meanSlopeDeg: p.meanSlope ?? null,
    elevationRangeM: p.elevationRange ?? null,
    exposure: p.exposure ?? null,
    description: p.description,
  };
}

/** Describes the requested zones; when no zone ids are given, every zone in the regions. */
export function gisAgent(regionIds: string[], zoneIds?: string[]): GisFinding[] {
  const wanted = zoneIds && zoneIds.length > 0 ? new Set(zoneIds) : null;
  return regionIds.flatMap((regionId) =>
    getMockRiskZones(regionId)
      .features.filter((zone) => !wanted || wanted.has(zone.properties.zone_id))
      .map(describeZone)
  );
}
