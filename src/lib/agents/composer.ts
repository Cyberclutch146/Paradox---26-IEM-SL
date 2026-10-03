/**
 * Turns an OrchestratorResult into a chat answer without an LLM.
 *
 * Used by the local brain, and as the safety net when Gemini fails. Follows
 * the PRD's honesty rules: the score always comes with its range, it is
 * called a relative ranking (never a percentage chance), synthetic data is
 * disclosed, and the platform supports rather than replaces authorities.
 */
import type { RiskLevel } from "@/data/types";
import { regionName } from "./places";
import type { OrchestratorResult, RiskFinding } from "./types";

const TIER_LABEL: Record<RiskLevel, string> = {
  danger: "Danger",
  warning: "Warning",
  watch: "Watch",
  low: "Low",
};

const TIER_MEANING: Record<RiskLevel, string> = {
  danger: "the highest tier: conditions here rank among the riskiest days the model has seen",
  warning: "elevated: well above an ordinary day for this zone",
  watch: "somewhat above normal, worth keeping an eye on",
  low: "close to an ordinary day",
};

export const DATA_NOTE =
  "Scores are relative rankings from the sample dataset, not a percentage chance of a landslide.";

export const EXPLAINER = [
  "I'm the DistraAI assistant. I don't guess: every answer comes from the platform's agents.",
  "",
  "**How a question is answered**",
  "- The **Orchestrator** works out what you're asking and which agents are needed.",
  "- The **Risk-Scoring Agent** ranks each zone using rainfall, soil moisture, season and terrain (XGBoost, calibrated). It returns a tier, a score with a range, and the main driver.",
  "- The **Satellite/GIS Agent** says where the zone is and what's exposed (villages, roads, terrain).",
  "- The **Community Agent** checks ground reports. A report only counts as confirmed with 3 people or a verified officer.",
  "- The **Alert Agent** drafts alerts for villagers, districts or state authorities, including a short SMS form.",
  "",
  "**Reading a score:** it ranks how unusual today is for that zone. It isn't a probability, so it always comes with a range and a reason.",
  "",
  "Try: *\"What are the chances of a landslide in Mizoram?\"*, *\"Which state is riskiest?\"* or *\"Draft an alert for Tawang villagers\"*.",
].join("\n");

function fmt(n: number): string {
  return n.toFixed(3);
}

function hazardWord(finding: RiskFinding): string {
  if (finding.zoneHazard === "combined") return "flood + landslide";
  return finding.zoneHazard;
}

function riskLine(finding: RiskFinding): string {
  return `**${TIER_LABEL[finding.tier]}** tier, score ${fmt(finding.score)} (range ${fmt(finding.range[0])}–${fmt(finding.range[1])}), ${finding.confident ? "high confidence" : "low confidence"}`;
}

function composeRisk(result: OrchestratorResult, askedHazard: string): string[] {
  const lines: string[] = [];
  for (const risk of result.risk) {
    const gis = result.gis.find((g) => g.zoneId === risk.zoneId);
    const community = result.community.find((c) => c.regionId === risk.regionId);
    const fused = result.fused.find((f) => f.regionId === risk.regionId);

    lines.push(`**${risk.regionName}: ${risk.zoneName}**`);
    lines.push(`- Risk: ${riskLine(risk)}. That's ${TIER_MEANING[risk.tier]}.`);
    lines.push(`- Main driver: ${risk.driver}.`);
    if (!risk.hazardMatches && askedHazard !== "any") {
      lines.push(
        `- Note: no ${askedHazard}-specific zone is monitored in ${risk.regionName} yet. This zone is flagged for **${hazardWord(risk)}**, so treat it as the nearest signal, not a direct ${askedHazard} score.`
      );
    }
    if (gis) {
      const exposure = gis.exposure
        ? `${gis.exposure.villages} villages and ${gis.exposure.roadKm} km of road`
        : "exposure not mapped yet";
      const terrain =
        gis.meanSlopeDeg !== null
          ? `, mean slope ${gis.meanSlopeDeg.toFixed(1)}°`
          : "";
      lines.push(`- Where: around ${gis.centroid.lat}°N, ${gis.centroid.lng}°E (~${gis.areaKm2.toLocaleString("en-IN")} km²)${terrain}. Exposed: ${exposure}.`);
    }
    if (community) {
      if (community.reports.length === 0) {
        lines.push("- Ground: no community reports yet.");
      } else {
        const latest = community.reports[0];
        const status =
          community.status === "none"
            ? "no hazard reports yet, only updates or questions"
            : `${community.corroborations} reporter(s), ${community.status}`;
        lines.push(`- Ground: ${status}. Latest from ${latest.location}: "${latest.message}"`);
      }
    }
    if (fused && fused.fusedTier !== fused.sensorTier) {
      lines.push(`- Fused view: raised to **${TIER_LABEL[fused.fusedTier]}**. ${fused.rationale}`);
    } else if (fused?.disagreement) {
      lines.push(`- Heads-up: sensor and ground signals disagree. ${fused.rationale}`);
    }
    lines.push("");
  }
  return lines;
}

function composeCompare(result: OrchestratorResult): string[] {
  const lines = ["**States ranked by current risk**", ""];
  result.risk.forEach((risk, index) => {
    lines.push(
      `${index + 1}. **${risk.regionName}**: ${TIER_LABEL[risk.tier]}, ${fmt(risk.score)} (${fmt(risk.range[0])}–${fmt(risk.range[1])}). ${risk.zoneName}, ${hazardWord(risk)}; ${risk.driver}.`
    );
  });
  const top = result.risk[0];
  if (top) {
    lines.push("", `Highest right now: **${top.regionName}** (${top.zoneName}). Ask me about it for exposure and ground reports.`);
  }
  return lines;
}

