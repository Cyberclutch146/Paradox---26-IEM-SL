/**
 * Seed script for Northeast India states.
 * Run with: npx tsx src/scripts/seed-ne.ts
 */
import db from "../lib/db";

if (!db) {
  console.error("SQLite database is not available. Aborting.");
  process.exit(1);
}

// --- NE States with approximate boundary polygons (simplified bboxes for now) ---
const NE_ZONES = [
  {
    zone_id: "ne_arunachal_01",
    regionId: "arunachal",
    name: "Arunachal Pradesh",
    district: "Itanagar",
    riskLevel: "warning",
    riskScore: 0.62,
    riskRangeMin: 0.45,
    riskRangeMax: 0.80,
    confident: 1,
    driver: "High rainfall on steep slopes",
    meanSlope: 32.5,
    elevationRange: 4200,
    exposureVillages: 120,
    exposureRoadKm: 340,
    riskType: "landslide",
    description: "The Lower Subansiri and Papum Pare districts show active slope instability driven by monsoon rainfall exceeding 2500mm/yr.",
    // Approximate bbox polygon for Arunachal Pradesh
    coordinates: [[[91.5,26.6],[97.4,26.6],[97.4,29.4],[91.5,29.4],[91.5,26.6]]],
  },
  {
    zone_id: "ne_assam_01",
    regionId: "assam",
    name: "Assam Flood Plain",
    district: "Guwahati",
    riskLevel: "danger",
    riskScore: 0.78,
    riskRangeMin: 0.60,
    riskRangeMax: 0.92,
    confident: 1,
    driver: "Brahmaputra flooding & high soil saturation",
    meanSlope: 4.2,
    elevationRange: 180,
    exposureVillages: 480,
    exposureRoadKm: 820,
    riskType: "flood",
    description: "The Brahmaputra valley experiences annual flooding. High soil moisture combined with monsoon surges drives extreme flood risk across the plain.",
    coordinates: [[[89.7,24.8],[96.0,24.8],[96.0,27.9],[89.7,27.9],[89.7,24.8]]],
  },
  {
    zone_id: "ne_manipur_01",
    regionId: "manipur",
    name: "Manipur Hill Zone",
    district: "Imphal",
    riskLevel: "warning",
    riskScore: 0.58,
    riskRangeMin: 0.40,
    riskRangeMax: 0.75,
    confident: 1,
    driver: "Steep terrain with shallow soil over bedrock",
    meanSlope: 28.1,
    elevationRange: 2900,
    exposureVillages: 65,
    exposureRoadKm: 210,
    riskType: "landslide",
    description: "Manipur's hill districts (Churachandpur, Chandel, Senapati) show consistent landslide triggers during monsoon months with slopes exceeding 25°.",
    coordinates: [[[93.0,23.8],[94.8,23.8],[94.8,25.7],[93.0,25.7],[93.0,23.8]]],
  },
  {
    zone_id: "ne_meghalaya_01",
    regionId: "meghalaya",
    name: "Meghalaya Plateau Edge",
    district: "Shillong",
    riskLevel: "warning",
    riskScore: 0.61,
    riskRangeMin: 0.42,
    riskRangeMax: 0.79,
    confident: 1,
    driver: "Extreme rainfall (Cherrapunji) + steep escarpment",
    meanSlope: 35.0,
    elevationRange: 1500,
    exposureVillages: 90,
    exposureRoadKm: 180,
    riskType: "combined",
    description: "The southern escarpment of Meghalaya near Cherrapunji records among the world's highest rainfall. The plateau edge is susceptible to both flash flooding and slope failures.",
    coordinates: [[[89.8,24.9],[92.8,24.9],[92.8,26.2],[89.8,26.2],[89.8,24.9]]],
  },
  {
    zone_id: "ne_mizoram_01",
    regionId: "mizoram",
    name: "Mizoram Ridge Zone",
    district: "Aizawl",
    riskLevel: "watch",
    riskScore: 0.44,
    riskRangeMin: 0.28,
    riskRangeMax: 0.62,
    confident: 1,
    driver: "Bamboo-cycle erosion after jhum cultivation",
    meanSlope: 22.4,
    elevationRange: 2100,
    exposureVillages: 48,
    exposureRoadKm: 140,
    riskType: "landslide",
    description: "Post-jhum cultivation slopes in Mizoram have degraded root systems that increase susceptibility to shallow landslides during monsoon.",
    coordinates: [[[92.2,21.9],[93.5,21.9],[93.5,24.5],[92.2,24.5],[92.2,21.9]]],
  },
  {
    zone_id: "ne_nagaland_01",
    regionId: "nagaland",
    name: "Nagaland Highland Zone",
    district: "Kohima",
    riskLevel: "watch",
    riskScore: 0.41,
    riskRangeMin: 0.25,
    riskRangeMax: 0.60,
    confident: 1,
    driver: "Deforestation accelerating slope erosion",
    meanSlope: 26.8,
    elevationRange: 3800,
    exposureVillages: 55,
    exposureRoadKm: 175,
    riskType: "landslide",
    description: "Nagaland's Kohima and Phek districts show accelerating land degradation with increasing slope failures linked to deforestation and road-cut exposures.",
    coordinates: [[[93.2,25.1],[95.3,25.1],[95.3,27.0],[93.2,27.0],[93.2,25.1]]],
  },
  {
    zone_id: "ne_tripura_01",
    regionId: "tripura",
    name: "Tripura Valley Floor",
    district: "Agartala",
    riskLevel: "watch",
    riskScore: 0.38,
    riskRangeMin: 0.22,
    riskRangeMax: 0.55,
    confident: 1,
    driver: "Low-lying valley prone to seasonal inundation",
    meanSlope: 5.1,
    elevationRange: 350,
    exposureVillages: 140,
    exposureRoadKm: 290,
    riskType: "flood",
    description: "Tripura's river valleys (Gomati, Haora, Khowai) experience recurrent seasonal flooding. The Agartala urban zone faces significant inundation risk during peak monsoon.",
    coordinates: [[[91.1,22.9],[92.3,22.9],[92.3,24.5],[91.1,24.5],[91.1,22.9]]],
  },
];

