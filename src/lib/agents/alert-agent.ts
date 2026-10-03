/**
 * Agent 4 — Alert & Routing.
 *
 * Drafts a severity-appropriate alert for one audience, in a full form and a
 * compressed SMS form (FR-8, FR-9, FR-11). Every draft carries the tier, the
 * range, the driver and the corroboration count, and says it supports, not
 * replaces, the official authority. Translation (IndicTrans2) plugs in here later.
 */
import type { RiskLevel } from "@/data/types";
import type { AlertDraft, Audience, CommunityFinding, FusedView, GisFinding, RiskFinding } from "./types";

const SMS_LIMIT = 160;

const TIER_WORD: Record<RiskLevel, string> = {
  danger: "DANGER",
  warning: "WARNING",
  watch: "WATCH",
  low: "LOW",
};

const ACTION: Record<Audience, Record<RiskLevel, string>> = {
  community: {
    danger: "Move away from steep slopes and river banks now. Follow instructions from local officials.",
    warning: "Avoid steep slopes and slope-side roads. Be ready to move if told to.",
    watch: "Stay alert. Report cracks, new springs or falling stones in the community chat.",
    low: "No action needed. Keep reporting anything unusual.",
  },
  district: {
    danger: "Consider pre-positioning response teams and closing exposed road stretches.",
    warning: "Review exposed villages and roads; keep response teams on standby.",
    watch: "Monitor; verify community reports with field officers.",
    low: "Routine monitoring.",
  },
  authority: {
    danger: "Escalation candidate: coordinate with DDMA and verify on the ground.",
    warning: "Track for escalation; check neighbouring districts.",
    watch: "Include in the daily situation report.",
    low: "No escalation.",
  },
};

function fmt(n: number): string {
  return n.toFixed(3);
}

export function alertAgent(input: {
  risk: RiskFinding;
  gis: GisFinding | undefined;
  community: CommunityFinding | undefined;
  fused: FusedView | undefined;
  audience: Audience;
}): AlertDraft {
  const { risk, gis, community, fused, audience } = input;
  const severity = fused?.fusedTier ?? risk.tier;
  const corroboration = community
    ? `${community.corroborations} community report${community.corroborations === 1 ? "" : "s"} (${community.status})`
    : "no community reports";
  const exposure = gis?.exposure
    ? `${gis.exposure.villages} villages and ${gis.exposure.roadKm} km of road in the zone.`
    : "";

  const full = [
    `${TIER_WORD[severity]}: ${risk.zoneName}, ${risk.regionName}.`,
    `${risk.zoneHazard === "combined" ? "Flood and landslide" : risk.zoneHazard === "flood" ? "Flood" : "Landslide"} risk tier ${severity}, score ${fmt(risk.score)} (range ${fmt(risk.range[0])}-${fmt(risk.range[1])}, ${risk.confident ? "confident" : "low confidence"}).`,
    `Main cause: ${risk.driver}.`,
    `Ground: ${corroboration}.`,
    exposure,
    ACTION[audience][severity],
    "This supports, and does not replace, official DDMA/SDMA advice.",
  ]
    .filter(Boolean)
    .join(" ");

  const compressedParts = [
    `${TIER_WORD[severity]} ${risk.zoneName}`,
    `risk ${fmt(risk.range[0])}-${fmt(risk.range[1])}`,
    risk.driver,
    community ? `${community.corroborations} rpt` : "",
  ].filter(Boolean);
  let compressed = compressedParts.join(" | ");
  if (compressed.length > SMS_LIMIT) compressed = `${compressed.slice(0, SMS_LIMIT - 1)}…`;

  return { regionId: risk.regionId, audience, severity, full, compressed };
}
