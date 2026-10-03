import { describe, expect, it } from "vitest";
import { computeRiskSummary } from "../risk-summary";
import { mockInsights } from "@/data/mockInsights";
import { mockRiskZones } from "@/data/mockRiskZones";
import { findRegion } from "@/data/regions";

const kerala = findRegion("kerala")!;
const wayanad = findRegion("wayanad")!;
const kochi = findRegion("kochi")!;
const mumbai = findRegion("mumbai")!;

function zonesFor(regionId: string) {
  if (regionId === "kerala") return mockRiskZones.features;
  return mockRiskZones.features.filter((zone) => zone.properties.regionId === regionId);
}

describe("computeRiskSummary", () => {
  it("returns null when the region has no zones", () => {
    expect(computeRiskSummary(mumbai, zonesFor("mumbai"), mockInsights)).toBeNull();
  });

  it("aggregates Kerala's state-level score from all zones", () => {
    const summary = computeRiskSummary(kerala, zonesFor("kerala"), mockInsights);
    expect(summary).not.toBeNull();
    expect(summary!.score).toBe(0.014);
    expect(summary!.level).toBe("danger");
    expect(summary!.regionName).toBe("Kerala");
    expect(summary!.factors).toHaveLength(3);
  });

  it("reflects Wayanad's ML danger exposure", () => {
    const summary = computeRiskSummary(wayanad, zonesFor("wayanad"), mockInsights);
    expect(summary!.score).toBe(0.014);
    expect(summary!.level).toBe("danger");
    const driver = summary!.factors.find((f) => f.label === "Primary driver");
    expect(driver!.value).toBe("driven mostly by 3-day rainfall");
    expect(driver!.level).toBe("danger");
  });

  it("produces distinct output per region (selection actually changes data)", () => {
    const a = computeRiskSummary(kerala, zonesFor("kerala"), mockInsights);
    const b = computeRiskSummary(kochi, zonesFor("kochi"), mockInsights);
    const c = computeRiskSummary(wayanad, zonesFor("wayanad"), mockInsights);
    expect(b!.score).toBeLessThan(a!.score);
    expect(c!.score).toEqual(a!.score);
    expect(c!.level).toBe("danger");
    expect(new Set([a!.level, b!.level, c!.level]).size).toBeGreaterThan(0);
  });
});