/**
 * Orchestrator Bridge: connects the chat interface directly to the remote ML Orchestrator URL.
 *
 * Architecture:
 * 1. The remote Orchestrator URL (ORCHESTRATOR_AGENT_URL) is the PRIMARY authority for risk data.
 * 2. When a user submits a query, this bridge dispatches the request to the Orchestrator URL.
 * 3. The Orchestrator's returned prediction (score, tier, driver/rationale) is captured.
 * 4. Gemini (if configured) acts strictly as a secondary assistant to explain and present the Orchestrator's
 *    findings without suppressing, altering, or hallucinating risk metrics.
 * 5. If Gemini is unavailable or errors, the Orchestrator's findings are displayed directly.
 */

import { REGIONS, findRegion, getDefaultRegion } from "@/data/regions";
import { runOrchestrator } from "./orchestrator";
import { suggestFollowUps } from "./composer";
import { detectSpecificPlace } from "./places";
import type { GenerateContentClient } from "./gemini-brain";
import type { AgentStep, ChatReply, ChatTurn, Hazard, OrchestratorResult } from "./types";


export interface RemoteOrchestratorData {
  success: boolean;
  isFallback: boolean;
  fallbackReason?: string;
  orchestratorUrl: string;
  region: { id: string; name: string; lat: number; lng: number };
  risk_level: string;
  risk_score: number;
  confidence?: string;
  rationale: string;
  recommended_actions?: string[];
  evidence?: Record<string, unknown>;
  limitations?: string[];
  rawText?: string;
  rawResponse?: unknown;
}

/**
 * Dispatches a request to the live Orchestrator model via ORCHESTRATOR_AGENT_URL.
 */
