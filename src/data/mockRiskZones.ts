import type { RiskZoneCollection, RiskZoneFeature, RiskZoneProperties } from "./types";

function feature(
  properties: RiskZoneProperties,
  coordinates: number[][][]
): RiskZoneFeature {
  return {
    type: "Feature",
    properties,
    geometry: { type: "Polygon", coordinates },
  };
}

export const mockRiskZones: RiskZoneCollection = {
  type: "FeatureCollection",
  features: [
    feature(
      {
        zone_id: "AS_01",
        name: "Majuli Basin",
        regionId: "assam",
        riskLevel: "danger",
        riskType: "flood",
        riskScore: 0.024,
        riskRange: [0.015, 0.035],
        confident: true,
        driver: "Brahmaputra river overflow",
        exposure: { villages: 25, roadKm: 40 },
        description: "River basin experiencing significant overflow due to upstream rainfall.",
      },
      [
        [
          [92.6, 26.0],
          [93.2, 26.0],
          [93.2, 26.4],
          [92.6, 26.4],
          [92.6, 26.0],
        ],
      ]
    ),
    feature(
      {
        zone_id: "AR_01",
        name: "Tawang Slopes",
        regionId: "arunachal",
        riskLevel: "danger",
        riskType: "landslide",
        riskScore: 0.018,
        riskRange: [0.012, 0.026],
        confident: false,
        driver: "driven mostly by 3-day rainfall",
        exposure: { villages: 5, roadKm: 15 },
        description: "Steep terrain with saturated soil. Multiple landslide-prone slopes identified.",
      },
      [
        [
          [94.4, 27.9],
          [95.0, 27.9],
          [95.0, 28.5],
          [94.4, 28.5],
          [94.4, 27.9],
        ],
      ]
    ),
    feature(
      {
        zone_id: "ML_01",
        name: "Cherrapunji Plateau",
        regionId: "meghalaya",
        riskLevel: "warning",
        riskType: "combined",
        riskScore: 0.012,
        riskRange: [0.008, 0.018],
        confident: true,
        driver: "Extreme precipitation and steep terrain",
        exposure: { villages: 12, roadKm: 25 },
        description: "Heavy accumulation leading to localized flooding and slope instability.",
      },
      [
        [
          [91.0, 25.2],
          [91.6, 25.2],
          [91.6, 25.8],
          [91.0, 25.8],
          [91.0, 25.2],
        ],
      ]
    ),
    feature(
      {
        zone_id: "NL_01",
        name: "Kohima Hills",
        regionId: "nagaland",
        riskLevel: "warning",
        riskType: "landslide",
        riskScore: 0.011,
        riskRange: [0.007, 0.015],
        confident: true,
        driver: "Soil saturation",
        exposure: { villages: 8, roadKm: 18 },
        description: "Hillside settlements facing elevated risk due to continuous rains.",
      },
      [
        [
          [93.9, 25.9],
          [94.5, 25.9],
          [94.5, 26.5],
          [93.9, 26.5],
          [93.9, 25.9],
        ],
      ]
    ),
    feature(
      {
        zone_id: "MN_01",
        name: "Imphal Valley",
        regionId: "manipur",
        riskLevel: "watch",
        riskType: "flood",
        riskScore: 0.008,
        riskRange: [0.004, 0.012],
        confident: true,
        driver: "Urban drainage blockages",
        exposure: { villages: 20, roadKm: 30 },
        description: "Valley region experiencing moderate waterlogging.",
      },
      [
        [
          [93.6, 24.5],
          [94.2, 24.5],
          [94.2, 25.1],
          [93.6, 25.1],
          [93.6, 24.5],
        ],
      ]
    ),
    feature(
      {
        zone_id: "MZ_01",
        name: "Tlawng River Basin",
        regionId: "mizoram",
        riskLevel: "watch",
        riskType: "flood",
        riskScore: 0.006,
        riskRange: [0.003, 0.010],
        confident: false,
        driver: "Rising river levels",
        exposure: { villages: 15, roadKm: 20 },
        description: "River levels are rising steadily, creating risk for downstream communities.",
      },
      [
        [
          [92.6, 22.9],
          [93.2, 22.9],
          [93.2, 23.5],
          [92.6, 23.5],
          [92.6, 22.9],
        ],
      ]
    ),
    feature(
      {
        zone_id: "TR_01",
        name: "Agartala Outskirts",
        regionId: "tripura",
        riskLevel: "low",
        riskType: "flood",
        riskScore: 0.002,
        riskRange: [0.001, 0.004],
        confident: true,
        driver: "Normal seasonal rainfall",
        exposure: { villages: 10, roadKm: 22 },
        description: "Agricultural zones with minor water pooling, generally stable.",
      },
      [
        [
          [91.0, 23.5],
          [91.6, 23.5],
          [91.6, 24.1],
          [91.0, 24.1],
          [91.0, 23.5],
        ],
      ]
    ),
  ],
};