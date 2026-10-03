"""Data fetching pipeline for landslide prediction.

Flow: Location -> Geocode -> Weather/Soil (Open-Meteo ECMWF) -> Terrain (Copernicus DEM) -> Orchestrator
"""

from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import rasterio
from rasterio.merge import merge

try:
    import yaml
except ImportError:
    yaml = None


CONFIG_PATH = Path(__file__).resolve().parent / "config.yaml"


def _load_config() -> dict[str, Any]:
    config = {}
    if CONFIG_PATH.exists() and yaml:
        try:
            with open(CONFIG_PATH, encoding="utf-8") as f:
                config = yaml.safe_load(f) or {}
        except Exception:
            pass

    def _first(*names: str) -> str | None:
        for n in names:
            v = os.getenv(n)
            if v is not None:
                return v
        return None

    env_overrides = {
        "openrouter.model": _first("OPENROUTER_MODEL"),
        "openrouter.url": _first("OPENROUTER_URL"),
        "openrouter.timeout_seconds": _first("OPENROUTER_TIMEOUT_SECONDS"),
        "orchestrator.max_rounds": _first("MAX_ORCHESTRATION_ROUNDS"),
        "orchestrator.host": _first("HOST", "ORCHESTRATOR_HOST"),
        "orchestrator.port": _first("PORT", "ORCHESTRATOR_PORT"),
        "agents.gis_url": _first("GIS_AGENT_URL"),
        "agents.risk_url": _first("RISK_AGENT_URL"),
        "agents.timeout_seconds": _first("AGENT_TIMEOUT_SECONDS"),
        "gis.bbox_degrees": _first("GIS_BBOX_DEGREES"),
        "gis.dem_dir": _first("GIS_DEM_DIR"),
        "risk.model_path": _first("RISK_MODEL_PATH"),
        "risk.port": _first("RISK_PORT"),
        "risk.host": _first("RISK_HOST"),
        "data_fetcher.nominatim_url": _first("NOMINATIM_URL"),
        "data_fetcher.open_meteo_url": _first("OPEN_METEO_URL"),
        "data_fetcher.copernicus_dem_dir": _first("COPERNICUS_DEM_DIR"),
    }

    def _set_nested(d: dict, key: str, value: str) -> None:
        if value is None:
            return
        parts = key.split(".")
        for part in parts[:-1]:
            d = d.setdefault(part, {})
        if value.isdigit():
            value = int(value)
        else:
            try:
                value = float(value)
            except ValueError:
                pass
        d[parts[-1]] = value

    for key, value in env_overrides.items():
        _set_nested(config, key, value)

    return config


_CONFIG = _load_config()


def _get(key: str, default: Any = None) -> Any:
    parts = key.split(".")
    value = _CONFIG
    for part in parts:
        if not isinstance(value, dict):
            return default
        value = value.get(part, default)
    return value if value is not None else default


NOMINATIM_URL = _get("data_fetcher.nominatim_url", "https://nominatim.openstreetmap.org/search")
OPEN_METEO_URL = _get("data_fetcher.open_meteo_url", "https://api.open-meteo.com/v1/ecmwf")
COPERNICUS_DEM_DIR = _get("data_fetcher.copernicus_dem_dir", "GIS_agent/dem_tiles")
ORCHESTRATOR_URL = f"http://{_get('orchestrator.host', '127.0.0.1')}:{_get('orchestrator.port', 8080)}/predict"


class DataFetcherError(Exception):
    pass


