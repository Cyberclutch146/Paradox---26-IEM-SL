"use client";

import type { Metadata } from "next";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Footer from "@/components/layout/Footer";


const stats = [
  { value: "13", label: "Monitored Regions", icon: "map" },
  { value: "247", label: "Risk Zones Tracked", icon: "zones" },
  { value: "94.2%", label: "Model Accuracy", icon: "accuracy" },
  { value: "< 1s", label: "Alert Latency", icon: "latency" },
];

const capabilities = [
  {
    category: "Intelligence",
    title: "Neural Risk Scoring",
    description:
      "Multi-factor risk engine combining rainfall intensity, soil saturation, and slope stability into a unified 0–100 risk score. Real-time inference across all monitored zones.",
    icon: "brain",
  },
  {
    category: "Satellite",
    title: "Satellite Intelligence",
    description:
      "Multi-spectral satellite imagery processing with change detection algorithms. Automated flood extent mapping and landslide precursor identification at 10m resolution.",
    icon: "satellite",
  },
  {
    category: "Alerting",
    title: "Live Alert Network",
    description:
      "Distributed alert propagation with severity tiering. Sub-second delivery to field responders, community channels, and automated systems via WebSocket and push infrastructure.",
    icon: "alert",
  },
  {
    category: "Community",
    title: "Ground Truth Fusion",
    description:
      "Community-sourced reports fused with sensor data through consensus algorithms. Geo-tagged observations weighted by reporter reliability and cross-validation.",
    icon: "community",
  },
  {
    category: "Comms",
    title: "Secure Comms Channel",
    description:
      "End-to-end encrypted responder chat with Firebase Auth and Firestore. Role-based access, message immutability, and audit trails for operational integrity.",
    icon: "comms",
  },
  {
    category: "Mapping",
    title: "Vector Tile Mapping",
    description:
      "High-performance WebGL rendering of risk zones with dynamic styling. Layer toggling, real-time recentering, and offline-capable tile caching for field deployment.",
    icon: "mapping",
  },
  {
    category: "Architecture",
    title: "API-First Architecture",
    description:
      "Headless data layer with provider abstraction. Swap mock fixtures for live APIs without touching components. OpenAPI spec, webhooks, and GraphQL endpoint ready.",
    icon: "api",
  },
];

const pipelineSteps = [
  { step: "01", title: "Ingest", desc: "Multi-source: satellite, radar, IoT sensors, weather APIs", icon: "ingest" },
  { step: "02", title: "Process", desc: "Normalize, interpolate, feature extraction via edge compute", icon: "process" },
  { step: "03", title: "Infer", desc: "Risk model: rainfall + soil + slope = unified score", icon: "infer" },
  { step: "04", title: "Propagate", desc: "Tiered alerts → responders, communities, systems", icon: "propagate" },
  { step: "05", title: "Validate", desc: "Ground truth fusion → model calibration loop", icon: "validate" },
];

const specs = [
  { category: "Data Layer", items: ["Next.js 16 App Router", "React 19 + TypeScript 5", "Provider abstraction (mock/api)", "SQLite + better-sqlite3"] },
  { category: "Intelligence", items: ["Rule-based risk engine (0-100)", "Multi-factor: rain, soil, slope", "4-tier severity classification", "Confidence scoring"] },
  { category: "Mapping", items: ["Leaflet + React Leaflet", "OpenStreetMap tiles", "GeoJSON risk zone overlays", "WebGL-ready vector tiles"] },
  { category: "Realtime", items: ["Firebase Auth (Google)", "Cloud Firestore", "onSnapshot listeners", "Security rules (deny-by-default)"] },
  { category: "Styling", items: ["Tailwind CSS v4 (@theme)", "CSS custom properties", "Warm paper design tokens", "Calm motion utilities"] },
  { category: "Quality", items: ["Vitest (unit)", "ESLint 9 (flat)", "TypeScript strict", "TypeDoc API docs"] },
];

