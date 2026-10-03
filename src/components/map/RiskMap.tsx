"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LayerToggle, { type RiskLayer } from "./LayerToggle";
import MapLegend from "./MapLegend";
import { useRegion } from "@/state/region-context";
import { getRiskZones } from "@/lib/data-client";
import { useData } from "@/lib/use-data";
import { RISK_COLORS } from "@/lib/risk-colors";
import { cn } from "@/lib/utils";
import type { Region, RiskZoneCollection, RiskZoneFeature, RiskLevel } from "@/data/types";

function getFeatureStyle(feature: RiskZoneFeature) {
  const level = feature.properties.riskLevel;
  return {
    fillColor: RISK_COLORS[level],
    fillOpacity: 0.22,
    color: RISK_COLORS[level],
    weight: 1.5,
    opacity: 0.9,
  };
}

function onEachFeature(feature: RiskZoneFeature, layer: L.Layer) {
  const p = feature.properties;
  const popupContent = `
    <div style="min-width: 220px; padding: 4px 0; color: #f0f0f0;">
      <div style="font-family: Georgia, serif; font-size: 16px; font-weight: 600; margin-bottom: 8px;">${p.name}</div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 1px; background: ${RISK_COLORS[p.riskLevel]};" aria-hidden="true"></span>
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.06em; color: ${RISK_COLORS[p.riskLevel]};">${p.riskLevel}</span>
        <span style="font-size: 11px; font-family: monospace; color: #5a5a66; margin-left: auto;">score ${p.riskScore.toFixed(3)}</span>
      </div>
      <div style="font-size: 13px; color: #a1a1aa; line-height: 1.45; margin-bottom: 6px;"><strong style="color: #f0f0f0;">Driver:</strong> ${p.driver}</div>
      <div style="font-size: 13px; color: #a1a1aa; line-height: 1.45;">${p.description}</div>
    </div>
  `;
  (layer as L.Path).bindPopup(popupContent, {
    maxWidth: 320,
    className: "risk-popup",
  });
}

function RiskOverlay({
  collection,
  activeLayer,
  visibleLevels,
}: {
  collection: RiskZoneCollection;
  activeLayer: RiskLayer;
  visibleLevels?: Set<RiskLevel>;
}) {
  const filteredFeatures = useMemo(() => {
    let features = collection.features;

    if (activeLayer !== "combined") {
      features = features.filter(
        (f) => f.properties.riskType === activeLayer || f.properties.riskType === "combined"
      );
    }

    if (visibleLevels && visibleLevels.size > 0) {
      features = features.filter((f) => visibleLevels.has(f.properties.riskLevel));
    }

    return features;
  }, [collection, activeLayer, visibleLevels]);

  const geojsonData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredFeatures,
    }),
    [filteredFeatures]
  );

  return (
    <GeoJSON
      key={`${activeLayer}-${filteredFeatures.length}`}
      data={geojsonData as never}
      style={getFeatureStyle as never}
      onEachFeature={onEachFeature as never}
    />
  );
}

function RecenterMap({ region }: { region: Region }) {
  const map = useMap();

  useEffect(() => {
    map.setView([region.center.lat, region.center.lng], region.zoom, { animate: true });
  }, [map, region]);

  return null;
}

function ZoomControl() {
  const map = useMap();

  useEffect(() => {
    const zoomControl = L.control.zoom({ position: "bottomright" });
    zoomControl.addTo(map);
    return () => {
      zoomControl.remove();
    };
  }, [map]);

  return null;
}

interface RiskMapProps {
  heightClassName?: string;
}

export default function RiskMap({
  heightClassName = "h-[55vh] lg:h-[60vh]",
}: RiskMapProps) {
  const { region } = useRegion();
  const { data, error } = useData(() => getRiskZones(region.id), [region.id]);
  const [activeLayer, setActiveLayer] = useState<RiskLayer>("combined");
  const [visibleLevels, setVisibleLevels] = useState<Set<RiskLevel>>(new Set());
  const [darkTiles, setDarkTiles] = useState(true);

  const levelCounts = useMemo(() => {
    if (!data) return {} as Record<RiskLevel, number>;
    const counts = data.features.reduce((acc, feature) => {
      const level = feature.properties.riskLevel;
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    }, {} as Record<RiskLevel, number>);
    return counts;
  }, [data]);

  const handleLevelToggle = (level: RiskLevel, visible: boolean) => {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.add(level);
      } else {
        next.delete(level);
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden border border-white/[0.06] shadow-card",
        heightClassName,
        darkTiles && "dark-map-mode"
      )}
    >
      <MapContainer
        center={[region.center.lat, region.center.lng]}
        zoom={region.zoom}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          key={darkTiles ? "dark" : "light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className={darkTiles ? "dark-map-tiles" : ""}
        />
        {data && data.features.length > 0 && (
          <RiskOverlay collection={data} activeLayer={activeLayer} visibleLevels={visibleLevels} />
        )}
        <RecenterMap region={region} />
        <ZoomControl />
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000]">
        <LayerToggle activeLayer={activeLayer} onLayerChange={setActiveLayer} />
      </div>

      <div className="absolute bottom-8 left-4 z-[1000]">
        <MapLegend levelCounts={levelCounts} visibleLevels={visibleLevels} onLevelToggle={handleLevelToggle} />
      </div>

      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-lg bg-[#1c1c1c]/90 backdrop-blur-sm border border-white/[0.08] px-3 py-1.5 shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-risk-low" />
          </span>
          <span className="font-data text-xs font-medium text-white">{region.name}</span>
        </div>
        <button
          onClick={() => setDarkTiles((prev) => !prev)}
          className="rounded-lg bg-[#1c1c1c]/90 backdrop-blur-sm border border-white/[0.08] px-2.5 py-1.5 shadow-card text-[10px] font-data font-medium text-[#a1a1aa] hover:text-white transition-colors"
          aria-label="Toggle map theme"
        >
          {darkTiles ? "Light Map" : "Dark Map"}
        </button>
      </div>

      {error && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-bg-primary/70 backdrop-blur-sm">
          <p className="text-sm text-risk-high px-4 text-center">
            Failed to load risk zones for {region.name}.
          </p>
        </div>
      )}

      {!error && data && data.features.length === 0 && (
        <div className="absolute inset-x-0 bottom-24 z-[1001] flex justify-center px-4">
          <div className="rounded-xl border border-border-subtle bg-bg-elevated/95 backdrop-blur-sm px-4 py-3 shadow-card">
            <p className="text-sm text-text-secondary">
              No monitored risk zones in {region.name} yet.
            </p>
          </div>
        </div>
      )}

      {!error && !data && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-bg-primary/40">
          <span className="font-data text-xs uppercase tracking-widest text-text-tertiary">
            Loading zones…
          </span>
        </div>
      )}
    </div>
  );
}