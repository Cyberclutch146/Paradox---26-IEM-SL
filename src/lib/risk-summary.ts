import type {
  InsightData,
  Region,
  RiskLevel,
  RiskZoneFeature,
  RiskSummary,
} from "@/data/types";

const tierWeights = { danger: 4, warning: 3, watch: 2, low: 1 };
type TierKey = keyof typeof tierWeights;

export function computeRiskSummary(
  region: Region,
  zones: RiskZoneFeature[],
  _insights: InsightData[]
): RiskSummary | null {
  if (zones.length === 0) return null;

  // Find the zone with the highest risk tier and score to represent the region's overall risk
  const highestZone = zones.reduce((highest, current) => {
    const wH = tierWeights[highest.properties.riskLevel as TierKey] || 1;
    const wC = tierWeights[current.properties.riskLevel as TierKey] || 1;
    if (wC > wH) return current;
    if (wC === wH && current.properties.riskScore > highest.properties.riskScore) return current;
    return highest;
  }, zones[0]);

  const hProps = highestZone.properties;
  
  return {
    regionId: region.id,
    regionName: region.name,
    score: hProps.riskScore,
    level: hProps.riskLevel,
    trend: hProps.riskLevel === "danger" || hProps.riskLevel === "warning" ? "up" : "stable",
    trendDelta: hProps.riskLevel === "danger" ? "Critical" : hProps.riskLevel === "warning" ? "Elevated" : "Normal",
    confidence: hProps.confident ? 95 : 60,
    updatedAt: new Date(),
    factors: [
      { label: "Primary driver", value: hProps.driver || "Normal baseline conditions", level: hProps.riskLevel },
      { label: "Confidence", value: hProps.confident ? "High" : "Low", level: hProps.confident ? "low" : "warning" },
      { label: "Range", value: hProps.riskRange ? `${hProps.riskRange[0].toFixed(3)} - ${hProps.riskRange[1].toFixed(3)}` : "N/A", level: "watch" },
    ],
  };
}