const NE_ALERTS = [
  { id: "al_arunachal_01", severity: "warning", regionId: "arunachal", region: "Arunachal Pradesh", description: "IMD issues orange alert for heavy rainfall across Lower Subansiri and Papum Pare districts. Landslide risk elevated.", type: "landslide" },
  { id: "al_assam_01", severity: "danger", regionId: "assam", region: "Assam", description: "Brahmaputra river level at Guwahati gauge is 1.8m above danger mark. Immediate evacuation advisory for char (river island) communities.", type: "flood" },
  { id: "al_manipur_01", severity: "warning", regionId: "manipur", region: "Manipur", description: "NH-37 blocked near Mao Gate due to landslide debris. Army deployed for road clearance.", type: "landslide" },
  { id: "al_meghalaya_01", severity: "warning", regionId: "meghalaya", region: "Meghalaya", description: "24-hour rainfall at Cherrapunji reached 340mm. Flash flood watch issued for downstream Sylhet corridor.", type: "flood" },
  { id: "al_mizoram_01", severity: "watch", regionId: "mizoram", region: "Mizoram", description: "Soil moisture sensors in Lunglei district above 85% saturation. Monitor NH-54 corridor for debris flow.", type: "landslide" },
  { id: "al_nagaland_01", severity: "watch", regionId: "nagaland", region: "Nagaland", description: "Road cuts on NH-29 near Kohima showing minor slippage. Advisory issued for heavy vehicles.", type: "landslide" },
  { id: "al_tripura_01", severity: "watch", regionId: "tripura", region: "Tripura", description: "Gomati river approaching warning level at Udaipur gauge. Low-lying areas in Gomati district on standby.", type: "flood" },
];

console.log("Seeding NE India data...");

// Ensure regions exist
const insertRegion = db.prepare(`
  INSERT OR IGNORE INTO regions (id, name, subLabel, mapCenterLat, mapCenterLng, mapZoom)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const NE_REGION_META = [
  { id: "arunachal", name: "Arunachal Pradesh", lat: 28.2, lng: 94.7, zoom: 7 },
  { id: "assam", name: "Assam", lat: 26.2, lng: 92.9, zoom: 7 },
  { id: "manipur", name: "Manipur", lat: 24.8, lng: 93.9, zoom: 8 },
  { id: "meghalaya", name: "Meghalaya", lat: 25.5, lng: 91.3, zoom: 8 },
  { id: "mizoram", name: "Mizoram", lat: 23.2, lng: 92.9, zoom: 8 },
  { id: "nagaland", name: "Nagaland", lat: 26.2, lng: 94.2, zoom: 8 },
  { id: "tripura", name: "Tripura", lat: 23.8, lng: 91.3, zoom: 8 },
];

for (const r of NE_REGION_META) {
  insertRegion.run(r.id, r.name, "Northeast India", r.lat, r.lng, r.zoom);
}

// Clear old NE zones & alerts before re-inserting
db.exec(`DELETE FROM risk_zones WHERE regionId IN ('arunachal','assam','manipur','meghalaya','mizoram','nagaland','tripura')`);
db.exec(`DELETE FROM alerts WHERE regionId IN ('arunachal','assam','manipur','meghalaya','mizoram','nagaland','tripura')`);

const insertZone = db.prepare(`
  INSERT OR REPLACE INTO risk_zones (
    zone_id, regionId, name, district, riskLevel, riskScore,
    riskRangeMin, riskRangeMax, confident, driver, meanSlope,
    elevationRange, exposureVillages, exposureRoadKm, riskType,
    description, coordinates
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const z of NE_ZONES) {
  insertZone.run(
    z.zone_id, z.regionId, z.name, z.district, z.riskLevel, z.riskScore,
    z.riskRangeMin, z.riskRangeMax, z.confident, z.driver, z.meanSlope,
    z.elevationRange, z.exposureVillages, z.exposureRoadKm, z.riskType,
    z.description, JSON.stringify(z.coordinates)
  );
}

const insertAlert = db.prepare(`
  INSERT OR REPLACE INTO alerts (id, severity, regionId, region, description, timestamp, type)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
for (const a of NE_ALERTS) {
  insertAlert.run(a.id, a.severity, a.regionId, a.region, a.description, now, a.type);
}

console.log(`✓ Seeded ${NE_ZONES.length} risk zones for NE India`);
console.log(`✓ Seeded ${NE_ALERTS.length} alerts for NE India`);
console.log("Done!");
