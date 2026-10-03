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
  const [globalResults, setGlobalResults] = useState<Region[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const { region: selected, setRegion } = useRegion();
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const groups = groupRegions();
  const allRegions = useMemo(() => groups.flatMap((g) => g.regions), [groups]);

  // Debounced global search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await res.json();
        const results = data.map((d: any) => ({
          id: `global_${d.place_id}`,
          name: d.display_name.split(",")[0],
          subLabel: d.display_name,
          type: "state",
          center: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
          zoom: 11
        }));
        setGlobalResults(results);
      } catch (e) {
        console.error("Global search failed", e);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredLocal = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return allRegions.filter(
      (r) => r.name.toLowerCase().includes(query) || r.subLabel.toLowerCase().includes(query)
    );
  }, [searchQuery, allRegions]);

  const isSearching = searchQuery.trim().length > 0;
  const displayRegions = isSearching ? [...(filteredLocal || []), ...globalResults] : null;

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
    const regions = displayRegions ?? allRegions;
    if (!regions.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % regions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + regions.length) % regions.length);
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < regions.length) {
          e.preventDefault();
          selectLocation(regions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  }

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
            <span className="max-w-[120px] truncate">{selected.name}</span>
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
            "absolute mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-border-subtle bg-bg-elevated shadow-pop animate-fade-in z-[9999]",
            compact ? "left-[calc(100%+12px)] bottom-0 mb-0 origin-bottom-left" : "right-0 top-full"
          )}
          role="listbox"
        >
          <div className="p-2 border-b border-border-subtle">
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(-1);
              }}
              placeholder="Search worldwide..."
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              autoComplete="off"
            />
          </div>
          <div className="p-2">
            {isSearching ? (
              displayRegions?.length === 0 && !isSearchingGlobal ? (
                <p className="px-3 py-4 text-sm text-text-tertiary text-center">
                  No regions found.
                </p>
              ) : (
                displayRegions!.map((loc, index) => (
                  <button
                    key={loc.id}
                    onClick={() => selectLocation(loc)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      highlightedIndex === index && "bg-bg-surface-hover outline-none ring-2 ring-accent/40"
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium">{loc.name}</div>
                      <div className="text-xs text-text-tertiary truncate max-w-[200px]">{loc.subLabel}</div>
                    </div>
                  </button>
                ))
              )
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <div className="eyebrow px-3 pt-2.5 pb-1.5">{group.label}</div>
                  {group.regions.map((loc, regionIndex) => (
                    <button
                      key={loc.id}
                      onClick={() => selectLocation(loc)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-bg-surface-hover"
                    >
                      <div>
                        <div className="text-sm font-medium">{loc.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}