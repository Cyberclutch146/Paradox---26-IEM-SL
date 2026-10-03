/**
 * Agent 1 — Risk-Scoring.
 *
 * Returns, per state, the zone the model ranks highest, with its tier, score,
 * range, confidence flag and one-line driver (PRD FR-2). The score is a
 * relative ranking score, NOT a probability, and is never returned without
 * its range (PRD NFR "reliability under uncertainty").
 */
import type { RiskLevel, RiskZoneFeature } from "@/data/types";
import { getMockRiskZones } from "@/lib/mock-store";
import { regionName } from "./places";
import type { Hazard, RiskFinding } from "./types";

export const TIER_RANK: Record<RiskLevel, number> = { low: 1, watch: 2, warning: 3, danger: 4 };

function hazardMatches(zone: RiskZoneFeature, hazard: Hazard): boolean {
  if (hazard === "any") return true;
  const kind = zone.properties.riskType;
  return kind === hazard || kind === "combined";
}

function byRisk(a: RiskZoneFeature, b: RiskZoneFeature): number {
  const tier = TIER_RANK[b.properties.riskLevel] - TIER_RANK[a.properties.riskLevel];
  return tier !== 0 ? tier : b.properties.riskScore - a.properties.riskScore;
}

/** Scores one state. Prefers zones that match the asked-about hazard; falls back to the riskiest zone overall. */
export function scoreRegion(regionId: string, hazard: Hazard): RiskFinding | null {
  const zones = getMockRiskZones(regionId).features;
  if (zones.length === 0) return null;

  const matching = zones.filter((zone) => hazardMatches(zone, hazard)).sort(byRisk);
  const top = matching[0] ?? [...zones].sort(byRisk)[0];
  const p = top.properties;

  return {
    regionId,
    regionName: regionName(regionId),
    zoneId: p.zone_id,
    zoneName: p.name,
    tier: p.riskLevel,
    score: p.riskScore,
    range: p.riskRange,
    confident: p.confident,
    driver: p.driver,
    zoneHazard: p.riskType,
    hazardMatches: hazardMatches(top, hazard),
    zonesMonitored: zones.length,
  };
}

export function riskScoringAgent(regionIds: string[], hazard: Hazard): RiskFinding[] {
  return regionIds
    .map((id) => scoreRegion(id, hazard))
    .filter((finding): finding is RiskFinding => finding !== null)
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.score - a.score);
}
