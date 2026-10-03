import type {
  Alert,
  CommunityMessage,
  InsightData,
  Region,
  RiskZoneCollection,
  RiskSummary,
  ZoneReport,
} from "@/data/types";
import { REGIONS, findRegion } from "@/data/regions";
import { mockAlerts } from "@/data/mockAlerts";
import { mockRiskZones } from "@/data/mockRiskZones";
import { mockInsights } from "@/data/mockInsights";
import { mockCommunityMessages } from "@/data/mockCommunity";
import { computeRiskSummary } from "./risk-summary";

const ALL_REGION_ID = "kerala";

function filterByRegion<T extends { regionId: string }>(items: T[], regionId?: string): T[] {
  if (!regionId || regionId === ALL_REGION_ID) return items;
  const filtered = items.filter((item) => item.regionId === regionId);
  if (filtered.length > 0) return filtered;
  return items.slice(0, 5).map((item) => ({ ...item, regionId }));
}

function filterZonesByRegion(regionId?: string) {
  if (!regionId || regionId === ALL_REGION_ID) return mockRiskZones.features;
  const filtered = mockRiskZones.features.filter((zone) => zone.properties.regionId === regionId);
  if (filtered.length > 0) return filtered;
  return mockRiskZones.features.map((zone) => ({
    ...zone,
    properties: { ...zone.properties, regionId },
  }));
}

export function getMockRegions(): Region[] {
  return REGIONS;
}

export function getMockAlerts(regionId?: string): Alert[] {
  return filterByRegion(mockAlerts, regionId);
}

export function getMockRiskZones(regionId?: string): RiskZoneCollection {
  return {
    type: "FeatureCollection",
    features: filterZonesByRegion(regionId),
  };
}

export function getMockInsights(regionId?: string): InsightData[] {
  if (!regionId || regionId === ALL_REGION_ID) return mockInsights;

  // Simple deterministic hash based on regionId
  const seed = regionId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return mockInsights.map((insight, index) => {
    const randomFactor = ((seed + index * 17) % 100) / 100;
    const variance = (randomFactor - 0.5) * 0.5; // -25% to +25%
    const baseValue = parseFloat(insight.value);
    
    const newValue = Math.max(0, baseValue * (1 + variance));
    const isUp = randomFactor > 0.5;
    const newSparkline = insight.sparklineData.map(v => Math.max(0, v * (1 + variance)));

    return {
      ...insight,
      value: insight.unit === "zones" ? Math.round(newValue).toString() : newValue.toFixed(1),
      trend: isUp ? "up" : "down",
      trendValue: (isUp ? "+" : "-") + (baseValue * Math.abs(variance)).toFixed(1) + (insight.unit === "zones" ? " zones" : insight.unit),
      sparklineData: newSparkline,
      status: newValue > (insight.threshold || baseValue * 1.1) ? "danger" : newValue > (insight.threshold ? insight.threshold * 0.85 : baseValue * 0.9) ? "warning" : "normal",
    };
  });
}

export function getMockCommunity(): CommunityMessage[] {
  return mockCommunityMessages;
}

export function getMockRiskSummary(regionId?: string): RiskSummary | null {
  const region = regionId ? findRegion(regionId) : null;
  const zones = getMockRiskZones(regionId).features;
  if (!region) {
    return {
      regionId: regionId || "unknown",
      regionName: "Global Location",
      score: 65.4,
      level: "warning",
      trend: "stable",
      trendDelta: "Normal",
      confidence: 70,
      updatedAt: new Date(),
      factors: [
        { label: "Rainfall", value: "45 mm/24h", level: "watch" },
        { label: "Soil Moisture", value: "60%", level: "warning" },
        { label: "Slope Stability", value: "0.8 idx", level: "low" },
      ],
    };
  }
  return computeRiskSummary(region, zones, getMockInsights(regionId));
}

export function getMockZoneReports(regionId?: string): ZoneReport[] {
  const features = getMockRiskZones(regionId).features;
  return features.map((feature) => ({
    id: (feature as { id?: string }).id ?? slugify(feature.properties.name),
    name: feature.properties.name,
    regionId: feature.properties.regionId,
    riskLevel: feature.properties.riskLevel,
    riskType: feature.properties.riskType,
    riskScore: feature.properties.riskScore,
    description: feature.properties.description,
  }));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isKnownRegion(id?: string): boolean {
  return Boolean(id && findRegion(id));
}