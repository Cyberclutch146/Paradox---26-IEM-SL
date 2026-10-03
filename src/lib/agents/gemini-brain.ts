/**
 * Gemini brain: the LLM-driven path, used when GEMINI_API_KEY is set.
 *
 * Gemini reads the full conversation, decides what the user means, and calls
 * the `ask_orchestrator` tool (function calling) as many times as it needs —
 * e.g. once per state when comparing, or a risk call followed by an alert
 * call. It then writes the answer from what the agents returned. It is told
 * never to invent numbers, so every figure in the reply traces back to an agent.
 *
 * The model client is injected so this loop can be unit-tested with a fake.
 */
import type { Content, FunctionCall, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { REGIONS } from "@/data/regions";
import { DATA_NOTE } from "./composer";
import { runOrchestrator } from "./orchestrator";
import { regionName } from "./places";
import type { AgentStep, ChatTurn, Intent, OrchestratorRequest, OrchestratorResult } from "./types";

export interface GenerateContentClient {
  generateContent(params: {
    model: string;
    contents: Content[];
    config: Record<string, unknown>;
  }): Promise<GenerateContentResponse>;
}

const MAX_TOOL_ROUNDS = 4;
const INTENTS: Intent[] = ["risk", "compare", "exposure", "reports", "alert"];

export const ORCHESTRATOR_TOOL: FunctionDeclaration = {
  name: "ask_orchestrator",
  description:
    "Ask the platform Orchestrator for live data. It routes to the Risk-Scoring, Satellite/GIS, Community and Alert agents and fuses their output. Call this for ANY question about risk, places, exposure, ground reports or alerts. Never answer such questions from memory.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: INTENTS,
        description:
          "risk = chance/level of landslide or flood in a place (runs Risk + GIS + Community); compare = rank several states; exposure = where the zone is and what villages/roads are exposed; reports = community ground reports; alert = draft an alert (runs all four agents).",
      },
      regions: {
        type: "array",
        items: { type: "string", enum: REGIONS.map((r) => r.id) },
        description:
          "State ids. Map towns to their state (Aizawl -> mizoram, Tawang -> arunachal, Shillong -> meghalaya, Kohima -> nagaland, Imphal -> manipur, Agartala -> tripura, Guwahati/Majuli -> assam). Use every id to compare all states.",
      },
      hazard: {
        type: "string",
        enum: ["landslide", "flood", "combined", "any"],
        description: "Hazard the user asked about; 'any' if unspecified.",
      },
      audience: {
        type: "string",
        enum: ["community", "district", "authority"],
        description: "Only for intent=alert: who the alert is for. Default community.",
      },
    },
    required: ["intent", "regions"],
  },
};

export function buildSystemPrompt(dashboardRegionId: string | undefined): string {
  const dashboard = dashboardRegionId ? regionName(dashboardRegionId) : "none";
  return `You are the DistraAI assistant for an AI landslide early-warning platform covering the seven North East Indian states (${REGIONS.map((r) => r.name).join(", ")}). Built for SIH 2026 (SIH26001, MDoNER).

How you work:
- You are the conversational front of a multi-agent system. The Orchestrator coordinates four agents: Risk-Scoring (calibrated XGBoost tier, score, range, driver), Satellite/GIS (location, terrain, exposed villages/roads), Community & Reporting (ground reports; confirmed only with 3 people or 1 verified officer), Alert & Routing (drafts full + SMS alerts).
- For any question about risk, chances, safety, places, exposure, reports or alerts, call ask_orchestrator first. Work out the state(s) from the WHOLE conversation: "there", "that state", "what about villages?" refer to earlier turns. If no place has been mentioned at all, use the dashboard region (${dashboard}).
- Compare questions ("which state is riskiest?") use intent=compare with all state ids. You may call the tool several times.
- Sikkim and places outside the seven states are not covered: say so plainly, don't guess.

Honesty rules (from the PRD, non-negotiable):
- Use only numbers the tool returned. Never invent scores, villages or reports.
- Never give a score without its range. Never call the score a probability or a percentage chance: it is a relative ranking of how unusual today is for that zone. ${DATA_NOTE}
- If the zone returned is flagged for a different hazard than the user asked about (hazardMatches=false), say so.
- Unconfirmed community reports never raise risk on their own.
- The platform supports, and never overrides, official DDMA/SDMA/NDMA decisions. Alert drafts are drafts.

Style: short and plain. Lead with the answer (tier + range + driver), then where/exposure and ground reports as brief bullets. Use **bold** and "- " bullets only; no headings, no tables, no emoji.`;
}

export interface BrainResult {
  reply: string;
  steps: AgentStep[];
  results: OrchestratorResult[];
}

function toRequest(call: FunctionCall): OrchestratorRequest {
  const args = (call.args ?? {}) as Record<string, unknown>;
  const intent = INTENTS.includes(args.intent as Intent) ? (args.intent as Intent) : "risk";
  const regions = Array.isArray(args.regions) ? args.regions.map(String) : [];
  const hazard = ["landslide", "flood", "combined", "any"].includes(String(args.hazard))
    ? (args.hazard as OrchestratorRequest["hazard"])
    : "any";
  const audience = ["community", "district", "authority"].includes(String(args.audience))
    ? (args.audience as OrchestratorRequest["audience"])
    : undefined;
  return { intent, regionIds: regions, hazard, audience };
}

/** Strips fields the model doesn't need, to keep the tool response small. */
function forModel(result: OrchestratorResult) {
  return {
    risk: result.risk,
    gis: result.gis.map((g) => ({
      zoneId: g.zoneId,
      zoneName: g.zoneName,
      regionId: g.regionId,
      centroid: g.centroid,
      areaKm2: g.areaKm2,
      meanSlopeDeg: g.meanSlopeDeg,
      elevationRangeM: g.elevationRangeM,
      exposure: g.exposure,
      description: g.description,
    })),
    community: result.community,
    fused: result.fused,
    alerts: result.alerts,
    note: DATA_NOTE,
  };
}

export async function runGeminiBrain(
  client: GenerateContentClient,
  turns: ChatTurn[],
  dashboardRegionId: string | undefined,
  model = "gemini-2.5-flash"
): Promise<BrainResult> {
  const contents: Content[] = turns.map((turn) => ({
    role: turn.role === "bot" ? "model" : "user",
    parts: [{ text: turn.text }],
  }));
  const config = {
    systemInstruction: buildSystemPrompt(dashboardRegionId),
    tools: [{ functionDeclarations: [ORCHESTRATOR_TOOL] }],
    temperature: 0.2,
  };

  const steps: AgentStep[] = [
    { agent: "orchestrator", label: "Gemini planner", detail: "Reading the conversation to decide which agents to call" },
  ];
  const results: OrchestratorResult[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.generateContent({ model, contents, config });
    const calls = response.functionCalls ?? [];

    if (calls.length === 0 || round === MAX_TOOL_ROUNDS) {
      const text = response.text?.trim();
      if (!text) throw new Error("Gemini returned no text");
      return { reply: text, steps, results };
    }

    const modelContent = response.candidates?.[0]?.content ?? {
      role: "model",
      parts: calls.map((functionCall) => ({ functionCall })),
    };
    contents.push(modelContent);

    const responseParts = calls.map((call) => {
      const result = runOrchestrator(toRequest(call));
      results.push(result);
      steps.push(...result.steps);
      return {
        functionResponse: { id: call.id, name: call.name, response: forModel(result) },
      };
    });
    contents.push({ role: "user", parts: responseParts });
  }

  throw new Error("Gemini tool loop ended without an answer");
}
