"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { useRegion } from "@/state/region-context";
import { getCommunity } from "@/lib/data-client";
import { useData } from "@/lib/use-data";
import { MessageCard, CommunitySkeleton } from "@/components/community/CommunityPreview";

const filters = ["all", "report", "update", "question"] as const;
type FilterId = (typeof filters)[number];

const filterLabels: Record<FilterId, string> = {
  all: "All",
  report: "Reports",
  update: "Updates",
  question: "Questions",
};

const filterAriaLabels: Record<FilterId, string> = {
  all: "All messages",
  report: "Report messages",
  update: "Update messages",
  question: "Question messages",
};

export default function CommunityView() {
  const { region } = useRegion();
  const { data, loading, error } = useData(() => getCommunity(), []);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const counts = (data ?? []).reduce(
    (acc, message) => {
      acc[message.type] = (acc[message.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const visibleMessages = data
    ? activeFilter === "all"
      ? data
      : data.filter((m) => m.type === activeFilter)
    : [];

  const visibleCount = activeFilter === "all" ? data?.length ?? 0 : counts[activeFilter] ?? 0;

  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent =
        `${visibleCount} ${activeFilter === "all" ? "messages" : filterLabels[activeFilter].toLowerCase()} shown`;
    }
  }, [activeFilter, visibleCount, data?.length]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        nextIndex = (index + 1) % filters.length;
        break;
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = (index - 1 + filters.length) % filters.length;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = filters.length - 1;
        break;
      default:
        return;
    }
    buttonRefs.current[nextIndex]?.focus();
    setActiveFilter(filters[nextIndex]);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">

      <main className="flex-1">
        <section className="px-4 sm:px-6 lg:px-8 py-6 mx-auto max-w-[1600px]">
          <div className="max-w-2xl mb-6">
            <p className="eyebrow mb-1">Ground truth</p>
            <h1 className="serif-display text-3xl sm:text-4xl font-medium tracking-tight">
              Community reports
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Ground-level reports shared by local observers. Messages are sample data.
            </p>
          </div>

          <div className="card-static p-5 sm:p-6">
            {(data ?? []).length > 0 && (
              <>
                <div
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle mb-2"
                  role="tablist"
                  aria-label="Filter community messages"
                >
                  {filters.map((filter, index) => {
                    const label = filterLabels[filter];
                    const isActive = activeFilter === filter;
                    return (
                      <button
                        key={filter}
                        ref={(el) => {
                          buttonRefs.current[index] = el;
                        }}
                        role="tab"
                        id={`community-tab-${filter}`}
                        aria-selected={isActive}
                        aria-controls={`community-panel-${filter}`}
                        aria-label={filterAriaLabels[filter]}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setActiveFilter(filter)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`
                          font-data text-sm capitalize border-b-2 -mb-3 py-3 pb-3.5 transition-colors
                          ${isActive
                            ? "border-accent text-text-primary"
                            : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong"}
                        `}
                      >
                        {label}
                        <span className="ml-1.5 text-text-tertiary">
                          {filter === "all" ? data?.length : counts[filter] ?? 0}
                        </span>
                      </button>
                    );
                  })}
                  <span className="ml-auto font-data text-[11px] text-text-tertiary">
                    Region: {region.name}
                  </span>
                </div>

                <div
                  ref={liveRegionRef}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                />

                {error ? (
                  <p className="text-sm text-risk-high py-4">Failed to load community reports.</p>
                ) : loading || !data ? (
                  <CommunitySkeleton />
                ) : visibleMessages.length === 0 ? (
                  <div role="tabpanel" id={`community-panel-${activeFilter}`} aria-labelledby={`community-tab-${activeFilter}`}>
                    <p className="text-sm text-text-secondary py-6 text-center">
                      No {activeFilter === "all" ? "" : `${activeFilter} `}community reports yet.
                    </p>
                  </div>
                ) : (
                  <div
                    role="tabpanel"
                    id={`community-panel-${activeFilter}`}
                    aria-labelledby={`community-tab-${activeFilter}`}
                    className="divide-y divide-border-subtle"
                  >
                    {visibleMessages.map((message) => (
                      <MessageCard key={message.id} message={message} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </div>
  );
}