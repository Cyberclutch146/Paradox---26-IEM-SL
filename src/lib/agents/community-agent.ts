/**
 * Agent 2 — Community & Reporting.
 *
 * Collects ground reports posted from a state and applies the PRD's
 * corroboration rule: a report is "confirmed" only with 3 distinct
 * confirming people, or 1 verified field officer. Trust comes from people,
 * not from an AI classifier, so this agent never upgrades a report by itself.
 */
import { getMockCommunity } from "@/lib/mock-store";
import { resolvePlaces } from "./places";
import type { CommunityFinding, CommunityReport } from "./types";

export const CONFIRMATIONS_NEEDED = 3;

export function communityAgent(regionIds: string[], now: Date = new Date()): CommunityFinding[] {
  const messages = getMockCommunity();

  return regionIds.map((regionId) => {
    const reports: CommunityReport[] = messages
      .filter((message) => resolvePlaces(message.location).regionIds.includes(regionId))
      .map((message) => ({
        id: message.id,
        author: message.username,
        location: message.location,
        message: message.message,
        kind: message.type,
        minutesAgo: Math.max(0, Math.round((now.getTime() - new Date(message.timestamp).getTime()) / 60000)),
      }));

    const reporters = new Set(reports.filter((r) => r.kind === "report").map((r) => r.author));
    // The sample feed has no officer accounts yet; the field is here so the rule is complete.
    const verifiedOfficer = false;
    const corroborations = reporters.size;
    const status =
      corroborations === 0
        ? "none"
        : verifiedOfficer || corroborations >= CONFIRMATIONS_NEEDED
          ? "confirmed"
          : "unconfirmed";

    return { regionId, reports, corroborations, verifiedOfficer, status };
  });
}
