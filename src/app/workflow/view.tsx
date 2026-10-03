"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function WorkflowView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary px-4 sm:px-8 pb-20 pt-8 max-w-[1400px] mx-auto overflow-hidden">
      <header className="mb-16 mt-8 md:mt-2">
        <p className="eyebrow mb-3 text-accent">Architecture</p>
        <h1 className="serif-display text-4xl sm:text-5xl font-medium tracking-tight mb-4">
          Intelligence Workflows
        </h1>
        <p className="text-text-secondary max-w-2xl text-[15px] leading-relaxed">
          DistraAI routes unstructured field reports and complex user queries through a multi-agent orchestration layer, synthesizing insights from real-time telemetry and strict deterministic risk rules.
        </p>
      </header>

      {/* Orchestration Pipeline Diagram */}
      <section className="mb-24 relative">
        <div className="absolute inset-0 bg-accent/5 blur-3xl -z-10 rounded-full w-full h-[300px] top-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <h2 className="text-lg font-medium mb-12 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-accent"></span>
          Multi-Agent Orchestration
        </h2>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4 w-full">
          
          {/* User Input */}
          <div className="card p-6 w-full lg:w-56 relative z-10 flex flex-col items-center text-center animate-fade-in group hover:border-border-strong">
            <div className="h-12 w-12 rounded-full bg-bg-elevated border border-border-strong flex items-center justify-center mb-4 group-hover:border-accent transition-colors">
              <svg className="w-5 h-5 text-text-secondary group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-text-primary">User Query</h3>
            <p className="text-[11px] text-text-tertiary">Natural language or field report</p>
          </div>

          {/* Connection */}
          <div className="hidden lg:flex w-16 items-center justify-center relative h-px bg-border-subtle shrink-0">
             <div className="absolute w-1.5 h-1.5 rounded-full bg-accent left-0 animate-[slide-right_2s_infinite]"></div>
          </div>
          <div className="flex lg:hidden h-8 w-px bg-border-subtle shrink-0 relative"></div>

          {/* Orchestrator */}
          <div className="card-static border-accent/20 p-8 w-full lg:w-72 relative z-10 flex flex-col items-center text-center shadow-[0_0_30px_rgba(255,122,0,0.08)] scale-105 animate-scale-in" style={{ animationDelay: '100ms' }}>
            <div className="absolute -inset-px rounded-xl border border-accent/40 animate-pulse"></div>
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-5 border border-accent/20 shadow-sm relative overflow-hidden">
               <div className="absolute inset-0 bg-accent/20 animate-pulse"></div>
              <svg className="w-7 h-7 text-accent relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="font-semibold text-[15px] mb-2 text-text-primary">Orchestrator Agent</h3>
            <p className="text-[12px] text-text-secondary leading-relaxed">Parses intent and delegates to specialized agent network</p>
          </div>

          {/* Connections */}
          <div className="hidden lg:flex flex-1 min-w-[32px] items-center justify-center relative h-px bg-border-subtle shrink-0">
             <div className="absolute w-1.5 h-1.5 rounded-full bg-accent left-0 animate-[slide-right_2s_infinite]" style={{ animationDelay: '500ms' }}></div>
          </div>
          <div className="flex lg:hidden h-8 w-px bg-border-subtle shrink-0 relative"></div>

          {/* Specialized Agents */}
          <div className="flex flex-col gap-3 w-full lg:w-64 relative z-10">
            {['Risk-Scoring', 'GIS / Spatial', 'Community', 'Alerting'].map((agent, i) => (
              <div key={agent} className="card-tint p-3.5 flex items-center gap-4 animate-slide-up hover:border-border-strong hover:bg-bg-surface-hover transition-colors group cursor-default" style={{ animationDelay: `${200 + i * 100}ms` }}>
                <div className="h-7 w-7 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0 group-hover:border-accent/50 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent group-hover:scale-125 transition-transform"></span>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-[13px] text-text-primary">{agent} Agent</h4>
                  <p className="text-[10px] text-text-tertiary">Retrieves specialized telemetry</p>
                </div>
              </div>
            ))}
          </div>

          {/* Connection */}
          <div className="hidden lg:flex w-16 items-center justify-center relative h-px bg-border-subtle shrink-0">
            <div className="absolute w-1.5 h-1.5 rounded-full bg-accent left-0 animate-[slide-right_2s_infinite]" style={{ animationDelay: '1000ms' }}></div>
          </div>
          <div className="flex lg:hidden h-8 w-px bg-border-subtle shrink-0 relative"></div>

          {/* Synthesis */}
          <div className="card p-6 w-full lg:w-56 relative z-10 flex flex-col items-center text-center animate-slide-up group hover:border-border-strong" style={{ animationDelay: '600ms' }}>
            <div className="h-12 w-12 rounded-full bg-bg-elevated border border-border-strong flex items-center justify-center mb-4 group-hover:bg-bg-surface-hover transition-colors">
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-text-primary">Synthesized Output</h3>
            <p className="text-[11px] text-text-tertiary">Actionable chat reply</p>
          </div>

        </div>
      </section>

      {/* Risk Engine Rules */}
      <section className="mb-20">
        <h2 className="text-lg font-medium mb-8 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-risk-danger"></span>
          Deterministic Risk Engine
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
             { name: "Rainfall", val: "> 120mm", sub: "24h period", risk: "danger", label: "HIGH RISK", color: "text-risk-danger", bg: "bg-risk-danger" },
             { name: "Soil Moisture", val: "> 85%", sub: "Saturation", risk: "warning", label: "WARNING", color: "text-risk-warning", bg: "bg-risk-warning" },
             { name: "Slope Stability", val: "< 1.0", sub: "Factor of safety", risk: "watch", label: "WATCH", color: "text-risk-watch", bg: "bg-risk-watch" },
             { name: "Vegetation", val: "Dense", sub: "Stable terrain", risk: "low", label: "SAFE", color: "text-risk-low", bg: "bg-risk-low" }
          ].map((stat, i) => (
             <div key={stat.name} className="card p-6 flex flex-col justify-between animate-scale-in hover:border-border-strong group" style={{ animationDelay: `${i * 100}ms` }}>
               <div>
                 <p className="eyebrow mb-3 group-hover:text-text-secondary transition-colors">{stat.name}</p>
                 <div className="flex items-baseline gap-2 mb-4">
                   <p className="font-data text-2xl text-text-primary">{stat.val}</p>
                   <p className="text-[11px] text-text-tertiary">{stat.sub}</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
                 <div className={`h-1.5 w-1.5 rounded-full ${stat.bg} shadow-[0_0_8px_currentColor]`} style={{ color: `var(--risk-${stat.risk})` }}></div>
                 <span className={`text-[10px] font-bold tracking-wider ${stat.color}`}>{stat.label}</span>
               </div>
             </div>
          ))}
        </div>
      </section>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-right {
          0% { left: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
