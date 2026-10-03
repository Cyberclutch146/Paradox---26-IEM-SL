/**
 * Local planner: the no-API-key brain.
 *
 * Reads the whole conversation (not just the last message) and turns it into
 * an OrchestratorRequest: what the user wants (intent), where (regions,
 * carried over from earlier turns for follow-ups like "what about there?" or
 * "and the villages?"), which hazard, and for whom. Gemini does this job when
 * a key is configured; this keeps the chatbot fully working without one.
 */
import { allRegionIds, resolvePlaces } from "./places";
import type { Audience, ChatTurn, Hazard, Intent, OrchestratorRequest } from "./types";

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
}

// Ordered: the first intent with the most matching patterns wins; ties go to the earlier rule.
const INTENT_RULES: IntentRule[] = [
  {
    intent: "alert",
    patterns: [/\balert\b/, /\bwarn(ing)? (message|text|sms)\b/, /\bdraft\b/, /\bsms\b/, /\bnotif(y|ication)\b/, /\bbroadcast\b/],
  },
  {
    intent: "compare",
    patterns: [/\bwhich (state|region|zone|area)\b/, /\bcompare\b/, /\b(riskiest|most dangerous|safest|worst|highest risk)\b/, /\brank(ing)?\b/, /\b(all|every) (states|regions)\b/, /\boverview\b/, /\bvs\.?\b|\bversus\b/],
  },
  {
    intent: "exposure",
    patterns: [/\bvillages?\b/, /\broads?\b/, /\bexpos(ed|ure)\b/, /\bat stake\b/, /\bwhere (exactly|is)\b/, /\blocat(e|ion)\b/, /\bslope\b/, /\bterrain\b/, /\bhow (big|large)\b/, /\bmap\b/, /\bcoordinates?\b/],
  },
  {
    intent: "reports",
    patterns: [/\breports?\b/, /\bground\b/, /\bcommunity\b/, /\bpeople (saying|reporting)\b/, /\bcorroborat/, /\bconfirm(ed|ations?)?\b/, /\bon the ground\b/, /\bwitness/],
  },
  {
    intent: "risk",
    patterns: [/\b(chance|chances|likely|likelihood|probability|odds)\b/, /\brisk\b/, /\bdanger(ous)?\b/, /\bsafe\b/, /\bthreat\b/, /\blandslides?\b/, /\bfloods?(ing)?\b/, /\bhow bad\b/, /\bstatus\b/, /\bsituation\b/, /\bhappening\b/, /\b(latest|update|briefing)\b/, /\banaly[sz]e\b/, /\bforecast\b/, /\bshould i (worry|travel|go)\b/],
  },
  {
    intent: "explain",
    patterns: [/\bhow does\b/, /\bhow do (you|the)\b/, /\bwhat is (the|a|an)? ?(score|model|tier|range|orchestrator|agent)/, /\bexplain\b/, /\bmethodology\b/, /\bwhat does .* mean\b/, /\bxgboost\b/, /\bml model\b/, /\bwho are you\b/, /\bwhat can you do\b/, /\bhelp\b/],
  },
  {
    intent: "smalltalk",
    patterns: [/^(hi|hello|hey|yo|namaste|good (morning|evening|afternoon))\b/, /^(thanks|thank you|ok|okay|cool|great)\b/],
  },
];

const FOLLOW_UP = /^(and|what about|how about|also|ok and|then|same for)\b|\b(there|that (state|place|zone|area)|it)\b/;

function matchesIntent(text: string, intent: Intent): boolean {
  return INTENT_RULES.some((rule) => rule.intent === intent && rule.patterns.some((p) => p.test(text)));
}

function detectIntent(text: string): Intent | null {
  let best: { intent: Intent; hits: number } | null = null;
  for (const rule of INTENT_RULES) {
    const hits = rule.patterns.filter((pattern) => pattern.test(text)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { intent: rule.intent, hits };
  }
  return best?.intent ?? null;
}

function detectHazard(text: string): Hazard | null {
  const landslide = /\b(landslides?|landslips?|mudslides?|slope|debris|rockfall)\b/.test(text);
  const flood = /\b(floods?|flooding|inundation|river level|overflow)\b/.test(text);
  if (landslide && flood) return "combined";
  if (landslide) return "landslide";
  if (flood) return "flood";
  return null;
}

function detectAudience(text: string): Audience | null {
  if (/\b(villagers?|community|public|residents?|locals?)\b/.test(text)) return "community";
  if (/\b(district|dc|collector|ddma)\b/.test(text)) return "district";
  if (/\b(sdma|ndma|authority|authorities|state government)\b/.test(text)) return "authority";
  return null;
}

export interface Plan {
  request: OrchestratorRequest;
  outOfScope: string[];
  /** True when the region came from earlier turns or the dashboard, not this message. */
  regionInferred: boolean;
}

/**
 * Plans the next orchestrator call from the conversation.
 * @param turns full conversation, oldest first; the last turn is the user's new message
 * @param dashboardRegionId the region currently selected on the dashboard (last-resort context)
 */
export function planFromConversation(turns: ChatTurn[], dashboardRegionId?: string): Plan {
  const userTurns = turns.filter((turn) => turn.role === "user");
  const latest = (userTurns[userTurns.length - 1]?.text ?? "").toLowerCase().trim();
  const earlier = userTurns.slice(0, -1).reverse().map((turn) => turn.text.toLowerCase());

  const places = resolvePlaces(latest);
  // "How does the risk score work?" is a question about the system, not about a place.
  let intent =
    places.regionIds.length === 0 && !places.allStates && matchesIntent(latest, "explain")
      ? "explain"
      : detectIntent(latest);
  let hazard = detectHazard(latest);
  const audience = detectAudience(latest) ?? undefined;
  let regionIds = places.regionIds;
  let regionInferred = false;

  // Carry the conversation: inherit intent/hazard/place from the most recent earlier turn that had them.
  for (const text of earlier) {
    if (!intent && FOLLOW_UP.test(latest)) intent = detectIntent(text);
    if (!hazard) hazard = detectHazard(text);
    if (regionIds.length === 0 && !places.allStates) {
      const previous = resolvePlaces(text);
      if (previous.regionIds.length > 0) {
        regionIds = previous.regionIds;
        regionInferred = true;
      }
    }
  }

  if (places.allStates || intent === "compare") {
    if (regionIds.length < 2) regionIds = allRegionIds();
    if (!intent || intent === "risk") intent = "compare";
  }

  // A bare place name ("Mizoram?") or "what about Assam" is a risk question.
  if (!intent && regionIds.length > 0) intent = "risk";
  if (!intent) intent = "explain";

  const needsRegion = intent !== "explain" && intent !== "smalltalk";
  if (needsRegion && regionIds.length === 0 && places.outOfScope.length === 0 && dashboardRegionId) {
    regionIds = [dashboardRegionId];
    regionInferred = true;
  }

  return {
    request: { intent, regionIds, hazard: hazard ?? "any", audience },
    outOfScope: places.outOfScope,
    regionInferred,
  };
}
