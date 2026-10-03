"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type RiskLayer = "flood" | "landslide" | "combined";

interface LayerToggleProps {
  activeLayer: RiskLayer;
  onLayerChange: (layer: RiskLayer) => void;
}

const layers: { id: RiskLayer; label: string }[] = [
  { id: "flood", label: "Flood" },
  { id: "landslide", label: "Landslide" },
  { id: "combined", label: "Combined" },
];

const layerLabels: Record<RiskLayer, string> = {
  flood: "Flood risk layer",
  landslide: "Landslide risk layer",
  combined: "Combined flood and landslide risk layer",
};

export default function LayerToggle({ activeLayer, onLayerChange }: LayerToggleProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = layerLabels[activeLayer] + " selected";
    }
  }, [activeLayer]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        nextIndex = (index + 1) % layers.length;
        break;
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = (index - 1 + layers.length) % layers.length;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = layers.length - 1;
        break;
      default:
        return;
    }
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      <div
        className="flex rounded-xl border border-border-subtle bg-bg-elevated/95 backdrop-blur-sm p-1 shadow-card"
        role="tablist"
        aria-label="Risk layer selection"
      >
        {layers.map((layer, index) => (
          <button
            key={layer.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={activeLayer === layer.id}
            aria-controls={`layer-panel-${layer.id}`}
            id={`layer-tab-${layer.id}`}
            onClick={() => onLayerChange(layer.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeLayer === layer.id
                ? "bg-accent-subtle text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover"
            )}
          >
            <span>{layer.label}</span>
          </button>
        ))}
      </div>
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}