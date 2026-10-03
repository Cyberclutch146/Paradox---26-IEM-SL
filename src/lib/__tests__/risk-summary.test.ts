import { describe, expect, it } from "vitest";
import { computeRiskSummary } from "../risk-summary";
import { mockInsights } from "@/data/mockInsights";
import { mockRiskZones } from "@/data/mockRiskZones";
import { findRegion } from "@/data/regions";

const arunachal = findRegion("arunachal")!;
const assam = findRegion("assam")!;
const tripura = findRegion("tripura")!;
const mumbai = { id: "mumbai", name: "Mumbai", type: "metro", center: { lat: 19, lng: 72 }, zoom: 10 } as any;

function zonesFor(regionId: string) {
  return mockRiskZones.features.filter((zone) => zone.properties.regionId === regionId);
}

describe("computeRiskSummary", () => {
  it("returns null when the region has no zones", () => {
    expect(computeRiskSummary(mumbai, zonesFor("mumbai"), mockInsights)).toBeNull();
  });

  it("aggregates state-level score from all zones", () => {
    const summary = computeRiskSummary(assam, zonesFor("assam"), mockInsights);
    expect(summary).not.toBeNull();
    expect(summary!.score).toBe(0.024);
    expect(summary!.level).toBe("danger");
    expect(summary!.regionName).toBe("Assam");
    expect(summary!.factors).toHaveLength(3);
  });

  it("reflects Assam's ML danger exposure", () => {
    const summary = computeRiskSummary(assam, zonesFor("assam"), mockInsights);
    expect(summary!.score).toBe(0.024);
    expect(summary!.level).toBe("danger");
    const driver = summary!.factors.find((f) => f.label === "Primary driver");
    expect(driver!.value).toBe("Brahmaputra river overflow");
    expect(driver!.level).toBe("danger");
  });

  it("produces distinct output per region", () => {
    const a = computeRiskSummary(arunachal, zonesFor("arunachal"), mockInsights);
    const b = computeRiskSummary(assam, zonesFor("assam"), mockInsights);
    const c = computeRiskSummary(tripura, zonesFor("tripura"), mockInsights);
    expect(a!.score).not.toEqual(b!.score);
    expect(b!.score).toBeGreaterThan(c!.score);
    expect(b!.level).toBe("danger");
  });
});