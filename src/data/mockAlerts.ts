import type { Alert } from "./types";

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000);

export const mockAlerts: Alert[] = [
  {
    id: "ALT-001",
    severity: "danger",
    regionId: "assam",
    region: "Assam",
    description: "Brahmaputra river level exceeding danger mark. Imminent flood risk in Majuli district.",
    timestamp: minsAgo(12),
    type: "flood",
  },
  {
    id: "ALT-002",
    severity: "danger",
    regionId: "arunachal",
    region: "Arunachal Pradesh",
    description: "Critical soil moisture and terrain displacement detected in Tawang. High landslide probability.",
    timestamp: minsAgo(34),
    type: "landslide",
  },
  {
    id: "ALT-003",
    severity: "warning",
    regionId: "meghalaya",
    region: "Meghalaya",
    description: "Unprecedented rainfall in Cherrapunji (48h accumulation: 320mm). Elevated risk of flash floods.",
    timestamp: hoursAgo(1),
    type: "combined",
  },
  {
    id: "ALT-004",
    severity: "warning",
    regionId: "nagaland",
    region: "Nagaland",
    description: "Slope instability detected near Kohima. Road blockages likely on major highways.",
    timestamp: hoursAgo(2),
    type: "landslide",
  },
  {
    id: "ALT-005",
    severity: "watch",
    regionId: "manipur",
    region: "Manipur",
    description: "Localized waterlogging reported in Imphal valley due to continuous moderate rain.",
    timestamp: hoursAgo(3),
    type: "flood",
  },
  {
    id: "ALT-006",
    severity: "watch",
    regionId: "mizoram",
    region: "Mizoram",
    description: "Rising river levels in Tlawng river basin. Early warning activated.",
    timestamp: hoursAgo(4),
    type: "flood",
  },
  {
    id: "ALT-007",
    severity: "low",
    regionId: "tripura",
    region: "Tripura",
    description: "Minor waterlogging in agricultural zones. Rivers within safe limits.",
    timestamp: hoursAgo(6),
    type: "flood",
  },
];