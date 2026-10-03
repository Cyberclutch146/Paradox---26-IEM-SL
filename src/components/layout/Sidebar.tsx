"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import LocationSelector from "./LocationSelector";
import { useAuth } from "@/state/auth-context";

// Icons for the nav items
const navItems = [
  { label: "Dashboard", href: "/", icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { label: "Map", href: "/map", icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )},
  { label: "Alerts", href: "/alerts", icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )},
  { label: "Community", href: "/community", icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )},
  { label: "Chat", href: "/chat", icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )},
  { label: "Reports", href: "/reports", icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
];

export default function Sidebar({ variant = "default" }: { variant?: "default" | "transparent" }) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isTransparent = variant === "transparent";

  return (
    <nav className={cn(
      "fixed md:sticky bottom-0 md:top-0 z-[9999] flex md:flex-col items-center justify-between md:h-screen w-full md:w-[76px] transition-colors duration-300",
      isTransparent
        ? "bg-transparent border-transparent"
        : "bg-[#0a0a0a]/95 backdrop-blur-2xl md:border-r border-t md:border-t-0 border-white/[0.06] shadow-[0_-4px_30px_-10px_rgba(0,0,0,0.5)] md:shadow-[4px_0_30px_-10px_rgba(0,0,0,0.4)]"
    )}>
      {/* Top / Left Section */}
      <div className="flex md:flex-col items-center gap-2 md:gap-6 p-2 md:p-5 h-full md:h-auto w-full md:w-auto overflow-x-auto md:overflow-visible no-scrollbar">
        {/* Logo */}
        <Link href="/" className="hidden md:flex items-center justify-center h-10 w-10 shrink-0 group rounded-xl hover:bg-white/[0.06] transition-all duration-200 mb-2">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full bg-[#ff7a00]/10 group-hover:bg-[#ff7a00]/20 transition-colors" />
            <svg aria-hidden="true" viewBox="0 0 32 32" className="relative h-8 w-8" fill="none">
              <path d="M4 20c4-2.5 6-7 8-11 1.5 3.4 4 5.6 8 7.6" stroke="#f0f0f0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 24c-3-1.6-5.4-3.6-7-6.4" stroke="#f0f0f0" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="13" cy="11" r="2.5" fill="#ff7a00" className="animate-pulse" />
            </svg>
          </div>
        </Link>
        
        {/* Nav Items */}
        <div className="flex md:flex-col items-center gap-1 md:gap-3 w-full md:w-auto justify-evenly md:justify-start">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200"
                aria-label={item.label}
              >
                <div className={cn(
                  "p-2.5 rounded-[14px] transition-all duration-200 flex items-center justify-center",
                  isActive
                    ? "bg-[#ff7a00] text-white shadow-[0_0_12px_rgba(255,122,0,0.3)] scale-110"
                    : "text-[#5a5a66] group-hover:bg-white/[0.06] group-hover:text-white"
                )}>
                  {item.icon}
                </div>
                {/* Tooltip for desktop */}
                <span className="absolute left-[calc(100%+8px)] px-3 py-1.5 rounded-lg bg-[#1c1c1c] text-white text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 md:group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-pop z-50 translate-x-1 group-hover:translate-x-0 border border-white/[0.08]">
                  {item.label}
                </span>
                {/* Text for mobile */}
                <span className={cn(
                  "text-[10px] mt-1 md:hidden font-medium",
                  isActive ? "text-[#ff7a00]" : "text-[#5a5a66]"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom / Right Section */}
      <div className="flex md:flex-col items-center gap-3 p-2 md:p-5">
        {!isTransparent && (
          <div className="hidden md:block relative group">
            <LocationSelector compact />
          </div>
        )}
      </div>
    </nav>
  );
}
