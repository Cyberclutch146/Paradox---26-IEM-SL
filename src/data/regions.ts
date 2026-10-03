import type { Region } from "./types";

export const REGIONS: Region[] = [
  { id: "andhra", name: "Andhra Pradesh", subLabel: "State", type: "state", center: { lat: 15.9, lng: 79.7 }, zoom: 6 },
  { id: "arunachal", name: "Arunachal Pradesh", subLabel: "State", type: "state", center: { lat: 28.2, lng: 94.7 }, zoom: 7 },
  { id: "assam", name: "Assam", subLabel: "State", type: "state", center: { lat: 26.2, lng: 92.9 }, zoom: 7 },
  { id: "bihar", name: "Bihar", subLabel: "State", type: "state", center: { lat: 25.09, lng: 85.31 }, zoom: 7 },
  { id: "chhattisgarh", name: "Chhattisgarh", subLabel: "State", type: "state", center: { lat: 21.27, lng: 81.86 }, zoom: 6 },
  { id: "delhi", name: "Delhi", subLabel: "Union Territory", type: "state", center: { lat: 28.7, lng: 77.1 }, zoom: 10 },
  { id: "goa", name: "Goa", subLabel: "State", type: "state", center: { lat: 15.29, lng: 74.12 }, zoom: 9 },
  { id: "gujarat", name: "Gujarat", subLabel: "State", type: "state", center: { lat: 22.25, lng: 71.19 }, zoom: 6 },
  { id: "haryana", name: "Haryana", subLabel: "State", type: "state", center: { lat: 29.05, lng: 76.08 }, zoom: 7 },
  { id: "himachal", name: "Himachal Pradesh", subLabel: "State", type: "state", center: { lat: 31.1, lng: 77.17 }, zoom: 7 },
  { id: "jk", name: "Jammu and Kashmir", subLabel: "Union Territory", type: "state", center: { lat: 33.77, lng: 76.57 }, zoom: 6 },
  { id: "jharkhand", name: "Jharkhand", subLabel: "State", type: "state", center: { lat: 23.61, lng: 85.27 }, zoom: 7 },
  { id: "karnataka", name: "Karnataka", subLabel: "State", type: "state", center: { lat: 15.31, lng: 75.71 }, zoom: 6 },
  { id: "kerala", name: "Kerala", subLabel: "State", type: "state", center: { lat: 10.85, lng: 76.27 }, zoom: 7 },
  { id: "mp", name: "Madhya Pradesh", subLabel: "State", type: "state", center: { lat: 22.97, lng: 78.65 }, zoom: 6 },
  { id: "maharashtra", name: "Maharashtra", subLabel: "State", type: "state", center: { lat: 19.75, lng: 75.71 }, zoom: 6 },
  { id: "manipur", name: "Manipur", subLabel: "State", type: "state", center: { lat: 24.8, lng: 93.9 }, zoom: 8 },
  { id: "meghalaya", name: "Meghalaya", subLabel: "State", type: "state", center: { lat: 25.5, lng: 91.3 }, zoom: 8 },
  { id: "mizoram", name: "Mizoram", subLabel: "State", type: "state", center: { lat: 23.2, lng: 92.9 }, zoom: 8 },
  { id: "nagaland", name: "Nagaland", subLabel: "State", type: "state", center: { lat: 26.2, lng: 94.2 }, zoom: 8 },
  { id: "odisha", name: "Odisha", subLabel: "State", type: "state", center: { lat: 20.95, lng: 85.09 }, zoom: 6 },
  { id: "punjab", name: "Punjab", subLabel: "State", type: "state", center: { lat: 31.14, lng: 75.34 }, zoom: 7 },
  { id: "rajasthan", name: "Rajasthan", subLabel: "State", type: "state", center: { lat: 27.02, lng: 74.21 }, zoom: 6 },
  { id: "sikkim", name: "Sikkim", subLabel: "State", type: "state", center: { lat: 27.53, lng: 88.51 }, zoom: 9 },
  { id: "tamilnadu", name: "Tamil Nadu", subLabel: "State", type: "state", center: { lat: 11.12, lng: 78.65 }, zoom: 6 },
  { id: "telangana", name: "Telangana", subLabel: "State", type: "state", center: { lat: 18.11, lng: 79.01 }, zoom: 6 },
  { id: "tripura", name: "Tripura", subLabel: "State", type: "state", center: { lat: 23.8, lng: 91.3 }, zoom: 8 },
  { id: "up", name: "Uttar Pradesh", subLabel: "State", type: "state", center: { lat: 26.84, lng: 80.94 }, zoom: 6 },
  { id: "uttarakhand", name: "Uttarakhand", subLabel: "State", type: "state", center: { lat: 30.06, lng: 79.01 }, zoom: 7 },
  { id: "westbengal", name: "West Bengal", subLabel: "State", type: "state", center: { lat: 22.98, lng: 87.85 }, zoom: 7 },
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