// Icon components
function BrainIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M16 4c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8v8l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

function SatelliteIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <rect x="4" y="8" width="24" height="16" rx="2" strokeLinecap="round" />
      <path d="M4 16h24M12 8v8M20 8v8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

function AlertIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M16 4L8 20h16L16 4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 12v8M12 16h8" strokeLinecap="round" />
    </svg>
  );
}

function CommunityIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="16" cy="16" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8v8l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16h16M16 8v16" strokeWidth={0.5} opacity={0.3} />
    </svg>
  );
}

function CommsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8v12H4v-12z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16h8M16 12v8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="6" width="4" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

function MappingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <rect x="4" y="4" width="24" height="24" rx="2" strokeLinecap="round" />
      <path d="M4 16h24M16 4v24" strokeWidth={0.5} opacity={0.3} />
      <circle cx="16" cy="16" r="6" strokeWidth={2} />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

function ApiIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <rect x="6" y="6" width="8" height="8" rx="1" strokeLinecap="round" />
      <rect x="18" y="6" width="8" height="8" rx="1" strokeLinecap="round" />
      <rect x="6" y="18" width="8" height="8" rx="1" strokeLinecap="round" />
      <rect x="18" y="18" width="8" height="8" rx="1" strokeLinecap="round" />
      <path d="M14 14h4v4h-4z" fill="currentColor" />
    </svg>
  );
}

function MapIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M4 20c4-2.5 6-7 8-11 1.5 3.4 4 5.6 8 7.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 24c-3-1.6-5.4-3.6-7-6.4" strokeLinecap="round" />
      <circle cx="13" cy="11" r="2.5" fill="currentColor" />
    </svg>
  );
}

function ZonesIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <rect x="4" y="4" width="24" height="24" rx="2" strokeLinecap="round" />
      <path d="M4 16h24M16 4v24" strokeWidth={0.5} opacity={0.3} />
      <path d="M10 10h12v12H10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccuracyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="16" cy="16" r="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8v8l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

function LatencyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="16" cy="16" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 16v4M16 22v.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IngestIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProcessIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h8M8 14h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InferIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PropagateIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path d="M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M17.57 6.43l-1.41 1.41M6.43 17.57l-1.41 1.41" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ValidateIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Illustration components
function HeroIllustration() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden="true">
      {/* Topographical lines */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1200 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="topoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b05a36" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#b8892a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#5b8049" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        {/* Contour lines */}
        <path d="M0,300 Q200,200 400,250 T800,300 T1200,350" stroke="url(#topoGradient)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0,380 Q200,320 400,340 T800,360 T1200,390" stroke="url(#topoGradient)" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M0,450 Q200,400 400,420 T800,440 T1200,460" stroke="url(#topoGradient)" strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        <path d="M0,220 Q200,180 400,200 T800,230 T1200,250" stroke="url(#topoGradient)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <path d="M0,150 Q200,120 400,140 T800,160 T1200,170" stroke="url(#topoGradient)" strokeWidth="0.7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      </svg>
      {/* Satellite orbit paths */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1200 600" preserveAspectRatio="none">
        <ellipse cx="600" cy="200" rx="400" ry="80" fill="none" stroke="#b05a36" strokeWidth="0.8" strokeDasharray="10,5" opacity="0.4" />
        <ellipse cx="600" cy="200" rx="300" ry="60" fill="none" stroke="#5b8049" strokeWidth="0.6" strokeDasharray="8,8" opacity="0.3" />
        <circle cx="200" cy="160" r="4" fill="#b05a36" opacity="0.6" />
        <circle cx="900" cy="220" r="3" fill="#5b8049" opacity="0.5" />
        <circle cx="400" cy="350" r="3" fill="#b8892a" opacity="0.4" />
        <circle cx="800" cy="420" r="2" fill="#5b8049" opacity="0.3" />
      </svg>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-bg-surface border border-border-subtle shadow-card-hover">
      {/* Mock dashboard screenshot */}
      <div className="aspect-video bg-gradient-to-br from-bg-wash via-bg-surface to-bg-primary relative overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-bg-elevated border-b border-border-subtle flex items-center px-4 gap-4">
          <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
            <MapIcon className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 max-w-md">
            <div className="h-5 w-full bg-bg-surface-hover rounded flex items-center pl-3">
              <div className="w-2 h-2 rounded-full bg-accent mr-2" />
              <span className="text-xs text-text-tertiary px-2">Search regions...</span>
            </div>
          </div>
        </div>
        {/* Map area */}
        <div className="absolute top-12 left-4 right-4 bottom-20 bg-bg-primary rounded-lg border border-border-subtle p-2">
          {/* Risk zones */}
          <div className="absolute inset-0">
            <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
              <defs>
                <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
              </defs>
              {/* Zone 1 - danger */}
              <ellipse cx="120" cy="100" rx="60" ry="40" fill="#a0281b" fillOpacity="0.25" filter="url(#blur)" />
              <ellipse cx="120" cy="100" rx="35" ry="22" fill="#a0281b" fillOpacity="0.4" />
              {/* Zone 2 - warning */}
              <ellipse cx="280" cy="140" rx="50" ry="35" fill="#c4512c" fillOpacity="0.25" filter="url(#blur)" />
              <ellipse cx="280" cy="140" rx="28" ry="18" fill="#c4512c" fillOpacity="0.35" />
              {/* Zone 3 - watch */}
              <ellipse cx="320" cy="60" rx="30" ry="25" fill="#b8892a" fillOpacity="0.2" filter="url(#blur)" />
              <ellipse cx="320" cy="60" rx="18" ry="14" fill="#b8892a" fillOpacity="0.3" />
              {/* Zone 4 - low */}
              <ellipse cx="80" cy="220" rx="45" ry="30" fill="#5b8049" fillOpacity="0.18" filter="url(#blur)" />
              <ellipse cx="80" cy="220" rx="25" ry="16" fill="#5b8049" fillOpacity="0.28" />
              {/* Contour lines */}
              <g stroke="#e2d8c6" strokeWidth="0.5" fill="none" opacity="0.3">
                <path d="M0,50 Q100,30 200,50 T400,70" />
                <path d="M0,120 Q100,100 200,110 T400,130" />
                <path d="M0,180 Q100,160 200,170 T400,190" />
                <path d="M0,250 Q100,230 200,240 T400,260" />
              </g>
            </svg>
          </div>
          {/* Layer toggle */}
          <div className="absolute top-2 right-2 flex gap-1 bg-bg-elevated/90 backdrop-blur-sm rounded p-1 border border-border-subtle">
            <button className="px-2 py-1 rounded text-[10px] font-medium bg-accent text-text-on-accent">Flood</button>
            <button className="px-2 py-1 rounded text-[10px] font-medium text-text-tertiary hover:text-text-primary">Landslide</button>
            <button className="px-2 py-1 rounded text-[10px] font-medium text-text-tertiary hover:text-text-primary">Combined</button>
          </div>
        </div>
        {/* Sidebar preview */}
        <div className="absolute bottom-4 left-4 right-4 h-14 bg-bg-elevated border border-border-subtle rounded-lg flex items-center justify-around px-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
            <span className="text-xs font-data">3 Active Zones</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-risk-high" />
            <span className="text-xs font-data">2 Critical Alerts</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-risk-watch" />
            <span className="text-xs font-data">5 Watch Zones</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatIcon({ icon }: { icon: string }) {
  const icons = {
    map: <MapIcon className="w-5 h-5" />,
    zones: <ZonesIcon className="w-5 h-5" />,
    accuracy: <AccuracyIcon className="w-5 h-5" />,
    latency: <LatencyIcon className="w-5 h-5" />,
  };
  return (
    <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent mb-3 animate-scale-in">
      {icons[icon as keyof typeof icons] || <MapIcon className="w-5 h-5" />}
    </div>
  );
}

function CapabilityIcon({ icon }: { icon: string }) {
  const icons = {
    brain: <BrainIcon className="w-5 h-5" />,
    satellite: <SatelliteIcon className="w-5 h-5" />,
    alert: <AlertIcon className="w-5 h-5" />,
    community: <CommunityIcon className="w-5 h-5" />,
    comms: <CommsIcon className="w-5 h-5" />,
    mapping: <MappingIcon className="w-5 h-5" />,
    api: <ApiIcon className="w-5 h-5" />,
  };
  return (
    <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent mb-3 group-hover:bg-accent group-hover:text-text-on-accent transition-all duration-300">
      {icons[icon as keyof typeof icons] || <BrainIcon className="w-5 h-5" />}
    </div>
  );
}

function PipelineIcon({ icon }: { icon: string }) {
  const icons = {
    ingest: <IngestIcon />,
    process: <ProcessIcon />,
    infer: <InferIcon />,
    propagate: <PropagateIcon />,
    validate: <ValidateIcon />,
  };
  return (
    <div className="w-5 h-5 text-accent">
      {icons[icon as keyof typeof icons] || <IngestIcon />}
    </div>
  );
}

// Scroll animation hook
function useScrollAnimation(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Staggered animation wrapper
function StaggeredChildren({ children, delay = 80, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isVisible } = useScrollAnimation();
  const childrenArray = React.Children.toArray(children);

  return (
    <div ref={ref} className={className}>
      {childrenArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;
        const childProps = child.props as Record<string, unknown>;
        const newProps: Record<string, unknown> = {
          style: {
            ...((childProps.style as React.CSSProperties) || {}),
            animationDelay: isVisible ? `${index * delay}ms` : "0ms",
            opacity: isVisible ? 1 : 0,
          },
          className: `${(childProps.className as string) || ""} animate-slide-up`.trim(),
        };
        return React.cloneElement(child, newProps);
      })}
    </div>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 overflow-hidden">
        <HeroIllustration />
        {/* Parallax grid pattern */}
        <div
          className="absolute inset-0 grid-pattern opacity-20"
          aria-hidden="true"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        />
        <div className="relative mx-auto max-w-4xl w-full text-center">
          <p className="eyebrow animate-fade-in delay-1" style={{ animationDelay: "0ms" }}>Disaster Intelligence Platform</p>
          <h1 className="serif-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight animate-slide-up delay-2" style={{ animationDelay: "100ms" }}>
            Risk intelligence
            <br />
            <span className="italic text-accent">before the crisis</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mt-6 animate-slide-up delay-3" style={{ animationDelay: "200ms" }}>
            Real-time flood and landslide risk assessment powered by multi-spectral satellite
            imagery, environmental sensor fusion, and rule-based risk scoring. Operational intelligence
            for disaster response teams.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-slide-up delay-4" style={{ animationDelay: "300ms" }}>
            <Link href="/dashboard" className="btn-primary w-full sm:w-auto px-8 py-3 text-base shadow-card-hover">
              Launch Dashboard
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full sm:w-auto px-8 py-3 text-base"
            >
              View Source
            </a>
          </div>
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ animationDelay: "800ms" }}>
            <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-bg-wash border-y border-border-subtle">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="eyebrow mb-3 text-accent">Platform Preview</p>
              <h2 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight mb-4">
                See the intelligence in action
              </h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                The dashboard combines live risk mapping, environmental monitoring, severity-tiered alerts,
                and community ground reports — all filtered by region and updated in real time.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="btn-soft px-3 py-1.5 text-sm">Interactive risk map</span>
                <span className="btn-soft px-3 py-1.5 text-sm">Live alert feed</span>
                <span className="btn-soft px-3 py-1.5 text-sm">Community reports</span>
                <span className="btn-soft px-3 py-1.5 text-sm">Environmental sensors</span>
              </div>
            </div>
            <div className="relative">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-16 bg-bg-primary">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="eyebrow mb-3">Key Metrics</p>
            <h2 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight">
              Measuring what matters
            </h2>
          </div>
          <StaggeredChildren delay={80} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card-tint p-6 text-center group hover:border-accent/50 transition-colors duration-300">
                <StatIcon icon={stat.icon} />
                <div className="font-data text-3xl sm:text-4xl font-bold text-text-primary mb-1" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {stat.value}
                </div>
                <div className="eyebrow-xs text-text-tertiary">{stat.label}</div>
              </div>
            ))}
          </StaggeredChildren>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-center mb-12">
            <p className="eyebrow mb-3">Core Capabilities</p>
            <h2 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight mb-3">
              Modular systems for operational deployment
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Each subsystem operates independently while feeding the unified intelligence layer.
            </p>
          </div>

          <StaggeredChildren delay={60} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => (
              <article
                key={cap.title}
                className="card p-5 group hover:shadow-card-hover hover:border-accent/30 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <CapabilityIcon icon={cap.icon} />
                  <div className="flex-1 min-w-0">
                    <p className="eyebrow-xs text-accent mb-2">{cap.category}</p>
                    <h3 className="serif-display text-xl mb-3">{cap.title}</h3>
                    <p className="text-text-secondary leading-relaxed">{cap.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </StaggeredChildren>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-bg-wash border-y border-border-subtle">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-center mb-12">
            <p className="eyebrow mb-3">Data Pipeline</p>
            <h2 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight mb-3">
              Ingest → Process → Infer → Propagate → Validate
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              End-to-end data flow from raw sensor ingestion to calibrated risk scores.
              Each stage is independently scalable and monitored.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-[44px] left-1/2 w-0.5 h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent" aria-hidden="true" />
            
            <StaggeredChildren delay={80} className="space-y-8">
              {pipelineSteps.map((step, i) => (
                <div
                  key={step.step}
                  className="relative flex lg:flex-row lg:items-center gap-6 p-5 card group hover:shadow-card-hover transition-shadow duration-300"
                >
                  {/* Step number + icon */}
                  <div className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-lg card-tint flex items-center justify-center text-accent font-display text-lg font-bold z-10 relative">
                    <PipelineIcon icon={step.icon} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 lg:w-1/2">
                    <h3 className="serif-display text-lg mb-1">{step.title}</h3>
                    <p className="text-text-secondary">{step.desc}</p>
                  </div>
                  
                  {/* Connector dot */}
                  <div className="hidden lg:block w-3 h-3 rounded-full bg-accent absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-10 group-hover:scale-125 transition-transform duration-300" />
                </div>
              ))}
            </StaggeredChildren>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-center mb-12">
            <p className="eyebrow mb-3">Technical Specifications</p>
            <h2 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight">Architecture Details</h2>
          </div>

          <StaggeredChildren delay={60} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {specs.map((spec) => (
              <div key={spec.category} className="card p-5 group hover:border-accent/30 transition-colors duration-300">
                <p className="eyebrow-xs text-accent mb-4">{spec.category}</p>
                <ul className="space-y-2.5">
                  {spec.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-text-secondary group">
                      <span className="w-1.5 h-1.5 rounded-full bg-border-strong group-hover:bg-accent group-hover:scale-125 transition-all duration-200" />
                      <span className="font-data text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </StaggeredChildren>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-bg-primary">
        <div className="mx-auto max-w-3xl text-center">
          <div className="card-tint p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden="true" />
            <div className="relative z-10">
              <h2 className="serif-display text-2xl sm:text-3xl mb-4">Ready to Deploy</h2>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto">
                Clone the repository, configure Firebase for live chat, and connect your data sources.
                The platform is production-ready with a clean provider seam for backend integration.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary px-6 py-3"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  View Source
                </a>
                <Link href="/dashboard" className="btn-ghost px-6 py-3">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch Platform
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}