import { describe, expect, it } from "vitest";
import { alertAgent } from "../alert-agent";
import { communityAgent } from "../community-agent";
import { composeAnswer } from "../composer";
import { fuse, runOrchestrator } from "../orchestrator";
import { scoreRegion } from "../risk-agent";
import type { CommunityFinding, RiskFinding } from "../types";

function risk(overrides: Partial<RiskFinding> = {}): RiskFinding {
  return {
    regionId: "nagaland",
    regionName: "Nagaland",
    zoneId: "NL_01",
    zoneName: "Kohima Hills",
    tier: "watch",
    score: 0.008,
    range: [0.004, 0.012],
    confident: true,
    driver: "Soil saturation",
    zoneHazard: "landslide",
    hazardMatches: true,
    zonesMonitored: 1,
    ...overrides,
  };
}

function community(status: CommunityFinding["status"], corroborations: number): CommunityFinding {
  return { regionId: "nagaland", reports: [], corroborations, verifiedOfficer: false, status };
}

describe("runOrchestrator routing", () => {
  it("routes a risk question to Risk-Scoring, GIS and Community, then fuses", () => {
    const result = runOrchestrator({ intent: "risk", regionIds: ["mizoram"], hazard: "landslide" });
    expect(result.steps.map((s) => s.agent)).toEqual(["orchestrator", "risk", "gis", "community", "orchestrator"]);
    expect(result.risk[0]).toMatchObject({ regionId: "mizoram", zoneId: "MZ_01", range: [0.003, 0.01] });
    expect(result.gis[0].exposure).toEqual({ villages: 15, roadKm: 20 });
    expect(result.fused).toHaveLength(1);
  });

  it("only calls the agents an intent needs", () => {
    const reports = runOrchestrator({ intent: "reports", regionIds: ["assam"], hazard: "any" });
    expect(reports.steps.map((s) => s.agent)).toEqual(["orchestrator", "community"]);
    expect(reports.risk).toEqual([]);

    const alert = runOrchestrator({ intent: "alert", regionIds: ["arunachal"], hazard: "landslide" });
    expect(alert.steps.map((s) => s.agent)).toContain("alert");
    expect(alert.alerts[0].compressed.length).toBeLessThanOrEqual(160);
  });

  it("ranks every state for a comparison, riskiest first", () => {
    const result = runOrchestrator({
      intent: "compare",
      regionIds: ["tripura", "assam", "mizoram", "arunachal", "meghalaya", "nagaland", "manipur"],
      hazard: "any",
    });
    expect(result.risk.map((r) => r.regionId)).toEqual([
      "assam", "arunachal", "meghalaya", "nagaland", "manipur", "mizoram", "tripura",
    ]);
  });

  it("drops region ids the platform does not cover", () => {
    const result = runOrchestrator({ intent: "risk", regionIds: ["sikkim", "kerala"], hazard: "any" });
    expect(result.request.regionIds).toEqual([]);
    expect(result.risk).toEqual([]);
  });
});

describe("Risk-Scoring Agent", () => {
  it("says when the monitored zone is a different hazard than the one asked about", () => {
    const finding = scoreRegion("mizoram", "landslide");
    expect(finding?.zoneHazard).toBe("flood");
    expect(finding?.hazardMatches).toBe(false);
  });

  it("counts combined zones as matching either hazard", () => {
    expect(scoreRegion("meghalaya", "landslide")?.hazardMatches).toBe(true);
  });
});

describe("Community Agent corroboration", () => {
  it("never confirms a single report and ignores questions and updates", () => {
    const [mizoram] = communityAgent(["mizoram"]);
    expect(mizoram.reports).toHaveLength(1); // a question from Aizawl
    expect(mizoram.status).toBe("none");

    const [assam] = communityAgent(["assam"]);
    expect(assam.corroborations).toBe(1);
    expect(assam.status).toBe("unconfirmed");
  });
});

describe("fusion policy", () => {
  it("raises the tier one step only for confirmed reports", () => {
    expect(fuse(risk(), community("confirmed", 3)).fusedTier).toBe("warning");
    expect(fuse(risk({ tier: "danger" }), community("confirmed", 4)).fusedTier).toBe("danger");
  });

  it("never lets unconfirmed reports change the tier", () => {
    expect(fuse(risk(), community("unconfirmed", 2)).fusedTier).toBe("watch");
  });

  it("flags disagreement between sensor and ground", () => {
    expect(fuse(risk({ tier: "low" }), community("confirmed", 3)).disagreement).toBe(true);
    expect(fuse(risk({ tier: "danger" }), community("none", 0)).disagreement).toBe(true);
    expect(fuse(risk({ tier: "warning" }), community("unconfirmed", 1)).disagreement).toBe(false);
  });
});

describe("Alert Agent", () => {
  it("includes tier, range, driver and corroboration, and stays within SMS length", () => {
    const draft = alertAgent({
      risk: risk({ tier: "danger", driver: "x".repeat(200) }),
      gis: undefined,
      community: community("unconfirmed", 1),
      fused: undefined,
      audience: "community",
    });
    expect(draft.full).toContain("range 0.004-0.012");
    expect(draft.full).toContain("1 community report (unconfirmed)");
    expect(draft.full).toContain("does not replace");
    expect(draft.compressed.length).toBeLessThanOrEqual(160);
  });
});

describe("composeAnswer honesty rules", () => {
  it("always pairs the score with its range and never calls it a probability", () => {
    const result = runOrchestrator({ intent: "risk", regionIds: ["mizoram"], hazard: "landslide" });
    const text = composeAnswer(result, []);
    expect(text).toContain("0.006 (range 0.003–0.010)");
    expect(text).toContain("flagged for **flood**");
    expect(text).toMatch(/not a percentage chance/);
    expect(text).not.toMatch(/\d+(\.\d+)?\s?% (chance|probability)/);
  });

  it("refuses to guess for out-of-scope places", () => {
    const result = runOrchestrator({ intent: "risk", regionIds: [], hazard: "landslide" });
    expect(composeAnswer(result, ["Sikkim"])).toMatch(/Sikkim is outside/);
  });
});
