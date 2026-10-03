"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import LocationSelector from "@/components/layout/LocationSelector";
import MLPredictionPanel from "@/components/risk/MLPredictionPanel";
import AlertsFeed from "@/components/alerts/AlertsFeed";
import InsightCards from "@/components/insights/InsightCards";
import AssistantBot from "@/components/chatbot/AssistantBot";
import { useRegion } from "@/state/region-context";
import { isWithinPredictionRange } from "@/data/regions";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-bg-surface">
      <span className="font-data text-xs uppercase tracking-widest text-text-tertiary animate-pulse">Loading map…</span>
    </div>
  ),
});

export default function DashboardView() {
  const { region, isRegionSet, setRegion } = useRegion();
  const [isDetecting, setIsDetecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Validate against NE India prediction bounds
        if (!isWithinPredictionRange(latitude, longitude)) {
          showToast("Location not included within prediction ranges.");
          setIsDetecting(false);
          return;
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const name = data.address?.state || data.address?.city || data.address?.town || "Unknown Location";

          const customRegion = {
            id: `custom_${data.place_id}`,
            name,
            subLabel: data.display_name,
            type: "state" as const,
            center: { lat: latitude, lng: longitude },
            zoom: 11,
          };
          setRegion(customRegion);
          router.replace(`${pathname}?region=${customRegion.id}&name=${encodeURIComponent(customRegion.name)}&lat=${latitude}&lng=${longitude}`, { scroll: false });
        } catch (e) {
          console.error("Failed to detect location", e);
          showToast("Failed to resolve location name.");
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        showToast("Unable to retrieve your location. Please allow location access.");
        setIsDetecting(false);
      }
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">

        {/* Toast notification */}
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] animate-slide-up pointer-events-none">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-bg-elevated border border-accent/40 shadow-pop text-sm font-medium text-text-primary max-w-sm text-center">
              <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {toast}
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full gap-6">

          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex-1">
              <p className="eyebrow mb-1.5 flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", isRegionSet ? "bg-accent animate-pulse" : "bg-text-tertiary")} />
                {isRegionSet ? "Operational Command" : "Select a region to begin"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight mr-1">
                  {isRegionSet ? (
                    <>{region.name} <span className="italic text-accent">briefing</span></>
                  ) : (
                    <span className="text-text-tertiary italic">No region selected</span>
                  )}
                </h1>

                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                  <div className="relative z-[9999]">
                    <LocationSelector />
                  </div>
                  <button
                    onClick={handleDetectLocation}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300",
                      isDetecting
                        ? "bg-accent text-text-on-accent border-accent opacity-80 cursor-wait"
                        : "bg-transparent text-accent border-accent/40 hover:bg-accent hover:text-text-on-accent hover:border-accent shadow-sm"
                    )}
                    disabled={isDetecting}
                  >
                    {isDetecting ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                        <span className="hidden sm:inline">Detect Location</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Link href="/chat" className="btn-primary px-4 py-2 text-sm shadow-sm transition-all">
                Live Field Log →
              </Link>
            </div>
          </header>

          {/* No region selected — prompt */}
          {!isRegionSet ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-24 text-center animate-fade-in">
              <div className="h-20 w-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg className="w-9 h-9 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <h2 className="serif-display text-2xl font-medium mb-2">Choose your region</h2>
                <p className="text-text-secondary text-sm max-w-xs mx-auto leading-relaxed">
                  Select one of the covered Northeast India states from the dropdown, or use <strong>Detect Location</strong> if you are in the region.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <LocationSelector />
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {isDetecting ? "Locating..." : "Detect Location"}
                </button>
              </div>
            </div>
          ) : (
            /* BENTO GRID */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">

              {/* CELL 1: Map (65%) */}
              <div className="lg:col-span-8 flex flex-col min-h-[500px] h-full card-static overflow-hidden">
                <RiskMap />
              </div>

              {/* CELL 2: Alert Stream (35%) */}
              <aside className="lg:col-span-4 flex flex-col card-static p-4 max-h-[500px] overflow-y-auto" aria-label="Alerts">
                <AlertsFeed />
              </aside>

              {/* CELL 3: ML Predictor */}
              <div className="lg:col-span-4 flex flex-col h-full">
                <MLPredictionPanel />
              </div>

              {/* CELL 4: Sensor Trends */}
              <div className="lg:col-span-8 flex flex-col h-full">
                <InsightCards />
              </div>

            </div>
          )}

        </main>

        <Footer />
        <AssistantBot />
      </div>
    </div>
  );
}