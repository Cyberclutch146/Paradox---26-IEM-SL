"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

// Minimal logo icon for the nav
function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#ff7a00" />
      <path d="M12 12H20V20H12V12Z" fill="#2d2d2d" />
      <path d="M16 8V12M16 20V24M8 16H12M20 16H24" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowUpRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
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
    <div className="min-h-screen bg-[#f4f4f4] text-[#111827] selection:bg-[#ff7a00] selection:text-white">
      {/* Unified Hero Section */}
      <section className="relative min-h-[100vh] flex flex-col overflow-hidden">
        {/* Background image covering the entire hero */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 w-full h-full z-0"
          style={{
            backgroundImage: "url('/new_hero_bg.png')",
            // Scale up slightly to push the Gemini watermark in the corner outside the visible bounds
            transform: `scale(${1.05 + scrollY * 0.0002})`
          }}
        />

        {/* Subtle dark overlay for text contrast instead of the white blur */}
        <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent z-0 pointer-events-none" />

        {/* Navigation */}
        <nav className="mx-auto mt-6 max-w-[1200px] w-[95%] bg-[#313131]/90 backdrop-blur-md rounded-2xl flex items-center justify-between px-6 py-4 shadow-xl z-50 relative">
          <div className="flex items-center gap-3">
            <LogoIcon />
            <span className="font-bold text-xl tracking-tight text-white">DistraAI</span>
          </div>

          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link href="/login" className="text-white hover:text-gray-300 transition-colors">Sign in</Link>
            <Link href="/dashboard" className="bg-[#ff7a00] hover:bg-[#e06b00] text-white px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg">
              Launch App
            </Link>
          </div>
        </nav>

        {/* Content Container (Text on left, buttons on right, downward position preserved) */}
        <div className="flex-1 flex flex-col justify-center relative z-10 px-6 pt-16 pb-24 max-w-[1200px] w-[95%] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
            {/* Left side: Text */}
            <div className="max-w-2xl text-left">
              <p className="text-[#ff7a00] text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase mb-4 drop-shadow-md">
                Smart Disaster Infrastructure
              </p>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] leading-[1.05] text-white drop-shadow-lg mb-6">
                Your data already knows the risk.<br />
                <span className="text-[#ff7a00] drop-shadow-lg">DistraAI makes it respond.</span>
              </h1>

              <p className="text-gray-200 text-lg sm:text-xl leading-relaxed font-medium drop-shadow-md">
                Index your satellite feeds and sensors, deploy grounded alerts, uncover risk zones, and add community support without rebuilding your stack.
              </p>
            </div>

            {/* Right side: Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 shrink-0 w-full lg:w-auto mt-6 lg:mt-0">
              <Link href="/dashboard" className="bg-[#ff7a00] hover:bg-[#e06b00] text-white px-7 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-base border border-transparent whitespace-nowrap">
                View Live Map <ArrowUpRightIcon />
              </Link>
            </div>
          </div>
        </div>


      </section>

      {/* Feature Split Cards */}
      <section className="mx-auto max-w-[1200px] w-[95%] py-20 relative z-10">
        <div className="grid md:grid-cols-2 gap-8">
          {/* White Card */}
          <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-gray-100 flex items-center min-h-[400px]">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111827] leading-none">
              Disaster<br />response<br />fails when<br />critical data<br />is scattered.
            </h2>
          </div>
          {/* Dark Card */}
          <div className="bg-[#1a1a1a] rounded-[2rem] p-12 text-white flex flex-col justify-between min-h-[400px] relative overflow-hidden">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none mb-12">
              A unified<br />operational<br />picture for<br />hazard<br />environments.
            </h2>
            <p className="text-sm text-gray-400 max-w-sm font-medium">
              DistraAI converges real-time sensor telemetrics, community field reports, and environmental risk models into a single, decisive operational dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Four Connected Steps */}
      <section className="mx-auto max-w-[1200px] w-[95%] py-24 relative z-10">
        <div className="max-w-2xl mb-16">
          <p className="text-[#ff7a00] text-xs font-extrabold tracking-[0.2em] uppercase mb-4">
            Intelligence pipeline
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.02em] leading-tight text-[#111827]">
            Build a response system<br />
            <span className="text-[#ff7a00]">in four connected<br />steps.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 01 */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm relative">
            <span className="absolute top-8 right-8 text-xl font-medium text-gray-300">01</span>
            <h3 className="text-2xl font-bold tracking-tight text-[#111827] mb-4 mt-8">Aggregate<br />environmental telemetry.</h3>
            <p className="text-gray-500 font-medium text-sm">Ingest rainfall, soil moisture, and slope stability indices directly into a real-time localized map.</p>
          </div>
          {/* Card 02 */}
          <div className="bg-[#f8f9fa] rounded-3xl p-10 border border-gray-100 shadow-sm relative">
            <span className="absolute top-8 right-8 text-xl font-medium text-gray-300">02</span>
            <h3 className="text-2xl font-bold tracking-tight text-[#111827] mb-4 mt-8">Define automated<br />risk thresholds.</h3>
            <p className="text-gray-500 font-medium text-sm">Calibrate exact threshold triggers for landslides and floods, automating alert pipelines without manual oversight.</p>
          </div>
          {/* Card 03 */}
          <div className="bg-[#f8f9fa] rounded-3xl p-10 border border-gray-100 shadow-sm relative">
            <span className="absolute top-8 right-8 text-xl font-medium text-gray-300">03</span>
            <h3 className="text-2xl font-bold tracking-tight text-[#111827] mb-4 mt-8">Deploy immediate<br />operational views.</h3>
            <p className="text-gray-500 font-medium text-sm">Launch secure, highly-available dashboards for incident commanders without writing a line of frontend code.</p>
          </div>
          {/* Card 04 */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm relative">
            <span className="absolute top-8 right-8 text-xl font-medium text-gray-300">04</span>
            <h3 className="text-2xl font-bold tracking-tight text-[#111827] mb-4 mt-8">Incorporate live<br />field reporting.</h3>
            <p className="text-gray-500 font-medium text-sm">Bridge the gap between algorithmic models and reality with real-time community chat and on-the-ground observations.</p>
          </div>
        </div>
      </section>

      {/* Massive Orange CTA */}
      <section className="mx-auto max-w-[1200px] w-[95%] py-20 relative z-10">
        <div className="bg-[#ff7a00] rounded-[2rem] p-12 sm:p-20 text-center flex flex-col items-center justify-center shadow-xl">
          <p className="text-white/90 text-xs font-extrabold tracking-[0.2em] uppercase mb-6">
            Accelerate Crisis Mitigation
          </p>
          <h2 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[0.9] text-[#111827] max-w-4xl mb-12">
            Deploy proactive<br />intelligence before<br />disaster strikes.
          </h2>
          <Link href="/dashboard" className="bg-[#111827] hover:bg-black text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl">
            Launch the Intelligence Dashboard <ArrowUpRightIcon />
          </Link>
        </div>
      </section>

      {/* Massive Footer */}
      <footer className="bg-[#111827] pt-20 pb-8 px-8 sm:px-16 mt-12 relative z-10 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-800 pb-16 mb-12 relative z-10 mx-auto max-w-[1200px]">
          <div className="flex items-center gap-3 mb-10 md:mb-0">
            <LogoIcon />
            <span className="font-bold text-xl tracking-tight text-white">DistraAI</span>
          </div>
        </div>

        {/* Massive Watermark Text */}
        <div className="w-full flex justify-center overflow-hidden pointer-events-none opacity-[0.05] relative z-0">
          <h1 className="text-[15vw] font-black tracking-tighter text-white leading-none whitespace-nowrap select-none">
            DISTRA AI
          </h1>
        </div>

        <div className="flex justify-between items-center text-xs font-medium text-gray-600 mt-8 mx-auto max-w-[1200px] relative z-10">
          <p>© 2026 DistraAI Inc.</p>
        </div>
      </footer>

      {/* Subtle grid pattern overlay for the entire background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}