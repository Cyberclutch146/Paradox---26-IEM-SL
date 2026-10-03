import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/predict/route";

describe("POST /api/predict", () => {
  it("rejects request with missing or invalid location coordinates (HTTP 400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify({
        weather: {
          rain_today_mm: 50,
          rain_72h_incl_today_mm: 120,
        },
        soil: {
          sm_0_7cm_ante: 0.35,
          sm_0_7cm_change_3d: 0.05,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid location");
  });

  it("rejects request with incomplete meteorological values (HTTP 400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify({
        location: {
          latitude: 27.586,
          longitude: 91.866,
        },
        weather: {
          rain_today_mm: 50,
          // missing rain_72h_incl_today_mm
        },
        soil: {
          sm_0_7cm_ante: 0.35,
          sm_0_7cm_change_3d: 0.05,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid weather");
  });

  it("rejects request with incomplete soil parameters (HTTP 400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify({
        location: {
          latitude: 27.586,
          longitude: 91.866,
        },
        weather: {
          rain_today_mm: 50,
          rain_72h_incl_today_mm: 120,
        },
        soil: {
          sm_0_7cm_ante: 0.35,
          // missing sm_0_7cm_change_3d
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid soil");
  });

  it("provides graceful fail-soft fallback when upstream orchestrator is offline (HTTP 200)", async () => {
    const req = new NextRequest("http://localhost:3000/api/predict", {
      method: "POST",
      body: JSON.stringify({
        location: {
          latitude: 27.586,
          longitude: 91.866,
        },
        weather: {
          rain_today_mm: 85.0,
          rain_72h_incl_today_mm: 190.0,
        },
        soil: {
          sm_0_7cm_ante: 0.42,
          sm_0_7cm_change_3d: 0.08,
        },
        regionId: "tawang",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isFallback).toBe(true);
    expect(data.fallbackReason).toBeDefined();
    expect(data.result).toBeDefined();
    expect(data.result.risk_level).toBe("moderate");
    expect(data.result.risk_score).toBe(0.45);
    expect(data.timestamp).toBeDefined();
  });
});