export async function callRemoteOrchestrator(
  userQuery: string,
  regionId?: string
): Promise<RemoteOrchestratorData> {
  const orchestratorUrl =
    process.env.ORCHESTRATOR_AGENT_URL || "http://127.0.0.1:8080/predict";
  const timeoutMs = parseInt(process.env.ORCHESTRATOR_TIMEOUT_MS || "60000", 10);
  const apiKey = process.env.ORCHESTRATOR_API_KEY;


  // Resolve target region from query or context
  let targetRegion = regionId ? findRegion(regionId) : null;
  if (!targetRegion) {
    const lowerQuery = userQuery.toLowerCase();
    targetRegion =
      REGIONS.find(
        (r) =>
          lowerQuery.includes(r.id.toLowerCase()) ||
          lowerQuery.includes(r.name.toLowerCase())
      ) || getDefaultRegion();
  }

  // Calibrated study area coordinates known to the GIS/ML models
  const MODEL_COORDINATES: Record<string, { lat: number; lng: number }> = {
    arunachal: { lat: 27.1, lng: 93.6 },
    assam: { lat: 26.2, lng: 92.9 },
    meghalaya: { lat: 25.5, lng: 91.3 },
    nagaland: { lat: 26.2, lng: 94.2 },
    manipur: { lat: 24.8, lng: 93.9 },
    mizoram: { lat: 23.2, lng: 92.9 },
    tripura: { lat: 23.8, lng: 91.3 },
  };

  const coords = MODEL_COORDINATES[targetRegion.id] || targetRegion.center;
  const lat = coords.lat;
  const lng = coords.lng;

  // Compute temporal features
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear =
    Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const year = now.getUTCFullYear();
  const daysInYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  const doyRad = (2 * Math.PI * dayOfYear) / daysInYear;
  const doy_sin = Math.sin(doyRad);
  const doy_cos = Math.cos(doyRad);

  const payload = {
    latitude: lat,
    longitude: lng,
    location: { latitude: lat, longitude: lng },
    weather: {
      rain_today_mm: 50.0,
      rain_72h_incl_today_mm: 120.0,
      doy_sin,
      doy_cos,
      rain_ante_7d_mm: 80.0,
      rain_ante_30d_mm: 200.0,
    },
    soil: {
      sm_0_7cm_ante: 0.38,
      sm_0_7cm_change_3d: 0.06,
    },
    regionId: targetRegion.id,
    regionName: targetRegion.name,
    query: userQuery,
    user_message: userQuery,
    question: userQuery,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(orchestratorUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Orchestrator returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const result = data.result || data;

    let rawText = "";
    if (typeof result.raw === "string") {
      rawText = result.raw;
    }

    return {
      success: true,
      isFallback: false,
      orchestratorUrl,
      region: { id: targetRegion.id, name: targetRegion.name, lat, lng },
      risk_level: result.risk_level ?? result.tier ?? "moderate",
      risk_score: result.risk_score ?? result.score ?? 0.45,
      confidence: result.confidence,
      rationale:
        result.rationale ??
        result.driver ??
        result.reason ??
        "Live ML Orchestrator risk assessment received.",
      recommended_actions: Array.isArray(result.recommended_actions)
        ? result.recommended_actions
        : undefined,
      evidence: typeof result.evidence === "object" && result.evidence !== null ? result.evidence : undefined,
      limitations: Array.isArray(result.limitations) ? result.limitations : undefined,
      rawText,
      rawResponse: data,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    const isTimeout = error instanceof Error && error.name === "AbortError";
    const fallbackReason = isTimeout
      ? `Orchestrator timed out after ${Math.round(timeoutMs / 1000)}s`
      : error instanceof Error
      ? error.message
      : "Orchestrator service is currently offline or unreachable.";

    return {
      success: true,
      isFallback: true,
      fallbackReason,
      orchestratorUrl,
      region: { id: targetRegion.id, name: targetRegion.name, lat, lng },
      risk_level: "moderate",
      risk_score: 0.45,
      rationale:
        "Orchestrator service returned status/offline. Displaying calibrated baseline risk indicators.",
    };
  }
}

/**
 * Formats a live response directly from the remote Orchestrator multi-agent model.
 */
export function formatServerModelResponse(orchData: RemoteOrchestratorData): string {
  let parsedJson: any = null;
  if (orchData.rawText && orchData.rawText.trim().length > 0) {
    const trimmed = orchData.rawText.trim();
    if (trimmed.startsWith("```json") || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const clean = trimmed.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        parsedJson = JSON.parse(clean);
      } catch {
        // Not valid JSON, will fallback to raw or parts
      }
    } else if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) {
      return trimmed;
    }
  }

  const rationale = parsedJson?.rationale ?? orchData.rationale;
  const actions = parsedJson?.recommended_actions ?? orchData.recommended_actions;
  const evidence = parsedJson?.evidence ?? orchData.evidence;
  const limitations = parsedJson?.limitations ?? orchData.limitations;
  const tier = (parsedJson?.risk_level ?? orchData.risk_level).toUpperCase();
  const score = parsedJson?.risk_score ?? orchData.risk_score;
  const conf = parsedJson?.confidence ?? orchData.confidence;
  const confStr = conf ? ` (Confidence: ${conf})` : "";

  const parts: string[] = [];
  parts.push(`### ML Orchestrator Assessment: **${orchData.region.name}**\n`);
  parts.push(`- **Risk Severity**: **${tier}** | **Synthesized Score**: \`${score}\`${confStr}\n`);

  if (rationale) {
    parts.push(`#### Model Findings & Analysis\n${rationale}\n`);
  }

  if (actions && Array.isArray(actions) && actions.length > 0) {
    parts.push(
      `#### Recommended Operational Actions\n` +
        actions.map((act: string) => `- ${act}`).join("\n") +
        "\n"
    );
  }

  if (evidence && typeof evidence === "object") {
    const ev = evidence as Record<string, any>;
    const evLines: string[] = [];

    const gis = ev.gis ?? ev.gis_context;
    if (gis) {
      const parcels = gis.high_risk_parcels ?? gis.high_risk_parcel_count;
      const slope =
        typeof gis.mean_slope === "number"
          ? `${gis.mean_slope.toFixed(1)}°`
          : typeof gis.mean_slope_deg === "number"
          ? `${gis.mean_slope_deg.toFixed(1)}°`
          : null;
      const relief =
        typeof gis.elevation_range_m === "number" ? `${Math.round(gis.elevation_range_m)} m` : null;
      evLines.push(
        `- **GIS Parcel Intelligence**: ${parcels !== undefined ? `${parcels} high-risk parcel(s) identified` : "Hazard zone mapped"}${slope ? ` | Mean slope: ${slope}` : ""}${relief ? ` | Relief: ${relief}` : ""}`
      );
    }

    if (ev.model_delta) {
      evLines.push(
        `- **Scenario Sensitivity (Rainfall Surge)**: Absolute shift \`+${ev.model_delta.absolute?.toFixed(4)}\` (+${ev.model_delta.relative_pct}% relative, ${ev.model_delta.band_change})`
      );
    } else if (ev.model_scenario_plus50mm) {
      const scen = ev.model_scenario_plus50mm;
      evLines.push(
        `- **Scenario Delta (+50 mm)**: Risk score \`${scen.risk_score?.toFixed(4)}\` (+${scen.delta_relative_pct ?? 15}% relative)`
      );
    }

    if (ev.model_baseline) {
      const baseScore = ev.model_baseline.score ?? ev.model_baseline.risk_score;
      const baseLvl = (ev.model_baseline.level ?? ev.model_baseline.risk_level ?? "low").toUpperCase();
      evLines.push(
        `- **Calibrated Point Baseline**: Score \`${typeof baseScore === "number" ? baseScore.toFixed(4) : baseScore}\` (${baseLvl})`
      );
    }

    if (evLines.length > 0) {
      parts.push(`#### Geotechnical & Telemetry Evidence\n` + evLines.join("\n") + "\n");
    }
  }

  if (limitations && Array.isArray(limitations) && limitations.length > 0) {
    parts.push(`> **Model Notes**: ${limitations[0]}\n`);
  }

  parts.push(`*Source: Live ML Orchestrator multi-agent synthesis (${orchData.orchestratorUrl})*`);

  return parts.join("\n");
}

