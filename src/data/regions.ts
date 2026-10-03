import type { Region } from "./types";

export const REGIONS: Region[] = [
  { id: "arunachal", name: "Arunachal Pradesh", subLabel: "State", type: "state", center: { lat: 28.2, lng: 94.7 }, zoom: 7 },
  { id: "assam", name: "Assam", subLabel: "State", type: "state", center: { lat: 26.2, lng: 92.9 }, zoom: 7 },
  { id: "meghalaya", name: "Meghalaya", subLabel: "State", type: "state", center: { lat: 25.5, lng: 91.3 }, zoom: 8 },
  { id: "nagaland", name: "Nagaland", subLabel: "State", type: "state", center: { lat: 26.2, lng: 94.2 }, zoom: 8 },
  { id: "manipur", name: "Manipur", subLabel: "State", type: "state", center: { lat: 24.8, lng: 93.9 }, zoom: 8 },
  { id: "mizoram", name: "Mizoram", subLabel: "State", type: "state", center: { lat: 23.2, lng: 92.9 }, zoom: 8 },
  { id: "tripura", name: "Tripura", subLabel: "State", type: "state", center: { lat: 23.8, lng: 91.3 }, zoom: 8 },
];

export function getDefaultRegion(): Region {
  return REGIONS[0];
}

export function findRegion(id?: string | null): Region | null {
  if (!id) return null;
  return REGIONS.find((region) => region.id === id) ?? null;
}

export function getRegionOrDefault(id?: string | null): Region {
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
    const label = region.type === "state" ? region.name : (region.subLabel ?? "Other");
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