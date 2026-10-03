"use client";

import { useData } from "@/lib/use-data";
import { useRegion } from "@/state/region-context";
import { getOrchestratorPrediction } from "@/lib/data-client";
import { getRiskColorClass } from "@/lib/utils";

export default function MLPredictionPanel() {
  const { region } = useRegion();
  
  const { data, loading, error } = useData(() => {
    return getOrchestratorPrediction({
      regionId: region.id,
      location: { latitude: region.center.lat, longitude: region.center.lng },
      weather: { rain_today_mm: 12, rain_72h_incl_today_mm: 45 },
      soil: { sm_0_7cm_ante: 0.3, sm_0_7cm_change_3d: 0.05 }
    });
  }, [region.id, region.center.lat, region.center.lng]);

  return (
    <div className="card-static p-5 animate-fade-in flex flex-col relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent -z-10" />
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="eyebrow mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            AI Orchestrator Engine
          </p>
          <p className="text-sm font-medium text-text-primary">
            Real-Time Analysis
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-risk-danger">Failed to connect to ML backend.</p>
      ) : loading ? (
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-4 w-full bg-bg-surface-hover rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-bg-surface-hover rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-bg-surface-hover rounded animate-pulse" />
        </div>
      ) : data ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-baseline justify-between mb-4">
             <div className="flex flex-col">
               <span className="text-[10px] text-text-tertiary font-data uppercase tracking-widest mb-1">Risk Score</span>
               <span className={`font-data text-3xl font-bold ${getRiskColorClass(data.result.risk_level)}`}>
                 {data.result.risk_score.toFixed(3)}
               </span>
             </div>
             <div className="flex flex-col items-end">
               <span className="text-[10px] text-text-tertiary font-data uppercase tracking-widest mb-1">Severity</span>
               <span className={`text-[12px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-md ${getRiskColorClass(data.result.risk_level)} border-current bg-current/10`}>
                 {data.result.risk_level}
               </span>
             </div>
          </div>
          
          <div className="bg-bg-surface/50 p-3 rounded-lg border border-border-subtle mt-2 flex-1">
             <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">Orchestrator Rationale</p>
             <p className="text-[13px] leading-relaxed text-text-primary">
               {data.result.rationale}
             </p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[10px] text-text-tertiary font-data">
             <span>{data.isFallback ? "Fallback Model" : "Live ML Endpoint"}</span>
             <span>{new Date(data.timestamp).toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">No ML prediction available.</p>
      )}
    </div>
  );
}
