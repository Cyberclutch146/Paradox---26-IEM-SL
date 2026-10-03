"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import LocationSelector from "@/components/layout/LocationSelector";
import RiskScorePanel from "@/components/risk/RiskScorePanel";
import MLPredictionPanel from "@/components/risk/MLPredictionPanel";
import AlertsFeed from "@/components/alerts/AlertsFeed";
import InsightCards from "@/components/insights/InsightCards";
import AssistantBot from "@/components/chatbot/AssistantBot";
import { useRegion } from "@/state/region-context";
import { getAlerts, getRiskZones, getRiskSummary } from "@/lib/data-client";
import { useData } from "@/lib/use-data";
import { getRiskColorClass, cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[55vh] lg:h-[60vh] rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-text-tertiary">
        <span className="font-data text-xs uppercase tracking-widest">Loading map…</span>
      </div>
    </div>
  ),
});

function DataCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string;
  value: string;
  subValue: string;
  accent?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#141414]/80 backdrop-blur-md border border-white/[0.06] px-4 py-3.5 animate-fade-in">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff7a00]/40 to-transparent" />
      <div className="eyebrow eyebrow-xs mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-data text-2xl font-bold tracking-tight",
            accent ? getRiskColorClass("high") : "text-white"
          )}
        >
          {value}
        </span>
        {subValue && <span className="text-xs text-[#5a5a66]">{subValue}</span>}
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { region, setRegion } = useRegion();
  const alerts = useData(() => getAlerts(region.id), [region.id]);
  const zones = useData(() => getRiskZones(region.id), [region.id]);
  const summary = useData(() => getRiskSummary(region.id), [region.id]);
  const [isDetecting, setIsDetecting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const name = data.address?.city || data.address?.town || data.address?.village || data.address?.state || "Unknown Location";
          
          const customRegion = {
            id: `global_${data.place_id}`,
            name: name,
            subLabel: data.display_name,
            type: "state" as const,
            center: { lat: latitude, lng: longitude },
            zoom: 11
          };
          setRegion(customRegion);
          router.replace(`${pathname}?region=${customRegion.id}&name=${encodeURIComponent(customRegion.name)}&lat=${latitude}&lng=${longitude}`, { scroll: false });
        } catch (e) {
          console.error("Failed to detect location", e);
          alert("Failed to find location name.");
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve your location");
        setIsDetecting(false);
      }
    );
  };

  const activeCount = alerts.data?.length ?? null;
  const criticalCount = alerts.data?.filter((a) => a.severity === "danger").length ?? null;
  const zoneCount = zones.data?.features.length ?? null;
  const peakZone = zones.data && zones.data.features.length > 0
    ? zones.data.features.reduce((prev, curr) => curr.properties.riskScore > prev.properties.riskScore ? curr : prev)
    : null;
  const peakScore = peakZone ? peakZone.properties.riskScore : null;
  const peakLevel = peakZone ? peakZone.properties.riskLevel : null;
  const elevatedZones = zones.data
    ? zones.data.features.filter(
        (f) => f.properties.riskLevel === "warning" || f.properties.riskLevel === "danger"
      )
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">

      <main className="flex-1">
        <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-3 mx-auto max-w-[1600px]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div className="flex-1">
              <p className="eyebrow mb-1.5">Region watch</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight mr-1">
                  {region.name} <span className="italic text-accent">briefing</span>
                </h1>
                
                {/* Location Controls aligned with title */}
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                  <div className="relative z-[9999]">
                    <LocationSelector />
                  </div>
                  <button 
                    onClick={handleDetectLocation}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300",
                      isDetecting 
                        ? "bg-[#ff7a00] text-white border-[#ff7a00] opacity-80 cursor-wait" 
                        : "bg-transparent text-[#ff7a00] border-[#ff7a00]/40 hover:bg-[#ff7a00] hover:text-white hover:border-[#ff7a00] shadow-sm hover:shadow-[0_0_12px_rgba(255,122,0,0.2)]"
                    )}
                    disabled={isDetecting}
                  >
                    {isDetecting ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="hidden sm:inline">Detect Location</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right side global actions */}
            <div className="flex items-center gap-4 shrink-0">
              <span className="font-data text-[11px] text-text-tertiary hidden lg:inline">
                Sample data for demonstration
              </span>
              <Link href="/chat" className="btn-primary px-4 py-2 text-sm shadow-sm transition-all">
                Auth Platform →
              </Link>
            </div>
          </div>
          <RiskMap />
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-10 mx-auto max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="md:col-span-2">
                  <RiskScorePanel />
                </div>
                <div className="md:col-span-3 flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <DataCard
                      label="Monitored zones"
                      value={zoneCount === null ? "—" : `${zoneCount}`}
                      subValue="active"
                    />
                    <DataCard
                      label="Active alerts"
                      value={activeCount === null ? "—" : `${activeCount}`}
                      subValue={criticalCount !== null ? `${criticalCount} critical` : ""}
                      accent
                    />
                    <DataCard
                      label="Peak risk"
                      value={peakScore === null ? "—" : `${peakScore.toFixed(3)}`}
                      subValue={peakLevel === null ? "" : peakLevel}
                    />
                  </div>

                  <div className="card-tint p-4 flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="eyebrow eyebrow-xs">
                        {summary.data ? `${summary.data.regionName} snapshot` : "Region snapshot"}
                      </span>
                      {summary.data && (
                        <span
                          className={cn(
                            "ml-auto font-data text-xs font-bold uppercase tracking-widest",
                            getRiskColorClass(summary.data.level)
                          )}
                        >
                          {summary.data.score.toFixed(3)} · {summary.data.level}
                        </span>
                      )}
                    </div>

                    {zones.data && zones.data.features.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <SnapshotStat label="Risk zones" value={`${zoneCount}`} />
                        <SnapshotStat
                          label="Elevated risk"
                          value={`${elevatedZones?.length ?? 0}`}
                        />
                        <SnapshotStat
                          label="Top zone"
                          value={elevatedZones?.[0]?.properties.name ?? "—"}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">
                        No monitored zones in {region.name} yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <InsightCards />
              <MLPredictionPanel />
            </div>

            <aside className="lg:col-span-5 xl:col-span-4 space-y-6" aria-label="Alerts">
              <AlertsFeed />
            </aside>
          </div>
        </section>
      </main>

      <Footer />
      <AssistantBot />
      </div>
    </div>
  );
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
      <div className="eyebrow eyebrow-xs mb-1">{label}</div>
      <div className="font-data text-sm font-semibold text-white truncate">{value}</div>
    </div>
  );
}