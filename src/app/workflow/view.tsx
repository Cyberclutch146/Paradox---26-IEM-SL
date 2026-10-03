"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRegion } from "@/state/region-context";
import Sidebar from "@/components/layout/Sidebar";
import { getAlerts, getRiskZones, getRiskSummary } from "@/lib/data-client";
import { useData } from "@/lib/use-data";
import { getRiskColorClass } from "@/lib/utils";

type Step = "idle" | "query" | "orchestrating" | "agents" | "synthesis" | "complete";

export default function WorkflowView() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [query, setQuery] = useState("Draft an alert for Tawang villagers about heavy rainfall");
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [output, setOutput] = useState("");
  
  const { region } = useRegion();
  
  // Real Data hooks instead of fake sensors
  const alerts = useData(() => getAlerts(region.id), [region.id]);
  const zones = useData(() => getRiskZones(region.id), [region.id]);
  const summary = useData(() => getRiskSummary(region.id), [region.id]);

  useEffect(() => setMounted(true), []);

  const handleSimulate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (step !== "idle" && step !== "complete") return;
    if (!query.trim()) return;
    
    setStep("query");
    setOutput("");
    setActiveAgents([]);

    await new Promise(r => setTimeout(r, 1000));
    setStep("orchestrating");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: query }],
          regionId: region.id,
        }),
      });
      const data = await response.json();

      const usedAgents = new Set<string>();
      if (data.steps) {
        data.steps.forEach((s: any) => {
          if (s.agent === "risk") usedAgents.add("Risk-Scoring");
          if (s.agent === "gis") usedAgents.add("GIS / Spatial");
          if (s.agent === "community") usedAgents.add("Community");
          if (s.agent === "alert") usedAgents.add("Alerting");
        });
      }
      
      if (usedAgents.size === 0) {
         usedAgents.add("Risk-Scoring");
      }

      setActiveAgents(Array.from(usedAgents));
      setStep("agents");
      
      await new Promise(r => setTimeout(r, 1500));
      
      setStep("synthesis");
      await new Promise(r => setTimeout(r, 1500));

      setOutput(data.reply || "No reply generated.");
      setStep("complete");
      
    } catch (err) {
      console.error(err);
      setOutput("Error connecting to the orchestrator. Check your connection.");
      setStep("complete");
    }
  };

  const isStepActive = (targetStep: Step | Step[]) => {
    const steps = Array.isArray(targetStep) ? targetStep : [targetStep];
    return steps.includes(step);
  };

  const renderOutput = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i} className="text-text-tertiary">{part.slice(1, -1)}</em>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-bg-primary text-text-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0 h-screen overflow-y-auto">
        
        <main className="px-4 sm:px-8 pb-20 pt-8 max-w-[1400px] mx-auto w-full">
          <header className="mb-12 mt-8 md:mt-2">
            <p className="eyebrow mb-3 text-accent">Architecture & Systems</p>
            <h1 className="serif-display text-4xl sm:text-5xl font-medium tracking-tight mb-4">
              Intelligence Workflows
            </h1>
            <p className="text-text-secondary max-w-2xl text-[15px] leading-relaxed">
              DistraAI balances deterministic risk evaluation with a multi-agent AI orchestration layer. Test the live API flow or monitor the real deterministic outputs for {region.name} below.
            </p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: AI Orchestration Flow */}
            <div className="xl:col-span-2">
              <section className="mb-12 relative">
                <div className="absolute inset-0 bg-accent/5 blur-3xl -z-10 rounded-full w-full h-[300px] top-1/2 -translate-y-1/2 pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-medium flex items-center gap-3">
                    <span className={cn("h-2 w-2 rounded-full", step !== "idle" ? "bg-risk-watch animate-pulse" : "bg-accent")}></span>
                    AI Orchestration Simulator
                  </h2>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 w-full">
                  
                  {/* User Input Block */}
                  <div className={cn(
                    "card p-5 w-full md:w-56 relative z-10 flex flex-col items-center text-center transition-all duration-500",
                    isStepActive("query") ? "border-accent shadow-[0_0_20px_rgba(255,122,0,0.2)] scale-105" : ""
                  )}>
                    <div className={cn(
                      "h-10 w-10 rounded-full border flex items-center justify-center mb-3 transition-colors",
                      isStepActive("query") ? "bg-accent/10 border-accent text-accent" : "bg-bg-elevated border-border-strong text-text-secondary"
                    )}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    </div>
                    
                    <form onSubmit={handleSimulate} className="w-full flex flex-col items-center">
                      <label className="text-[10px] text-text-tertiary mb-2 block w-full text-left uppercase tracking-wider font-semibold">Test Input (Live)</label>
                      <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={step !== "idle" && step !== "complete"}
                        className="w-full bg-bg-surface-hover border border-border-strong rounded-lg px-2 py-1.5 text-xs text-text-primary mb-2 focus:outline-none focus:border-accent disabled:opacity-50"
                        placeholder="Type query..."
                      />
                      <button 
                        type="submit"
                        disabled={step !== "idle" && step !== "complete"}
                        className="btn-primary w-full py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {step === "idle" || step === "complete" ? "Run Query" : "Processing..."}
                      </button>
                    </form>
                  </div>

                  {/* Connection 1 */}
                  <div className="hidden md:flex w-8 items-center justify-center relative h-px bg-border-subtle shrink-0">
                     {isStepActive(["query", "orchestrating"]) && (
                       <div className="absolute w-1.5 h-1.5 rounded-full bg-accent left-0 animate-[slide-right_1s_infinite]"></div>
                     )}
                  </div>
                  <div className="flex md:hidden h-6 w-px bg-border-subtle shrink-0 relative"></div>

                  {/* Orchestrator */}
                  <div className={cn(
                    "card-static border-accent/20 p-5 w-full md:w-64 relative z-10 flex flex-col items-center text-center transition-all duration-500",
                    isStepActive("orchestrating") ? "border-accent/80 shadow-[0_0_30px_rgba(255,122,0,0.3)] scale-110" : "scale-105"
                  )}>
                    {isStepActive("orchestrating") && <div className="absolute -inset-px rounded-xl border border-accent animate-pulse"></div>}
                    
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center mb-3 border shadow-sm relative overflow-hidden transition-all duration-500",
                      isStepActive("orchestrating") ? "bg-accent/30 border-accent/60" : "bg-accent/10 border-accent/20"
                    )}>
                      <svg className="w-5 h-5 text-accent relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 text-text-primary">Orchestrator Agent</h3>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {isStepActive("orchestrating") ? <span className="text-accent">Analyzing intent...</span> : "Parses & delegates tasks"}
                    </p>
                  </div>

                  {/* Connections 2 */}
                  <div className="hidden md:flex flex-1 min-w-[20px] items-center justify-center relative h-px bg-border-subtle shrink-0">
                     {isStepActive(["orchestrating", "agents"]) && (
                       <div className="absolute w-1.5 h-1.5 rounded-full bg-risk-watch left-0 animate-[slide-right_1.5s_infinite]"></div>
                     )}
                  </div>
                  <div className="flex md:hidden h-6 w-px bg-border-subtle shrink-0 relative"></div>

                  {/* Specialized Agents */}
                  <div className="flex flex-col gap-2 w-full md:w-56 relative z-10">
                    {['Risk-Scoring', 'GIS / Spatial', 'Community', 'Alerting'].map((agent) => {
                      const isActiveAgent = activeAgents.includes(agent) && isStepActive(["agents", "synthesis"]);
                      return (
                        <div key={agent} className={cn(
                          "card-tint p-2.5 flex items-center gap-3 transition-all duration-500",
                          isActiveAgent ? "border-risk-watch bg-risk-watch/10 shadow-[0_0_15px_rgba(251,191,36,0.15)] scale-[1.02]" : "border-transparent"
                        )}>
                          <div className={cn(
                            "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                            isActiveAgent ? "bg-risk-watch/20 border-risk-watch" : "bg-bg-surface border-border-subtle"
                          )}>
                            {isActiveAgent ? (
                              <span className="w-1 h-1 rounded-full bg-risk-watch animate-ping"></span>
                            ) : (
                              <span className="w-1 h-1 rounded-full bg-accent opacity-50"></span>
                            )}
                          </div>
                          <div className="text-left">
                            <h4 className={cn("font-semibold text-[11px]", isActiveAgent ? "text-risk-watch" : "text-text-primary")}>{agent} Agent</h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Connection 3 */}
                  <div className="hidden md:flex w-8 items-center justify-center relative h-px bg-border-subtle shrink-0">
                    {isStepActive(["agents", "synthesis"]) && (
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-risk-danger left-0 animate-[slide-right_1.2s_infinite]"></div>
                    )}
                  </div>
                  <div className="flex md:hidden h-6 w-px bg-border-subtle shrink-0 relative"></div>

                  {/* Synthesis */}
                  <div className={cn(
                    "card p-5 w-full md:w-56 relative z-10 flex flex-col items-center text-center transition-all duration-500",
                    isStepActive("synthesis") || isStepActive("complete") ? "border-risk-danger bg-bg-surface shadow-[0_0_20px_rgba(248,113,113,0.2)] scale-105" : ""
                  )}>
                    <div className={cn(
                      "h-10 w-10 rounded-full border flex items-center justify-center mb-3 transition-colors",
                      isStepActive("synthesis") || isStepActive("complete") ? "bg-risk-danger/20 border-risk-danger text-risk-danger animate-pulse" : "bg-bg-elevated border-border-strong text-text-secondary"
                    )}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                    </div>
                    <h3 className="font-semibold text-xs mb-2 text-text-primary">Synthesized Output</h3>
                    
                    {step === "complete" ? (
                      <div className="text-[10px] leading-relaxed text-text-primary bg-bg-elevated border border-border-subtle p-2 rounded-lg text-left w-full animate-fade-in shadow-inner relative max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                         <div className="absolute top-0 left-0 w-1 h-full bg-risk-danger rounded-l-lg"></div>
                         {renderOutput(output)}
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-tertiary">
                        {isStepActive("synthesis") ? <span className="text-risk-danger animate-pulse">Generating reply...</span> : "Waiting for data..."}
                      </p>
                    )}
                  </div>

                </div>
              </section>

              {/* NON-AI Deterministic Risk Engine - Rules Visual */}
              <section className="mb-12">
                <h2 className="text-lg font-medium mb-6 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-risk-danger"></span>
                  Risk Engine Evaluation Thresholds
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                     { name: "Rainfall", val: "> 120mm", sub: "24h period", risk: "danger", label: "HIGH RISK", color: "text-risk-danger", bg: "bg-risk-danger" },
                     { name: "Soil Moisture", val: "> 85%", sub: "Saturation", risk: "warning", label: "WARNING", color: "text-risk-warning", bg: "bg-risk-warning" },
                     { name: "Slope Stability", val: "< 1.0", sub: "Factor of safety", risk: "watch", label: "WATCH", color: "text-risk-watch", bg: "bg-risk-watch" },
                     { name: "Vegetation", val: "Dense", sub: "Stable terrain", risk: "low", label: "SAFE", color: "text-risk-low", bg: "bg-risk-low" }
                  ].map((stat, i) => (
                     <div key={stat.name} className="card p-5 flex flex-col justify-between animate-scale-in hover:border-border-strong group" style={{ animationDelay: `${i * 100}ms` }}>
                       <div>
                         <p className="eyebrow mb-2 group-hover:text-text-secondary transition-colors">{stat.name}</p>
                         <div className="flex items-baseline gap-2 mb-3">
                           <p className="font-data text-2xl text-text-primary">{stat.val}</p>
                           <p className="text-[10px] text-text-tertiary">{stat.sub}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                         <div className={`h-1.5 w-1.5 rounded-full ${stat.bg} shadow-[0_0_8px_currentColor]`} style={{ color: `var(--risk-${stat.risk})` }}></div>
                         <span className={`text-[10px] font-bold tracking-wider ${stat.color}`}>{stat.label}</span>
                       </div>
                     </div>
                  ))}
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: Real-Time Deterministic Output */}
            <div className="xl:col-span-1 border-t xl:border-t-0 xl:border-l border-border-strong pt-8 xl:pt-0 xl:pl-8 space-y-8">
               
               {/* Summary Snapshot */}
               <div>
                 <h2 className="text-[15px] font-medium mb-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="h-1.5 w-1.5 rounded-full bg-text-primary"></span>
                     Real-Time Baseline
                   </div>
                   <span className="text-[10px] text-text-tertiary font-data uppercase tracking-widest">{region.name}</span>
                 </h2>
                 {summary.isLoading ? (
                   <div className="animate-pulse h-20 bg-bg-surface border border-border-subtle rounded-xl"></div>
                 ) : summary.data ? (
                   <div className="card-tint p-4 border border-border-subtle">
                     <p className="eyebrow eyebrow-xs mb-2 text-text-secondary">Overall Regional Score</p>
                     <div className="flex items-baseline justify-between">
                       <span className={cn("font-data text-3xl font-bold", getRiskColorClass(summary.data.level))}>
                         {summary.data.score.toFixed(3)}
                       </span>
                       <span className={cn("text-[11px] font-bold tracking-wider uppercase", getRiskColorClass(summary.data.level))}>
                         {summary.data.level}
                       </span>
                     </div>
                   </div>
                 ) : (
                   <p className="text-xs text-text-tertiary">No summary data available.</p>
                 )}
               </div>

               {/* Monitored Risk Zones */}
               <div>
                 <h3 className="font-semibold text-[13px] mb-3 text-text-primary">Active Risk Zones (Output)</h3>
                 {zones.isLoading ? (
                    <div className="space-y-2">
                      <div className="animate-pulse h-12 bg-bg-surface rounded-xl"></div>
                      <div className="animate-pulse h-12 bg-bg-surface rounded-xl"></div>
                    </div>
                 ) : zones.data && zones.data.features.length > 0 ? (
                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                     {zones.data.features.map((f, i) => {
                       const lvl = f.properties.riskLevel;
                       const color = getRiskColorClass(lvl);
                       const bg = lvl === "danger" ? "bg-risk-danger/10 border-risk-danger/30" :
                                  lvl === "warning" ? "bg-risk-warning/10 border-risk-warning/30" :
                                  lvl === "watch" ? "bg-risk-watch/10 border-risk-watch/30" : "bg-bg-surface hover:bg-bg-surface-hover border-transparent";
                       
                       return (
                         <div key={i} className={cn("border p-3 rounded-xl flex items-center justify-between transition-colors", bg)}>
                           <div className="min-w-0 flex-1 pr-3">
                             <p className="font-data text-[12px] text-text-primary truncate">{f.properties.name}</p>
                             <p className="text-[10px] text-text-tertiary">Score: {f.properties.riskScore.toFixed(2)}</p>
                           </div>
                           <div className="text-right shrink-0">
                             <p className={cn("text-[10px] font-bold tracking-wider uppercase", color)}>{lvl}</p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 ) : (
                   <p className="text-xs text-text-tertiary">No deterministic risk zones flagged.</p>
                 )}
               </div>

               {/* Active Alerts List */}
               <div>
                 <h3 className="font-semibold text-[13px] mb-3 text-text-primary">System Dispatch Feed</h3>
                 {alerts.isLoading ? (
                    <div className="space-y-2">
                      <div className="animate-pulse h-16 bg-bg-surface rounded-xl"></div>
                      <div className="animate-pulse h-16 bg-bg-surface rounded-xl"></div>
                    </div>
                 ) : alerts.data && alerts.data.length > 0 ? (
                   <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                     {alerts.data.map((alert) => (
                       <div key={alert.id} className="bg-bg-elevated border border-border-subtle p-3 rounded-xl">
                         <div className="flex items-center justify-between mb-1">
                           <span className={cn("text-[10px] font-bold tracking-wider uppercase", 
                             alert.severity === "danger" ? "text-risk-danger" : 
                             alert.severity === "warning" ? "text-risk-warning" : "text-risk-watch"
                           )}>
                             {alert.severity}
                           </span>
                           <span className="font-data text-[9px] text-text-tertiary">
                             {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                         <p className="text-[11px] text-text-primary line-clamp-2 leading-relaxed">{alert.message}</p>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="bg-bg-surface border border-border-subtle p-4 rounded-xl text-center">
                     <p className="text-[11px] text-text-tertiary">No active alerts right now.</p>
                   </div>
                 )}
               </div>

            </div>

          </div>
        </main>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-right {
          0% { left: 0; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
