import db from "../lib/db";
import { getMockRegions, getMockRiskZones, getMockAlerts, getMockInsights, getMockCommunity, getMockZoneReports } from "../lib/mock-store";

console.log("Seeding database...");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subLabel TEXT,
    mapCenterLat REAL,
    mapCenterLng REAL,
    mapZoom INTEGER
  );

  CREATE TABLE IF NOT EXISTS risk_zones (
    zone_id TEXT PRIMARY KEY,
    regionId TEXT NOT NULL,
    name TEXT NOT NULL,
    district TEXT,
    riskLevel TEXT NOT NULL,
    riskScore REAL NOT NULL,
    riskRangeMin REAL NOT NULL,
    riskRangeMax REAL NOT NULL,
    confident INTEGER NOT NULL,
    driver TEXT NOT NULL,
    meanSlope REAL,
    elevationRange REAL,
    exposureVillages INTEGER,
    exposureRoadKm INTEGER,
    riskType TEXT NOT NULL,
    description TEXT NOT NULL,
    coordinates TEXT NOT NULL,
    FOREIGN KEY(regionId) REFERENCES regions(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    regionId TEXT NOT NULL,
    region TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY(regionId) REFERENCES regions(id)
  );

  DROP TABLE IF EXISTS insights;

  CREATE TABLE insights (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    trend TEXT NOT NULL,
    trendValue TEXT NOT NULL,
    sparklineData TEXT NOT NULL,
    threshold REAL,
    status TEXT NOT NULL,
    regionId TEXT NOT NULL,
    FOREIGN KEY(regionId) REFERENCES regions(id)
  );
`);

// Clear existing data
db.exec("DELETE FROM risk_zones; DELETE FROM alerts; DELETE FROM insights; DELETE FROM regions;");

const regions = getMockRegions();
const insertRegion = db.prepare(`
  INSERT INTO regions (id, name, subLabel, mapCenterLat, mapCenterLng, mapZoom)
  VALUES (?, ?, ?, ?, ?, ?)
`);

regions.forEach((r) => {
  insertRegion.run(r.id, r.name, r.subLabel, r.center.lat, r.center.lng, r.zoom);
});

// Seed risk zones (using Kerala zones which cover everything)
const zones = getMockRiskZones("kerala");
const insertZone = db.prepare(`
  INSERT INTO risk_zones (
    zone_id, regionId, name, district, riskLevel, riskScore, 
    riskRangeMin, riskRangeMax, confident, driver, meanSlope, 
    elevationRange, exposureVillages, exposureRoadKm, riskType, 
    description, coordinates
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

zones.features.forEach((f) => {
  const p = f.properties;
  insertZone.run(
    p.zone_id, p.regionId, p.name, p.district || null, p.riskLevel, p.riskScore,
    p.riskRange[0], p.riskRange[1], p.confident ? 1 : 0, p.driver, p.meanSlope || null,
    p.elevationRange || null, p.exposure?.villages || null, p.exposure?.roadKm || null,
    p.riskType, p.description, JSON.stringify(f.geometry.coordinates)
  );
});

// Seed alerts
const alerts = getMockAlerts();
const insertAlert = db.prepare(`
  INSERT INTO alerts (id, severity, regionId, region, description, timestamp, type)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

alerts.forEach((a) => {
  insertAlert.run(a.id, a.severity, a.regionId, a.region, a.description, a.timestamp.toISOString(), a.type);
});

// Seed insights
const insights = getMockInsights();
const insertInsight = db.prepare(`
  INSERT INTO insights (id, title, value, unit, trend, trendValue, sparklineData, threshold, status, regionId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insights.forEach((i) => {
  insertInsight.run(
    i.id, i.title, i.value, i.unit, i.trend, i.trendValue, 
    JSON.stringify(i.sparklineData), i.threshold || null, i.status, "kerala"
  );
});

console.log("Database seeded successfully!");
