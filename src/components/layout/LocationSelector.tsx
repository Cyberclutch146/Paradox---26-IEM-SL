"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { groupRegions } from "@/data/regions";
import { useRegion } from "@/state/region-context";
import { cn } from "@/lib/utils";
import type { Region } from "@/data/types";

export default function LocationSelector({ compact = false }: { compact?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { region: selected, setRegion } = useRegion();
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const groups = groupRegions();
  const allRegions = useMemo(() => groups.flatMap((g) => g.regions), [groups]);

  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return allRegions;
    const q = searchQuery.toLowerCase();
    return allRegions.filter((r) => r.name.toLowerCase().includes(q));
  }, [searchQuery, allRegions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  function selectLocation(loc: Region) {
    setRegion(loc);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
    router.replace(`${pathname}?region=${loc.id}&name=${encodeURIComponent(loc.name)}&lat=${loc.center.lat}&lng=${loc.center.lng}`, { scroll: false });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!filteredRegions.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredRegions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredRegions.length) % filteredRegions.length);
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < filteredRegions.length) {
          e.preventDefault();
          selectLocation(filteredRegions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  }

  const displayLabel = selected ? selected.name : "Select Region";

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "hidden sm:flex items-center transition-colors",
          compact
            ? "p-2.5 rounded-[14px] text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary group"
            : "gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-bg-surface-hover"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg
          aria-hidden="true"
          className={cn(compact ? "h-[22px] w-[22px]" : "h-4 w-4 text-accent shrink-0")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={compact ? 1.5 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {!compact && (
          <>
            <span className={cn("max-w-[140px] truncate", !selected && "text-text-tertiary italic")}>
              {displayLabel}
            </span>
            <svg
              aria-hidden="true"
              className={`h-3.5 w-3.5 text-text-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-xl border border-border-subtle bg-bg-elevated shadow-pop animate-fade-in z-[9999]",
            compact ? "left-[calc(100%+12px)] bottom-0 mb-0 origin-bottom-left" : "right-0 top-full"
          )}
          role="listbox"
        >
          <div className="p-2 border-b border-border-subtle">
            <p className="eyebrow eyebrow-xs px-2 py-1 text-accent">Northeast India · Prediction Zones</p>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(-1);
              }}
              placeholder="Filter states..."
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              autoComplete="off"
            />
          </div>
          <div className="p-2">
            {filteredRegions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-text-tertiary text-center">No states found.</p>
            ) : (
              filteredRegions.map((loc, index) => (
                <button
                  key={loc.id}
                  onClick={() => selectLocation(loc)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    selected?.id === loc.id
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-bg-surface-hover text-text-primary",
                    highlightedIndex === index && "bg-bg-surface-hover outline-none ring-2 ring-accent/40"
                  )}
                >
                  <div>
                    <div className="text-sm font-medium">{loc.name}</div>
                  </div>
                  {selected?.id === loc.id && (
                    <svg className="w-3.5 h-3.5 ml-auto text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}