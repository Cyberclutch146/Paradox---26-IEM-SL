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
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const groups = groupRegions();
  const allRegions = useMemo(() => groups.flatMap((g) => g.regions), [groups]);

  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return allRegions.filter(
      (r) => r.name.toLowerCase().includes(query) || r.subLabel.toLowerCase().includes(query)
    );
  }, [searchQuery, allRegions]);

  const isSearching = searchQuery.trim().length > 0;
  const displayRegions = isSearching ? filteredRegions : null;

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

  function selectLocation(id: string) {
    const next = allRegions.find((r) => r.id === id);
    if (!next) return;
    setRegion(next);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
    router.replace(`${pathname}?region=${next.id}`, { scroll: false });
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
          selectLocation(regions[highlightedIndex].id);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(regions.length - 1);
        break;
    }
  }

  function handleOptionKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number, region: Region) {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        selectLocation(region.id);
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
        aria-label={`Select location, current: ${selected.name}`}
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
        {compact && (
          <span className="absolute left-[calc(100%+8px)] px-2.5 py-1.5 rounded-md bg-text-primary text-bg-primary text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 md:group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-md z-50 translate-x-1 group-hover:translate-x-0">
            {selected.name}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-border-subtle bg-bg-elevated shadow-pop animate-fade-in z-50",
            compact ? "left-[calc(100%+12px)] bottom-0 mb-0 origin-bottom-left" : "right-0 top-full"
          )}
          role="listbox"
          aria-label="Location options"
        >
          <div className="p-2 border-b border-border-subtle">
            <label htmlFor="location-search" className="sr-only">
              Search regions
            </label>
            <input
              ref={searchInputRef}
              id="location-search"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setIsOpen(false);
                  setSearchQuery("");
                  setHighlightedIndex(-1);
                }
              }}
              placeholder="Search regions..."
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              autoComplete="off"
            />
          </div>
          <div className="p-2">
            {isSearching ? (
              displayRegions?.length === 0 ? (
                <p className="px-3 py-4 text-sm text-text-tertiary text-center">
                  No regions match {`"${searchQuery}"`}
                </p>
              ) : (
                displayRegions!.map((loc, index) => (
                  <button
                    key={loc.id}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    role="option"
                    aria-selected={selected.id === loc.id}
                    aria-setsize={displayRegions!.length}
                    aria-posinset={index + 1}
                    onClick={() => selectLocation(loc.id)}
                    onKeyDown={(e) => handleOptionKeyDown(e, index, loc)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selected.id === loc.id
                        ? "bg-accent-subtle text-accent"
                        : "text-text-primary hover:bg-bg-surface-hover",
                      highlightedIndex === index && "bg-bg-surface-hover outline-none ring-2 ring-accent/40"
                    )}
                  >
                    <svg
                      aria-hidden="true"
                      className={cn("h-4 w-4 shrink-0", selected.id === loc.id ? "text-accent" : "text-text-tertiary")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <div>
                      <div className="text-sm font-medium">{loc.name}</div>
                      <div className="text-xs text-text-tertiary">{loc.subLabel}</div>
                    </div>
                    {selected.id === loc.id && (
                      <svg
                        aria-hidden="true"
                        className="ml-auto h-4 w-4 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
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
                      ref={(el) => {
                        optionRefs.current[regionIndex] = el;
                      }}
                      role="option"
                      aria-selected={selected.id === loc.id}
                      onClick={() => selectLocation(loc.id)}
                      onKeyDown={(e) => handleOptionKeyDown(e, regionIndex, loc)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        selected.id === loc.id
                          ? "bg-accent-subtle text-accent"
                          : "text-text-primary hover:bg-bg-surface-hover"
                      )}
                    >
                      <svg
                        aria-hidden="true"
                        className={cn("h-4 w-4 shrink-0", selected.id === loc.id ? "text-accent" : "text-text-tertiary")}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                      <div>
                        <div className="text-sm font-medium">{loc.name}</div>
                        <div className="text-xs text-text-tertiary">{loc.subLabel}</div>
                      </div>
                      {selected.id === loc.id && (
                        <svg
                          aria-hidden="true"
                          className="ml-auto h-4 w-4 text-accent"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
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