function composeExposure(result: OrchestratorResult): string[] {
  const lines: string[] = [];
  for (const gis of result.gis) {
    const risk = result.risk.find((r) => r.zoneId === gis.zoneId);
    lines.push(`**${gis.zoneName}, ${regionName(gis.regionId)}**`);
    lines.push(`- Location: ${gis.centroid.lat}°N, ${gis.centroid.lng}°E; box ${gis.bbox.minLat}–${gis.bbox.maxLat}°N, ${gis.bbox.minLng}–${gis.bbox.maxLng}°E (~${gis.areaKm2.toLocaleString("en-IN")} km²).`);
    lines.push(
      gis.exposure
        ? `- Exposed: **${gis.exposure.villages} villages** and **${gis.exposure.roadKm} km of road**.`
        : "- Exposure: not mapped yet."
    );
    lines.push(
      gis.meanSlopeDeg !== null && gis.elevationRangeM !== null
        ? `- Terrain: mean slope ${gis.meanSlopeDeg.toFixed(1)}°, relief ${Math.round(gis.elevationRangeM)} m.`
        : "- Terrain: slope/relief layer not supplied for this zone yet (GIS pipeline pending)."
    );
    lines.push(`- Context: ${gis.description}`);
    if (risk) lines.push(`- Current risk: ${riskLine(risk)}.`);
    lines.push("");
  }
  return lines;
}

function composeReports(result: OrchestratorResult): string[] {
  const lines: string[] = [];
  for (const community of result.community) {
    lines.push(`**Ground reports: ${regionName(community.regionId)}**`);
    if (community.reports.length === 0) {
      lines.push("- Nothing posted yet.");
    } else {
      for (const report of community.reports) {
        lines.push(`- ${report.author} (${report.location}, ${report.minutesAgo} min ago, ${report.kind}): "${report.message}"`);
      }
      lines.push(
        `- Status: **${community.status}**. ${community.corroborations} distinct reporter(s); 3 people or 1 verified officer are needed to confirm.`
      );
    }
    lines.push("");
  }
  return lines;
}

function composeAlerts(result: OrchestratorResult): string[] {
  const lines: string[] = [];
  for (const alert of result.alerts) {
    lines.push(`**Draft ${alert.audience} alert: ${regionName(alert.regionId)}**`);
    lines.push(alert.full);
    lines.push("", `SMS (${alert.compressed.length} chars): ${alert.compressed}`, "");
  }
  if (result.alerts.length > 0) {
    lines.push("Drafts only. Nothing is sent until an officer approves it.");
  }
  return lines;
}

export function composeAnswer(result: OrchestratorResult, outOfScope: string[]): string {
  const { intent, regionIds, hazard } = result.request;
  const lines: string[] = [];

  if (outOfScope.length > 0) {
    lines.push(
      `${outOfScope.join(", ")} ${outOfScope.length === 1 ? "is" : "are"} outside what this platform covers. The model is trained only on the seven North East states (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Tripura), so I won't guess there.`,
      ""
    );
  }

  if (intent === "smalltalk") {
    return [...lines, "Hi! Ask me about landslide or flood risk anywhere in the seven North East states. For example: \"What are the chances of a landslide in Mizoram?\""].join("\n").trim();
  }
  if (intent === "explain") return [...lines, EXPLAINER].join("\n").trim();

  if (regionIds.length === 0) {
    if (lines.length > 0) return lines.join("\n").trim();
    return "Which state or place do you mean? I cover Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland and Tripura.";
  }

  switch (intent) {
    case "compare":
      lines.push(...composeCompare(result));
      break;
    case "exposure":
      lines.push(...composeExposure(result));
      break;
    case "reports":
      lines.push(...composeReports(result));
      break;
    case "alert":
      lines.push(...composeAlerts(result));
      break;
    default:
      lines.push(...composeRisk(result, hazard));
  }

  if (result.risk.length === 0 && intent !== "reports") {
    lines.push("No monitored zones there yet, so there's no score to give.");
  }
  if (result.risk.length > 0) lines.push("", `_${DATA_NOTE}_`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Follow-up chips that make sense after this answer. */
export function suggestFollowUps(result: OrchestratorResult): string[] {
  const { intent, regionIds } = result.request;
  const place = regionIds.length === 1 ? regionName(regionIds[0]) : null;
  const top = result.risk[0]?.regionName;

  switch (intent) {
    case "risk":
      return place
        ? [`Which villages are exposed in ${place}?`, `Any ground reports from ${place}?`, `Draft an alert for ${place} villagers`]
        : ["Which state is riskiest?"];
    case "compare":
      return top ? [`Why is ${top} the highest?`, `Draft an alert for ${top}`, "How does the risk score work?"] : [];
    case "exposure":
      return place ? [`Any ground reports from ${place}?`, `Draft an alert for ${place}`] : [];
    case "reports":
      return place ? [`What's the landslide risk in ${place}?`, "How are reports confirmed?"] : [];
    case "alert":
      return place ? [`Draft it for the ${place} district office`, `Which villages are exposed in ${place}?`] : [];
    default:
      return ["What are the chances of a landslide in Mizoram?", "Which state is riskiest?"];
  }
}
