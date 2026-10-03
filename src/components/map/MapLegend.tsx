"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/data/types";

interface MapLegendProps {
  levelCounts?: Record<RiskLevel, number>;
  visibleLevels?: Set<RiskLevel>;
  onLevelToggle?: (level: RiskLevel, visible: boolean) => void;
}

const levels: { label: RiskLevel; color: string }[] = [
  { label: "low", color: "var(--risk-low)" },
  { label: "watch", color: "var(--risk-watch)" },
  { label: "warning", color: "var(--risk-warning)" },
  { label: "danger", color: "var(--risk-danger)" },
];

export default function MapLegend({
  levelCounts = { low: 0, watch: 0, warning: 0, danger: 0 },
  visibleLevels,
  onLevelToggle,
}: MapLegendProps) {
  const [hoveredLevel, setHoveredLevel] = useState<RiskLevel | null>(null);

  const isInteractive = typeof onLevelToggle === "function";
  const allVisible = visibleLevels === undefined;

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/95 backdrop-blur-sm px-3.5 py-3 shadow-card">
      <div className="eyebrow eyebrow-xs mb-2.5">Risk level</div>
      <div className="space-y-1.5">
        {levels.map((level) => {
          const count = levelCounts[level.label] ?? 0;
          const isVisible = allVisible || visibleLevels?.has(level.label);
          const isHovered = hoveredLevel === level.label;

          return (
            <div
              key={level.label}
              className={cn(
                "flex items-center gap-2.5 transition-opacity",
                !isVisible && "opacity-40",
                isInteractive && "cursor-pointer hover:opacity-100",
                isHovered && "opacity-100"
              )}
              onMouseEnter={() => setHoveredLevel(level.label)}
              onMouseLeave={() => setHoveredLevel(null)}
              onClick={() => isInteractive && onLevelToggle?.(level.label, !isVisible)}
              role={isInteractive ? "button" : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              onKeyDown={(e) => {
                if (isInteractive && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onLevelToggle?.(level.label, !isVisible);
                }
              }}
              aria-pressed={isVisible}
              aria-label={`${level.label} risk zones${count > 0 ? `, ${count} zone${count !== 1 ? "s" : ""}` : ""}`}
            >
              <div
                className="h-2.5 w-2.5 shrink-0"
                style={{ backgroundColor: level.color, opacity: 0.75, borderRadius: 2 }}
                aria-hidden="true"
              />
              <span className="text-xs text-text-secondary">{level.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "font-data text-[10px] text-text-tertiary ml-auto",
                    isHovered && "text-text-primary"
                  )}
                >
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}