async def geocode_location(place_name: str) -> dict[str, float]:
    """Convert place name to latitude/longitude using Nominatim."""
    headers = {
        "User-Agent": "LandslideEWS/1.0 (contact@example.com)",
        "Accept": "application/json",
    }
    params = {"q": place_name, "format": "json", "limit": 1}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(NOMINATIM_URL, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
    if not data:
        raise DataFetcherError(f"Location not found: {place_name}")
    return {"latitude": float(data[0]["lat"]), "longitude": float(data[0]["lon"])}


async def fetch_weather_soil(latitude: float, longitude: float) -> dict[str, Any]:
    """Fetch weather and soil data from Open-Meteo ECMWF endpoint."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "precipitation_sum,soil_moisture_0_to_7cm_mean",
        "hourly": "soil_moisture_0_to_7cm",
        "past_days": 92,
        "forecast_days": 1,
        "timezone": "UTC",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        data = response.json()

    daily = data.get("daily", {})
    hourly = data.get("hourly", {})

    precip = daily.get("precipitation_sum", [])
    soil_0_7cm_daily = daily.get("soil_moisture_0_to_7cm_mean", [])

    if len(precip) < 2 or len(soil_0_7cm_daily) < 2:
        raise DataFetcherError("Insufficient weather/soil data returned")

    today_idx = -1
    rain_today = precip[today_idx] or 0.0
    rain_72h = sum(p or 0.0 for p in precip[-3:]) if len(precip) >= 3 else rain_today
    rain_7d = sum(p or 0.0 for p in precip[-7:]) if len(precip) >= 7 else rain_today
    rain_30d = sum(p or 0.0 for p in precip[-30:]) if len(precip) >= 30 else rain_7d

    sm_today = soil_0_7cm_daily[today_idx] or 0.0
    sm_3d_ago = soil_0_7cm_daily[-4] if len(soil_0_7cm_daily) >= 4 else sm_today
    sm_change_3d = sm_today - sm_3d_ago

    now = datetime.now(timezone.utc)
    doy = now.timetuple().tm_yday
    doy_sin = math.sin(2 * math.pi * doy / 365.25)
    doy_cos = math.cos(2 * math.pi * doy / 365.25)

    return {
        "rain_today_mm": float(rain_today),
        "rain_72h_incl_today_mm": float(rain_72h),
        "rain_ante_7d_mm": float(rain_7d),
        "rain_ante_30d_mm": float(rain_30d),
        "sm_0_7cm_ante": float(sm_today),
        "sm_0_7cm_change_3d": float(sm_change_3d),
        "doy_sin": float(doy_sin),
        "doy_cos": float(doy_cos),
    }


def get_terrain_context(latitude: float, longitude: float, radius_deg: float = 0.01) -> dict[str, float]:
    """Compute mean_slope and elevation_range from Copernicus DEM tiles."""
    dem_dir = Path(COPERNICUS_DEM_DIR)
    if not dem_dir.exists():
        raise DataFetcherError(f"DEM directory not found: {dem_dir}")

    tile_paths = sorted(dem_dir.rglob("*.tif"))
    if not tile_paths:
        raise DataFetcherError(f"No DEM tiles found in {dem_dir}")

    min_lon = longitude - radius_deg
    min_lat = latitude - radius_deg
    max_lon = longitude + radius_deg
    max_lat = latitude + radius_deg

    sources = []
    try:
        for tile_path in tile_paths:
            src = rasterio.open(tile_path)
            bounds = src.bounds
            if (bounds.right > min_lon and bounds.left < max_lon and
                bounds.top > min_lat and bounds.bottom < max_lat):
                sources.append(src)
            else:
                src.close()

        if not sources:
            raise DataFetcherError("No DEM tiles intersect the requested location")

        mosaic, transform = merge(
            sources,
            bounds=(min_lon, min_lat, max_lon, max_lat),
            nodata=np.nan,
        )
        dem_patch = mosaic[0]
        res_x = transform[0]
        res_y = -transform[4]
        center_lat = (min_lat + max_lat) / 2.0

    finally:
        for src in sources:
            src.close()

    if dem_patch.size == 0 or np.all(np.isnan(dem_patch)):
        raise DataFetcherError("No valid elevation data in patch")

    res_y_m = 111320 * res_y
    res_x_m = 111320 * res_x * np.cos(np.radians(center_lat))
    dy, dx = np.gradient(dem_patch, res_y_m, res_x_m)
    slope = np.degrees(np.arctan(np.sqrt(dx**2 + dy**2)))

    valid_elev = dem_patch[np.isfinite(dem_patch) & (dem_patch > -1000)]
    valid_slope = slope[np.isfinite(slope)]

    if valid_elev.size == 0 or valid_slope.size == 0:
        raise DataFetcherError("No valid elevation/slope after filtering")

    return {
        "mean_slope": float(np.mean(valid_slope)),
        "elevation_range": float(np.ptp(valid_elev)),
    }


async def call_orchestrator(payload: dict[str, Any]) -> dict[str, Any]:
    """Call the orchestrator's /predict endpoint."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(ORCHESTRATOR_URL, json=payload)
        response.raise_for_status()
        return response.json()


async def predict_from_place(place_name: str) -> dict[str, Any]:
    """Full pipeline: place name -> geocode -> weather/soil -> terrain -> orchestrator."""
    coords = await geocode_location(place_name)
    weather_soil = await fetch_weather_soil(coords["latitude"], coords["longitude"])
    terrain = get_terrain_context(coords["latitude"], coords["longitude"])

    payload = {
        "location": coords,
        "weather": {
            "rain_today_mm": weather_soil["rain_today_mm"],
            "rain_72h_incl_today_mm": weather_soil["rain_72h_incl_today_mm"],
            "rain_ante_7d_mm": weather_soil["rain_ante_7d_mm"],
            "rain_ante_30d_mm": weather_soil["rain_ante_30d_mm"],
            "doy_sin": weather_soil["doy_sin"],
            "doy_cos": weather_soil["doy_cos"],
        },
        "soil": {
            "sm_0_7cm_ante": weather_soil["sm_0_7cm_ante"],
            "sm_0_7cm_change_3d": weather_soil["sm_0_7cm_change_3d"],
        },
    }

    result = await call_orchestrator(payload)
    result["input"] = {"place_name": place_name, "coordinates": coords}
    return result


async def predict_from_coords(latitude: float, longitude: float) -> dict[str, Any]:
    """Full pipeline from coordinates directly (skips geocoding)."""
    weather_soil = await fetch_weather_soil(latitude, longitude)
    terrain = get_terrain_context(latitude, longitude)

    payload = {
        "location": {"latitude": latitude, "longitude": longitude},
        "weather": {
            "rain_today_mm": weather_soil["rain_today_mm"],
            "rain_72h_incl_today_mm": weather_soil["rain_72h_incl_today_mm"],
            "rain_ante_7d_mm": weather_soil["rain_ante_7d_mm"],
            "rain_ante_30d_mm": weather_soil["rain_ante_30d_mm"],
            "doy_sin": weather_soil["doy_sin"],
            "doy_cos": weather_soil["doy_cos"],
        },
        "soil": {
            "sm_0_7cm_ante": weather_soil["sm_0_7cm_ante"],
            "sm_0_7cm_change_3d": weather_soil["sm_0_7cm_change_3d"],
        },
    }

    result = await call_orchestrator(payload)
    result["input"] = {"coordinates": {"latitude": latitude, "longitude": longitude}}
    return result


if __name__ == "__main__":
    import asyncio
    import sys

    async def demo():
        if len(sys.argv) > 1:
            place = " ".join(sys.argv[1:])
            print(f"Predicting for place: {place}")
            result = await predict_from_place(place)
        else:
            print("Predicting for demo coords (Darjeeling)")
            result = await predict_from_coords(27.0360, 88.2627)
        import json
        print(json.dumps(result, indent=2))

    asyncio.run(demo())