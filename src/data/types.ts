export type RiskLevel = "low" | "watch" | "warning" | "danger";
export type RiskKind = "flood" | "landslide" | "combined";
export type TrendDirection = "up" | "down" | "stable";

export interface Alert {
  id: string;
  severity: RiskLevel;
  regionId: string;
  region: string;
  description: string;
  timestamp: Date;
  type: RiskKind;
}

export interface RiskZoneProperties {
  zone_id: string;
  name: string;
  district?: string;
  regionId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskRange: [number, number];
  confident: boolean;
  driver: string;
  meanSlope?: number;
  elevationRange?: number;
  exposure?: { villages: number; roadKm: number };
  riskType: RiskKind;
  description: string;
}

export interface RiskZoneFeature {
  type: "Feature";
  properties: RiskZoneProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface RiskZoneCollection {
  type: "FeatureCollection";
  features: RiskZoneFeature[];
}

export interface InsightData {
  id: string;
  title: string;
  value: string;
  unit: string;
  trend: TrendDirection;
  trendValue: string;
  sparklineData: number[];
  threshold?: number;
  status: "normal" | "warning" | "danger";
}

export interface CommunityMessage {
  id: string;
  username: string;
  initials: string;
  avatarColor: string;
  message: string;
  timestamp: Date;
  location: string;
  type: "report" | "update" | "question";
}

export type RegionType = "state" | "district" | "metro";

export interface Region {
  id: string;
  name: string;
  subLabel: string;
  parent?: string;
  type: RegionType;
  center: { lat: number; lng: number };
  zoom: number;
}

export interface RiskFactor {
  label: string;
  value: string;
  level: RiskLevel;
}

export interface RiskSummary {
  regionId: string;
  regionName: string;
  score: number;
  level: RiskLevel;
  trend: TrendDirection;
  trendDelta: string;
  confidence: number;
  updatedAt: Date;
  factors: RiskFactor[];
}

export interface ZoneReport {
  id: string; // zone_id
  name: string;
  regionId: string;
  riskLevel: RiskLevel;
  riskType: RiskKind;
  riskScore: number;
  description: string;
}

export interface OrchestratorLocation {
  latitude: number;
  longitude: number;
}

export interface OrchestratorWeather {
  rain_today_mm: number;
  rain_72h_incl_today_mm: number;
  doy_sin?: number;
  doy_cos?: number;
  rain_ante_7d_mm?: number;
  rain_ante_30d_mm?: number;
}

export interface OrchestratorSoil {
  sm_0_7cm_ante: number;
  sm_0_7cm_change_3d: number;
}

export interface OrchestratorRequest {
  location: OrchestratorLocation;
  weather: OrchestratorWeather;
  soil: OrchestratorSoil;
  regionId?: string;
}

export interface OrchestratorGISEvidence {
  mean_slope?: number;
  mean_slope_deg?: number;
  elevation_range?: number;
  elevation_range_m?: number;
  high_risk_parcels?: number;
  moderate_risk_parcels?: number;
  parcel_ai_confidence?: string;
}

export interface OrchestratorModelOutput {
  risk_score: number;
  risk_level: string;
  model?: string;
}

export interface OrchestratorEvidence {
  weather?: Record<string, number>;
  soil?: Record<string, number>;
  gis?: OrchestratorGISEvidence;
  model_output?: OrchestratorModelOutput;
}

export interface OrchestratorResult {
  risk_level: string;
  risk_score: number;
  rationale: string;
  confidence?: string;
  recommended_actions?: string[];
  evidence?: OrchestratorEvidence;
  limitations?: string[];
}

export interface OrchestratorResponse {
  success: boolean;
  isFallback?: boolean;
  fallbackReason?: string;
  result: OrchestratorResult;
  timestamp: string;
}