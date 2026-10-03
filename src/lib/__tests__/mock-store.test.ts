import { describe, expect, it } from "vitest";
import {
  getMockAlerts,
  getMockCommunity,
  getMockRegions,
  getMockRiskSummary,
  getMockRiskZones,
  getMockZoneReports,
} from "../mock-store";

describe("getMockAlerts", () => {
  it("returns all alerts without a region filter", () => {
    expect(getMockAlerts()).toHaveLength(7);
  });

  it("returns all alerts for the state-level Assam region", () => {
    expect(getMockAlerts("assam")).toHaveLength(1);
  });

  it("filters alerts to a single district", () => {
    const alerts = getMockAlerts("arunachal");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("danger");
    expect(alerts[0].regionId).toBe("arunachal");
  });

  it("returns none for unmonitored regions", () => {
    expect(getMockAlerts("mumbai")).toHaveLength(0);
  });

  it("counts the true danger alerts (ground truth is 2)", () => {
    const dangerAlerts = getMockAlerts().filter((alert) => alert.severity === "danger");
    expect(dangerAlerts).toHaveLength(2); // Assam and Arunachal are danger
  });
});

describe("getMockRiskZones", () => {
  it("filters zones per selected region", () => {
    const arunachal = getMockRiskZones("arunachal");
    const assam = getMockRiskZones("assam");
    expect(arunachal.features).toHaveLength(1);
    expect(assam.features).toHaveLength(1);
    expect(assam.features[0].properties.name).toBe("Majuli Basin");
  });
});

describe("getMockRiskSummary", () => {
  it("returns a global fallback for regions without zones", () => {
    const fallback = getMockRiskSummary("mumbai");
    expect(fallback).not.toBeNull();
    expect(fallback!.regionName).toBe("Global Location");
  });

  it("derives district summaries from the district's own zones", () => {
    const summary = getMockRiskSummary("assam");
    expect(summary!.level).toBe("danger");
    expect(summary!.score).toBe(0.024);
  });
});

describe("getMockZoneReports", () => {
  it("returns one report per monitored zone for the region", () => {
    expect(getMockZoneReports("assam")).toHaveLength(1);
    expect(getMockZoneReports("arunachal")).toHaveLength(1);
  });

  it("returns empty reports for unmonitored regions", () => {
    expect(getMockZoneReports("mumbai")).toHaveLength(0);
  });
});

describe("getMockRegions / getMockCommunity", () => {
  it("exposes regions and community messages through the data layer", () => {
    expect(getMockRegions().length).toBeGreaterThanOrEqual(7);
    expect(getMockCommunity().length).toBeGreaterThan(0);
  });
});