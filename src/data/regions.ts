import type { Region } from "./types";

/** Only the states covered by DistraAI's prediction model. */
export const REGIONS: Region[] = [
  { id: "arunachal", name: "Arunachal Pradesh", subLabel: "Northeast India", type: "state", center: { lat: 28.2, lng: 94.7 }, zoom: 7 },
  { id: "assam",     name: "Assam",             subLabel: "Northeast India", type: "state", center: { lat: 26.2, lng: 92.9 }, zoom: 7 },
  { id: "manipur",   name: "Manipur",            subLabel: "Northeast India", type: "state", center: { lat: 24.8, lng: 93.9 }, zoom: 8 },
  { id: "meghalaya", name: "Meghalaya",          subLabel: "Northeast India", type: "state", center: { lat: 25.5, lng: 91.3 }, zoom: 8 },
  { id: "mizoram",   name: "Mizoram",            subLabel: "Northeast India", type: "state", center: { lat: 23.2, lng: 92.9 }, zoom: 8 },
  { id: "nagaland",  name: "Nagaland",           subLabel: "Northeast India", type: "state", center: { lat: 26.2, lng: 94.2 }, zoom: 8 },
  { id: "tripura",   name: "Tripura",            subLabel: "Northeast India", type: "state", center: { lat: 23.8, lng: 91.3 }, zoom: 8 },
];

/**
 * Approximate bounding box for the 7 NE states.
 * Used to validate whether a GPS coordinate is within prediction range.
 */
export const NE_BOUNDS = {
  latMin: 21.9,
  latMax: 29.5,
  lngMin: 88.0,
  lngMax: 97.5,
};

export function isWithinPredictionRange(lat: number, lng: number): boolean {
  return (
    lat >= NE_BOUNDS.latMin &&
    lat <= NE_BOUNDS.latMax &&
    lng >= NE_BOUNDS.lngMin &&
    lng <= NE_BOUNDS.lngMax
  );
}

/** No default — force the user to choose a region. */
export function getDefaultRegion(): Region | null {
  return null;
}

export function findRegion(id?: string | null): Region | null {
  if (!id) return null;
  return REGIONS.find((region) => region.id === id) ?? null;
}

export function getRegionOrDefault(id?: string | null): Region | null {
  return findRegion(id) ?? getDefaultRegion();
}

const ORDER: Record<string, number> = {
  state: 0,
  district: 1,
  metro: 2,
};

export interface RegionGroup {
  label: string;
  regions: Region[];
}

export function groupRegions(): RegionGroup[] {
  const groups = new Map<string, RegionGroup>();
  for (const region of REGIONS) {
    const label = region.subLabel ?? "Other";
    let group = groups.get(label);
    if (!group) {
      group = { label, regions: [] };
      groups.set(label, group);
    }
    group.regions.push(region);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    regions: group.regions.sort(
      (a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9)
    ),
  }));
}