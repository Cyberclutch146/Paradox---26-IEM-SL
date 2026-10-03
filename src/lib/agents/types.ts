/**
 * Shared contracts for the chatbot's agent layer.
 *
 * The chatbot never reads fixtures itself. It asks the Orchestrator, which
 * routes the request to the four PRD agents (Risk-Scoring, Satellite/GIS,
 * Community & Reporting, Alert & Routing) and fuses what they return.
 * Everything here is plain data so it can travel over the /api/chat JSON
 * boundary and be unit-tested without a model or a browser.
 */
import type { RiskKind, RiskLevel } from "@/data/types";

export type AgentName = "orchestrator" | "risk" | "gis" | "community" | "alert";

/** What the user is trying to find out. Drives which agents run. */
export type Intent =
  | "risk" // "what are the chances of a landslide in Mizoram?"
  | "compare" // "which state is riskiest right now?"
  | "exposure" // "what is at stake / which villages / where exactly?"
  | "reports" // "any ground reports from Kohima?"
  | "alert" // "draft an alert for Assam"
  | "explain" // "how does the risk score work?"
  | "smalltalk"; // greetings, thanks

export type Hazard = RiskKind | "any";
export type Audience = "district" | "authority" | "community";

/** A request the Orchestrator understands. Produced by Gemini or the local planner. */
export interface OrchestratorRequest {
  intent: Intent;
  regionIds: string[];
  hazard: Hazard;
  audience?: Audience;
}

/** One line in the visible "which agents ran" trace. */
export interface AgentStep {
  agent: AgentName;
  label: string;
  detail: string;
}

export interface RiskFinding {
  regionId: string;
  regionName: string;
  zoneId: string;
  zoneName: string;
  tier: RiskLevel;
  score: number;
  range: [number, number];
  confident: boolean;
  driver: string;
  zoneHazard: RiskKind;
  /** False when the user asked about one hazard but this zone is flagged for another. */
  hazardMatches: boolean;
  zonesMonitored: number;
}

export interface GisFinding {
  regionId: string;
  zoneId: string;
  zoneName: string;
  centroid: { lat: number; lng: number };
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  areaKm2: number;
  meanSlopeDeg: number | null;
  elevationRangeM: number | null;
  exposure: { villages: number; roadKm: number } | null;
  description: string;
}

export interface CommunityReport {
  id: string;
  author: string;
  location: string;
  message: string;
  kind: "report" | "update" | "question";
  minutesAgo: number;
}

export interface CommunityFinding {
  regionId: string;
  reports: CommunityReport[];
  /** Distinct people who posted a hazard report (type "report", not an update or question) in this region. */
  corroborations: number;
  verifiedOfficer: boolean;
  status: "confirmed" | "unconfirmed" | "none";
}

export interface FusedView {
  regionId: string;
  sensorTier: RiskLevel;
  fusedTier: RiskLevel;
  /** True when the community signal and the sensor score point different ways. */
  disagreement: boolean;
  rationale: string;
}

export interface AlertDraft {
  regionId: string;
  audience: Audience;
  severity: RiskLevel;
  full: string;
  /** Low-bandwidth SMS form (FR-11). Always 160 characters or fewer. */
  compressed: string;
}

export interface OrchestratorResult {
  request: OrchestratorRequest;
  steps: AgentStep[];
  risk: RiskFinding[];
  gis: GisFinding[];
  community: CommunityFinding[];
  fused: FusedView[];
  alerts: AlertDraft[];
  /** Places the user named that the platform does not cover (e.g. Sikkim). */
  outOfScope: string[];
}

/** What /api/chat sends back to the widget. */
export interface ChatReply {
  reply: string;
  steps: AgentStep[];
  /** Region the answer was about, so the widget can offer "Show on map". */
  focusRegionId: string | null;
  suggestions: string[];
  mode: "gemini" | "local";
}

export interface ChatTurn {
  role: "user" | "bot";
  text: string;
}
