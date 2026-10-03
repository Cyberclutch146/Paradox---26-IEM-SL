/**
 * Entry point for the chatbot: one function the /api/chat route calls.
 *
 * Gemini path when a client is supplied; local planner otherwise. If Gemini
 * errors (bad key, quota, network), the same question is answered by the
 * local path instead of failing, and the reply says which brain answered.
 */
import { composeAnswer, suggestFollowUps } from "./composer";
import { runGeminiBrain, type GenerateContentClient } from "./gemini-brain";
import { runOrchestrator } from "./orchestrator";
import { isCoveredRegion } from "./places";
import { planFromConversation } from "./planner";
import type { ChatReply, ChatTurn, OrchestratorResult } from "./types";

const MAX_TURNS = 16;
const MAX_CHARS = 1500;

/** Validates and trims whatever the browser sent. */
export function sanitiseTurns(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { role: string; text: string } =>
        typeof item === "object" && item !== null && typeof item.text === "string" && typeof item.role === "string"
    )
    .map((item): ChatTurn => ({ role: item.role === "user" ? "user" : "bot", text: item.text.slice(0, MAX_CHARS) }))
    .filter((turn) => turn.text.trim().length > 0)
    .slice(-MAX_TURNS);
}

function focusOf(results: OrchestratorResult[]): string | null {
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const { regionIds } = results[i].request;
    const top = results[i].risk[0]?.regionId;
    if (regionIds.length === 1) return regionIds[0];
    if (top) return top;
  }
  return null;
}

export function answerLocally(turns: ChatTurn[], dashboardRegionId?: string): ChatReply {
  const plan = planFromConversation(turns, dashboardRegionId);
  const result = runOrchestrator(plan.request);
  const steps = [
    {
      agent: "orchestrator" as const,
      label: "Planner",
      detail: `Understood: ${plan.request.intent}${plan.request.hazard !== "any" ? ` (${plan.request.hazard})` : ""}${plan.regionInferred ? ", place taken from context" : ""}`,
    },
    ...result.steps,
  ];
  return {
    reply: composeAnswer(result, plan.outOfScope),
    steps,
    focusRegionId: focusOf([result]),
    suggestions: suggestFollowUps(result),
    mode: "local",
  };
}

export async function answer(
  turns: ChatTurn[],
  dashboardRegionId: string | undefined,
  gemini: { client: GenerateContentClient; model?: string } | null
): Promise<ChatReply> {
  const region = dashboardRegionId && isCoveredRegion(dashboardRegionId) ? dashboardRegionId : undefined;
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return answerLocally([{ role: "user", text: "hello" }], region);
  }
  if (!gemini) return answerLocally(turns, region);

  try {
    const brain = await runGeminiBrain(gemini.client, turns, region, gemini.model);
    const last = brain.results[brain.results.length - 1];
    return {
      reply: brain.reply,
      steps: brain.steps,
      focusRegionId: focusOf(brain.results),
      suggestions: last ? suggestFollowUps(last) : suggestFollowUps(runOrchestrator({ intent: "explain", regionIds: [], hazard: "any" })),
      mode: "gemini",
    };
  } catch (error) {
    console.error("Gemini brain failed; answering locally instead:", error);
    const local = answerLocally(turns, region);
    return {
      ...local,
      steps: [
        { agent: "orchestrator", label: "Gemini unavailable", detail: "Fell back to the local planner" },
        ...local.steps,
      ],
    };
  }
}
