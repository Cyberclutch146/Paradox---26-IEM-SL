import { NextRequest, NextResponse } from "next/server";
import type { OrchestratorRequest, OrchestratorResponse, OrchestratorResult } from "@/data/types";

/**
 * Attempts to parse the ML server's `raw` field, which may be:
 * - A JSON string
 * - A ```json code block with JSON inside
 * - Markdown with an embedded ```json block
 */
function parseRawResult(raw: string): Partial<OrchestratorResult> | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // Try direct JSON parse
  if (trimmed.startsWith("{")) {
    try { return JSON.parse(trimmed); } catch {}
  }

  // Try extracting from ```json ... ``` code block
  const codeBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }

  return null;
}

export async function POST(request: NextRequest) {
  let body: Partial<OrchestratorRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload in request body." },
      { status: 400 }
    );
  }

  // 1. Validate geographical coordinates
  if (
    !body.location ||
    typeof body.location.latitude !== "number" ||
    typeof body.location.longitude !== "number" ||
    Number.isNaN(body.location.latitude) ||
    Number.isNaN(body.location.longitude)
  ) {
    return NextResponse.json(
      { error: "Invalid location: 'latitude' and 'longitude' numbers are required." },
      { status: 400 }
    );
  }

  // 2. Validate meteorological values
  if (
    !body.weather ||
    typeof body.weather.rain_today_mm !== "number" ||
    typeof body.weather.rain_72h_incl_today_mm !== "number" ||
    Number.isNaN(body.weather.rain_today_mm) ||
    Number.isNaN(body.weather.rain_72h_incl_today_mm)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid weather: 'rain_today_mm' and 'rain_72h_incl_today_mm' numbers are required.",
      },
      { status: 400 }
    );
  }

  // 3. Validate soil parameters
  if (
    !body.soil ||
    typeof body.soil.sm_0_7cm_ante !== "number" ||
    typeof body.soil.sm_0_7cm_change_3d !== "number" ||
    Number.isNaN(body.soil.sm_0_7cm_ante) ||
    Number.isNaN(body.soil.sm_0_7cm_change_3d)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid soil: 'sm_0_7cm_ante' and 'sm_0_7cm_change_3d' numbers are required.",
      },
      { status: 400 }
    );
  }

  // 4. Temporal feature engineering: compute doy_sin, doy_cos if absent
  let doy_sin = body.weather.doy_sin;
  let doy_cos = body.weather.doy_cos;

  if (typeof doy_sin !== "number" || typeof doy_cos !== "number") {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const dayOfYear =
      Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const year = now.getUTCFullYear();
    const daysInYear =
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
    const doyRad = (2 * Math.PI * dayOfYear) / daysInYear;

    if (typeof doy_sin !== "number") {
      doy_sin = Math.sin(doyRad);
    }
    if (typeof doy_cos !== "number") {
      doy_cos = Math.cos(doyRad);
    }
  }

  const rain_ante_7d_mm =
    typeof body.weather.rain_ante_7d_mm === "number"
      ? body.weather.rain_ante_7d_mm
      : 0;
  const rain_ante_30d_mm =
    typeof body.weather.rain_ante_30d_mm === "number"
      ? body.weather.rain_ante_30d_mm
      : 0;

  const enrichedPayload = {
    location: body.location,
    weather: {
      ...body.weather,
      doy_sin,
      doy_cos,
      rain_ante_7d_mm,
      rain_ante_30d_mm,
    },
    soil: body.soil,
    regionId: body.regionId,
  };

  const orchestratorUrl =
    process.env.ORCHESTRATOR_AGENT_URL || "http://127.0.0.1:8080/predict";
  const timeoutMs = parseInt(process.env.ORCHESTRATOR_TIMEOUT_MS || "60000", 10);
  const apiKey = process.env.ORCHESTRATOR_API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const upstreamRes = await fetch(orchestratorUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(enrichedPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!upstreamRes.ok) {
      throw new Error(`Upstream orchestrator returned status ${upstreamRes.status}`);
    }

    const data = await upstreamRes.json();
    const rawResult = data.result || data;

    // Parse the rich `raw` field that the ML server returns
    let parsed: Partial<OrchestratorResult> = {};
    if (typeof rawResult.raw === "string") {
      parsed = parseRawResult(rawResult.raw) ?? {};
    }

    // Merge: prefer parsed data from `raw`, fall back to top-level fields
    const result: OrchestratorResult = {
      risk_level: parsed.risk_level ?? rawResult.risk_level ?? "moderate",
      risk_score: parsed.risk_score ?? rawResult.risk_score ?? 0.45,
      rationale: parsed.rationale ?? rawResult.rationale ?? "",
      confidence: parsed.confidence ?? rawResult.confidence,
      recommended_actions: parsed.recommended_actions ?? rawResult.recommended_actions,
      evidence: parsed.evidence ?? rawResult.evidence,
      limitations: parsed.limitations ?? rawResult.limitations,
    };

    const responsePayload: OrchestratorResponse = {
      success: true,
      isFallback: false,
      result,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    const isTimeout =
      error instanceof Error && error.name === "AbortError";
    const errorMessage =
      error instanceof Error ? error.message : "Orchestrator service is currently offline or unreachable.";
    const fallbackReason = isTimeout
      ? `Orchestrator timed out after ${Math.round(timeoutMs / 1000)}s`
      : errorMessage;

    const fallbackResponse: OrchestratorResponse = {
      success: true,
      isFallback: true,
      fallbackReason,
      result: {
        risk_level: "moderate",
        risk_score: 0.45,
        rationale:
          "Orchestrator service is currently offline or unreachable. Displaying cached baseline estimates.",
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(fallbackResponse, { status: 200 });
  }
}
