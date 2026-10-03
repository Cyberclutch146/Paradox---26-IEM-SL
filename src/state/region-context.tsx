"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Region } from "@/data/types";
import { findRegion, REGIONS } from "@/data/regions";

/** Sentinel used when no region has been selected yet. Never rendered by the dashboard. */
export const UNSET_REGION: Region = {
  id: "__unset__",
  name: "Select a Region",
  subLabel: "",
  type: "state",
  center: { lat: 26.0, lng: 92.5 }, // centre of NE India
  zoom: 7,
};

interface RegionContextValue {
  /** Currently selected region. Equal to UNSET_REGION when no region is chosen. */
  region: Region;
  /** True when the user has actively selected or detected a region. */
  isRegionSet: boolean;
  setRegion: (region: Region) => void;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({
  defaultRegionId,
  customRegion,
  children,
}: {
  defaultRegionId?: string;
  customRegion?: Region;
  children: ReactNode;
}) {
  const resolved = customRegion ?? findRegion(defaultRegionId) ?? null;
  const [region, setRegion] = useState<Region>(resolved ?? UNSET_REGION);
  const [prevDefaultRegionId, setPrevDefaultRegionId] = useState(defaultRegionId);
  const [prevCustomRegionName, setPrevCustomRegionName] = useState(customRegion?.name);

  if (prevDefaultRegionId !== defaultRegionId || prevCustomRegionName !== customRegion?.name) {
    setPrevDefaultRegionId(defaultRegionId);
    setPrevCustomRegionName(customRegion?.name);
    setRegion(customRegion ?? findRegion(defaultRegionId) ?? UNSET_REGION);
  }

  const isRegionSet = region.id !== "__unset__";
  const value = useMemo(() => ({ region, isRegionSet, setRegion }), [region, isRegionSet]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within a <RegionProvider>");
  }
  return context;
}