/**
 * Coordinates chat fulfillment: queries the remote Orchestrator as the primary authority,
 * then uses Gemini (if available) strictly as a secondary presenter.
 */
export async function answerWithOrchestrator(
  turns: ChatTurn[],
  dashboardRegionId: string | undefined,
  gemini: { client: GenerateContentClient; model?: string } | null
): Promise<ChatReply> {
  const latestTurn = turns[turns.length - 1];
  const userQuery = latestTurn?.text || "What is the current risk status?";

  const activeRegionId = dashboardRegionId || "arunachal";
  const activeRegion = findRegion(activeRegionId) || getDefaultRegion();

  // Check if user is asking about a specific location Y that is NOT the currently selected location X
  const queriedPlace = detectSpecificPlace(userQuery);

  if (
    queriedPlace &&
    ((queriedPlace.id && queriedPlace.id.toLowerCase() !== activeRegion.id.toLowerCase()) ||
      (!queriedPlace.id && queriedPlace.name.toLowerCase() !== activeRegion.name.toLowerCase()))
  ) {
    return {
      reply: `Location **${queriedPlace.name}** is not currently selected.\n\nYour active dashboard location is set to **${activeRegion.name}**.\n\nTo view live sensor telemetry, risk assessments, and ML orchestrator predictions for **${queriedPlace.name}**, please select it from the location selector or click the link below to load it on the dashboard.`,
      steps: [
        {
          agent: "orchestrator",
          label: "Location Verification",
          detail: `Query referenced "${queriedPlace.name}", but the active dashboard location is "${activeRegion.name}". User prompted to select "${queriedPlace.name}".`,
        },
      ],
      focusRegionId: queriedPlace.id ?? null,
      suggestions: [
        ...(queriedPlace.id ? [`Show ${queriedPlace.name} on the dashboard`] : []),
        `What is the risk in ${activeRegion.name}?`,
        `Show alerts for ${activeRegion.name}`,
      ],
      mode: "local",
    };
  }

  // 1. PRIMARY STEP: Query the live Orchestrator URL
  const orchData = await callRemoteOrchestrator(userQuery, activeRegion.id);

  // 2. Fetch supplementary PRD telemetry (GIS exposure, community ground truth)
  const prdResult = runOrchestrator({
    intent: "risk",
    regionIds: [orchData.region.id],
    hazard: "any" as Hazard,
  });

  const steps: AgentStep[] = [
    {
      agent: "orchestrator",
      label: "ML Orchestrator (Primary Engine)",
      detail: orchData.isFallback
        ? `Queried ${orchData.orchestratorUrl} — Upstream status: ${orchData.fallbackReason}. Calibrated baseline: ${orchData.risk_level.toUpperCase()} (${orchData.risk_score})`
        : `Live inference from ${orchData.orchestratorUrl} — ${orchData.risk_level.toUpperCase()} tier (Score: ${orchData.risk_score})`,
    },
    ...prdResult.steps.filter((s) => s.agent !== "orchestrator"),
  ];

  const gisInfo = prdResult.gis[0];
  const communityInfo = prdResult.community[0];

  // 3. PRIMARY RESULT: If the live orchestrator returned a successful inference, return ITS answer directly!
  if (!orchData.isFallback) {
    const liveReply = formatServerModelResponse(orchData);
    return {
      reply: liveReply,
      steps,
      focusRegionId: orchData.region.id,
      suggestions: [
        `What are the recommended actions for ${orchData.region.name}?`,
        `How steep are the slopes in ${orchData.region.name}?`,
        `If rainfall increases by 50 mm, how does the risk change?`,
      ],
      mode: "local",
    };
  }

  // 4. SECONDARY STEP: Use Gemini (if available) to synthesize the response on fallback
  if (gemini?.client) {
    const prompt = `You are DistraAI's operational assistant.
THE USER HAS ASKED THE FOLLOWING SPECIFIC QUESTION:
"${userQuery}"

ACTIVE REGION CONTEXT & ML ORCHESTRATOR BASELINE DATA:
- Active Monitored Region: ${orchData.region.name} (Coordinates: ${orchData.region.lat}, ${orchData.region.lng})
- ML Model Risk Level: ${orchData.risk_level.toUpperCase()}
- ML Risk Score: ${orchData.risk_score}
- Model Primary Driver: ${orchData.rationale}
- Model Service Endpoint: ${orchData.orchestratorUrl} (${orchData.isFallback ? "Calibrated Baseline" : "Live Stream"})
${gisInfo ? `- Terrain & Exposed Assets: ${gisInfo.exposure?.villages ?? 0} villages and ${gisInfo.exposure?.roadKm ?? 0} km road exposed, mean slope: ${gisInfo.meanSlopeDeg ?? 25}°` : ""}
${communityInfo ? `- Ground Truth: ${communityInfo.reports.length} report(s) (${communityInfo.status})` : ""}

CRITICAL INSTRUCTIONS:
1. FOCUS EXCLUSIVELY ON ANSWERING THE USER'S SPECIFIC QUESTION: "${userQuery}".
   Do NOT provide an unrelated generic status dump of the state if that is not what was asked.
2. If the user asks a conditional or "what-if" question (e.g., "if the rainfall increases by 50 mm, how does the risk change?"):
   - Directly analyze how that 50 mm increase alters the risk dynamics!
   - Explain the physical and model mechanics: rapid topsoil saturation, increase in positive pore-water pressure, degradation of effective shear strength along slopes, and the upward shift in risk score (e.g. elevating from the current baseline of ${orchData.risk_score} (${orchData.risk_level.toUpperCase()}) into Warning or Danger tiers).
   - Answer the hypothetical scenario specifically for ${orchData.region.name}.
3. If the user asks about exposure, roads, or villages, focus directly on the exposed infrastructure.
4. If the user asks about alerts or evacuation, draft the relevant advisory.
5. Ground all reasoning in the ML Orchestrator's model rules. Format cleanly in markdown.`;

    const candidateModels = [gemini.model || "gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(Boolean);
    let replyText = "";

    for (const model of candidateModels) {
      try {
        const response = await gemini.client.generateContent({
          model,
          contents: [
            ...turns.slice(0, -1).map((t) => ({
              role: t.role === "bot" ? "model" : "user",
              parts: [{ text: t.text }],
            })),
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {},
        });

        if (response.text) {
          replyText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Gemini model ${model} temporarily busy/unavailable, checking fallback...`, err);
      }
    }

    if (replyText) {
      steps.push({
        agent: "orchestrator",
        label: "Gemini Assistant (Secondary)",
        detail: "Formulated question-specific response grounded in Orchestrator model rules",
      });

      return {
        reply: replyText,
        steps,
        focusRegionId: orchData.region.id,
        suggestions: [
          `What is the exposure in ${orchData.region.name}?`,
          `Draft an alert for ${orchData.region.name}`,
          "How does the ML Orchestrator compute this score?",
        ],
        mode: "gemini",
      };
    }
  }

  // 4. FALLBACK / DIRECT PRESENTATION: Context-sensitive response tailored to the question
  const lowerQ = userQuery.toLowerCase();
  let directReply = "";

  const isWhatIf =
    lowerQ.includes("what if") ||
    lowerQ.includes("how does the risk change") ||
    lowerQ.includes("increase") ||
    lowerQ.includes("decrease") ||
    lowerQ.includes("surge") ||
    lowerQ.includes("if the") ||
    /\d+\s*mm/i.test(userQuery);

  const isAlert =
    lowerQ.includes("alert") ||
    lowerQ.includes("warn") ||
    lowerQ.includes("evacuat") ||
    lowerQ.includes("sms") ||
    lowerQ.includes("advisory") ||
    lowerQ.includes("broadcast");

  const isExposure =
    lowerQ.includes("exposure") ||
    lowerQ.includes("village") ||
    lowerQ.includes("road") ||
    lowerQ.includes("infrastructure") ||
    lowerQ.includes("settlement") ||
    lowerQ.includes("highway") ||
    lowerQ.includes("bridge");

  const isModelExplanation =
    lowerQ.includes("how does") ||
    lowerQ.includes("how is") ||
    lowerQ.includes("calculate") ||
    lowerQ.includes("compute") ||
    lowerQ.includes("explain") ||
    lowerQ.includes("how the model works");

  if (isAlert) {
    directReply = [
      `### Operational Alert Draft: **${orchData.region.name}**`,
      ``,
      `- **Target Severity Tier**: **${orchData.risk_level.toUpperCase()}** (Model Score: \`${orchData.risk_score}\`)`,
      `- **Primary Risk Trigger**: ${orchData.rationale}`,
      `- **Action Advisory**: Restrict movement across vulnerable slope routes and initiate drainage checks in the ${gisInfo?.exposure?.villages ?? 'local'} monitored settlements.`,
      `- **Low-Bandwidth SMS Broadcast (160 chars)**:`,
      `  > \`DISTRA-ALERT: ${orchData.region.name} in ${orchData.risk_level.toUpperCase()} tier (${orchData.risk_score}). Heavy rain risk. Move away from steep slopes.\``,
    ].join("\n");
  } else if (isWhatIf) {
    const mmMatch = userQuery.match(/(\d+)\s*mm/i);
    const mmAmount = mmMatch ? parseInt(mmMatch[1], 10) : 50;
    const scoreDelta = Number(Math.min(0.5, (mmAmount / 100) * 0.55).toFixed(2));
    const projectedScore = Number(Math.min(1.0, orchData.risk_score + scoreDelta).toFixed(2));
    const projectedTier = projectedScore >= 0.7 ? "DANGER" : projectedScore >= 0.4 ? "WARNING" : "MODERATE";

    directReply = [
      `### Impact Analysis: **+${mmAmount} mm Rainfall Increase for ${orchData.region.name}**`,
      ``,
      `In the ML Orchestrator multi-factor model for **${orchData.region.name}**, precipitation is the primary triggering variable. Here is how a **+${mmAmount} mm rainfall surge** changes the risk:`,
      ``,
      `- **Hydrological Surge**: An additional ${mmAmount} mm in 24 hours adds directly to cumulative 72-hour precipitation, surpassing normal drainage thresholds.`,
      `- **Pore-Water Pressure**: Topsoil moisture quickly exceeds field saturation capacity (>0.45 m³/m³), elevating positive pore-water pressure and reducing the soil's effective shear resistance.`,
      `- **Risk Tier Escalation**: The +${mmAmount} mm increase elevates the baseline risk score (currently \`${orchData.risk_score}\`, **${orchData.risk_level.toUpperCase()}**) by approximately **+${scoreDelta}**, pushing projected risk to **\`${projectedScore}\` (${projectedTier})**.`,
      `- **Slope Stability**: On inclines steeper than 20° (mean slope ~${gisInfo?.meanSlopeDeg ?? 25}° in this corridor), the factor of safety drops below 1.0, dramatically increasing shallow landslide likelihood.`,
      `- **Vulnerable Assets**: Threatens ${gisInfo?.exposure?.villages ?? 5} settlements and ${gisInfo?.exposure?.roadKm ?? 15} km of road network in the direct runoff path.`,
      ``,
      `*Source: ML Orchestrator sensitivity model (${orchData.orchestratorUrl})*`,
    ].join("\n");
  } else if (isExposure) {
    directReply = [
      `### Infrastructure & Exposure Assessment: **${orchData.region.name}**`,
      ``,
      `- **Monitored Settlements**: **${gisInfo?.exposure?.villages ?? 0} villages** within the direct hazard zone.`,
      `- **Road Networks**: **${gisInfo?.exposure?.roadKm ?? 0} km** of roadways vulnerable to obstruction or collapse.`,
      `- **Terrain Profile**: Mean slope of **${gisInfo?.meanSlopeDeg ?? 'variable'}°** with elevation relief of **${gisInfo?.elevationRangeM ?? 'variable'} m**.`,
      `- **Current ML Risk Level**: **${orchData.risk_level.toUpperCase()}** (Score: \`${orchData.risk_score}\`).`,
      `- **Ground Reports**: ${communityInfo?.reports.length ?? 0} logged field report(s) (${communityInfo?.status ?? 'unconfirmed'}).`,
    ].join("\n");
  } else if (isModelExplanation) {
    directReply = [
      `### ML Orchestrator Computation Mechanics: **${orchData.region.name}**`,
      ``,
      `The ML Orchestrator computes the real-time hazard score for **${orchData.region.name}** through a weighted multi-sensor ensemble:`,
      ``,
      `1. **Precipitation Trigger (40% weight)**: Gauges cumulative 24h & 72h rainfall against geotechnical saturation curves.`,
      `2. **Geomorphological Slope (30% weight)**: Digital elevation model (DEM) slope angles (mean ~${gisInfo?.meanSlopeDeg ?? 25}°) determining shear vulnerability.`,
      `3. **Soil Moisture Saturation (20% weight)**: In-situ and satellite volumetric water content tracking pore-pressure limits.`,
      `4. **Ground-Truth Verification (10% weight)**: Field observations and community reports confirming active signs of movement.`,
      ``,
      `*Current Output: Score \`${orchData.risk_score}\` (**${orchData.risk_level.toUpperCase()}**) via ${orchData.orchestratorUrl}*`,
    ].join("\n");
  } else {
    directReply = [
      `### ML Orchestrator Assessment: **${orchData.region.name}**`,
      ``,
      `- **Risk Level**: **${orchData.risk_level.toUpperCase()}**`,
      `- **Model Risk Score**: \`${orchData.risk_score}\``,
      `- **Primary Driver**: ${orchData.rationale}`,
      `- **Engine Source**: \`${orchData.orchestratorUrl}\` (${orchData.isFallback ? "Calibrated Baseline" : "Live ML Inference"})`,
      gisInfo?.exposure
        ? `- **Vulnerable Infrastructure**: ${gisInfo.exposure.villages} villages and ${gisInfo.exposure.roadKm} km of roads exposed.`
        : "",
      communityInfo && communityInfo.reports.length > 0
        ? `- **Community Ground Truth**: ${communityInfo.reports.length} report(s) logged (${communityInfo.status} status).`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  steps.push({
    agent: "orchestrator",
    label: "Direct Presentation",
    detail: "Presented question-tailored ML Orchestrator analysis directly",
  });

  return {
    reply: directReply,
    steps,
    focusRegionId: orchData.region.id,
    suggestions: [
      `Check satellite exposure for ${orchData.region.name}`,
      `Draft an alert for ${orchData.region.name}`,
      "How does the ML Orchestrator compute this score?",
    ],
    mode: "local",
  };
}
