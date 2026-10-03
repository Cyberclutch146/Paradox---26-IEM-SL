/**
 * The Orchestrator (PRD 5.2).
 *
 * Takes one structured request, decides which agents it needs, runs them,
 * and fuses the two legible signals: the Risk-Scoring Agent's sensor tier
 * and the Community Agent's corroboration count. Every agent call is
 * recorded as a step so the chatbot can show its working.
 *
 * Fusion policy (rule-based, per PRD MVP scope):
 *  - Confirmed community reports raise the tier by one step (max danger).
 *  - Unconfirmed reports never change the tier on their own; they are only noted.
 *  - "Disagreement" is flagged when confirmed reports exist but the sensor
 *    says low/watch, or the sensor says danger with no ground reports at all.
 */
import type { RiskLevel } from "@/data/types";
import { alertAgent } from "./alert-agent";
import { communityAgent } from "./community-agent";
import { gisAgent } from "./gis-agent";
import { isCoveredRegion, regionName } from "./places";
import { TIER_RANK, riskScoringAgent } from "./risk-agent";
import type {
  AgentName,
  AgentStep,
  CommunityFinding,
  FusedView,
  OrchestratorRequest,
  OrchestratorResult,
  RiskFinding,
} from "./types";

const TIERS: RiskLevel[] = ["low", "watch", "warning", "danger"];

/** Which agents each intent needs, in call order. */
export const ROUTES: Record<OrchestratorRequest["intent"], AgentName[]> = {
  risk: ["risk", "gis", "community"],
  compare: ["risk"],
  exposure: ["risk", "gis"],
  reports: ["community"],
  alert: ["risk", "gis", "community", "alert"],
  explain: [],
  smalltalk: [],
};

export function fuse(risk: RiskFinding, community: CommunityFinding | undefined): FusedView {
  const sensorTier = risk.tier;
  const status = community?.status ?? "none";
  const sensorRank = TIER_RANK[sensorTier];
  let fusedTier = sensorTier;
  let rationale = `Sensor tier ${sensorTier}; no ground reports to weigh.`;

  if (status === "confirmed") {
    fusedTier = TIERS[Math.min(sensorRank, TIERS.length - 1)];
    rationale = `Sensor tier ${sensorTier}, raised one step by ${community?.corroborations} confirmed community reports.`;
  } else if (status === "unconfirmed") {
    rationale = `Sensor tier ${sensorTier}. ${community?.corroborations} unconfirmed community report(s) noted but not counted (needs 3 people or a verified officer).`;
  }

  const disagreement =
    (status === "confirmed" && sensorRank <= TIER_RANK.watch) ||
    (status === "none" && sensorTier === "danger");

  return { regionId: risk.regionId, sensorTier, fusedTier, disagreement, rationale };
}

function step(agent: AgentName, label: string, detail: string): AgentStep {
  return { agent, label, detail };
}

export function runOrchestrator(input: OrchestratorRequest, now: Date = new Date()): OrchestratorResult {
  const regionIds = [...new Set(input.regionIds)].filter(isCoveredRegion);
  const request: OrchestratorRequest = { ...input, regionIds, audience: input.audience ?? "community" };
  const route = ROUTES[request.intent];

  const result: OrchestratorResult = {
    request,
    steps: [
      step(
        "orchestrator",
        "Orchestrator",
        route.length === 0
          ? `Intent "${request.intent}": no agents needed`
          : `Intent "${request.intent}" for ${regionIds.map(regionName).join(", ") || "no region"}; routing to ${route.join(", ")}`
      ),
    ],
    risk: [],
    gis: [],
    community: [],
    fused: [],
    alerts: [],
    outOfScope: [],
  };

  if (route.length === 0 || regionIds.length === 0) return result;

  if (route.includes("risk")) {
    result.risk = riskScoringAgent(regionIds, request.hazard);
    const top = result.risk[0];
    result.steps.push(
      step(
        "risk",
        "Risk-Scoring Agent",
        top
          ? `${result.risk.length} state(s) scored; highest ${top.zoneName} (${top.tier}, ${top.score.toFixed(3)})`
          : "No monitored zones for this request"
      )
    );
  }

  if (route.includes("gis")) {
    const zoneIds = result.risk.map((r) => r.zoneId);
    result.gis = gisAgent(regionIds, zoneIds);
    const villages = result.gis.reduce((sum, g) => sum + (g.exposure?.villages ?? 0), 0);
    result.steps.push(
      step("gis", "Satellite/GIS Agent", `${result.gis.length} zone(s) located; ${villages} villages exposed`)
    );
  }

  if (route.includes("community")) {
    result.community = communityAgent(regionIds, now);
    const total = result.community.reduce((sum, c) => sum + c.reports.length, 0);
    const confirmed = result.community.filter((c) => c.status === "confirmed").length;
    result.steps.push(
      step("community", "Community Agent", `${total} ground post(s); ${confirmed} region(s) with confirmed reports`)
    );
  }

  if (result.risk.length > 0 && route.includes("community")) {
    result.fused = result.risk.map((risk) =>
      fuse(risk, result.community.find((c) => c.regionId === risk.regionId))
    );
    const disagreements = result.fused.filter((f) => f.disagreement).length;
    result.steps.push(
      step(
        "orchestrator",
        "Fusion",
        disagreements > 0
          ? `Sensor vs community disagree in ${disagreements} region(s)`
          : "Sensor and community signals fused; no disagreement"
      )
    );
  }

  if (route.includes("alert")) {
    result.alerts = result.risk.map((risk) =>
      alertAgent({
        risk,
        gis: result.gis.find((g) => g.zoneId === risk.zoneId),
        community: result.community.find((c) => c.regionId === risk.regionId),
        fused: result.fused.find((f) => f.regionId === risk.regionId),
        audience: request.audience ?? "community",
      })
    );
    result.steps.push(
      step("alert", "Alert Agent", `${result.alerts.length} ${request.audience} alert(s) drafted (full + SMS)`)
    );
  }

  return result;
}
