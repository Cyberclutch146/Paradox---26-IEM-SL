import type { RiskLevel } from "@/data/types";

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#5b8049",
  watch: "#b8892a",
  warning: "#c4512c",
  danger: "#a0281b",
};

export function riskColor(level: RiskLevel): string {
  return RISK_COLORS[level];
}