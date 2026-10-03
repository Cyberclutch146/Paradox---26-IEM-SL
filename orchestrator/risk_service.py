"""HTTP adapter for the exported landslide XGBoost risk model."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import xgboost as xgb

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

    # Supports both short and long naming conventions
    def _first(*names: str) -> str | None:
        for n in names:
            v = os.getenv(n)
            if v is not None:
                return v
        return None

    env_overrides = {
        "risk.model_path": _first("RISK_MODEL_PATH"),
        "risk.port": _first("RISK_PORT"),
        "risk.host": _first("RISK_HOST"),
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


ROOT = Path(__file__).resolve().parent
MODEL_PATH = Path(_get("risk.model_path", ROOT / "risk_agent" / "model_main (1).json"))
RISK_PORT = _get("risk.port", 8002)
RISK_HOST = _get("risk.host", "127.0.0.1")
FEATURE_NAMES = [
    "rain_today_mm",
    "rain_72h_incl_today_mm",
    "rain_ante_7d_mm",
    "rain_ante_30d_mm",
    "sm_0_7cm_ante",
    "sm_0_7cm_change_3d",
    "doy_sin",
    "doy_cos",
    "mean_slope",
    "elevation_range",
]
MODEL = xgb.XGBClassifier()
MODEL.load_model(MODEL_PATH)


def _features(payload: dict[str, Any]) -> list[float]:
    weather = payload.get("weather", {})
    soil = payload.get("soil", {})
    gis = payload.get("gis_context", {})
    values = {
        "rain_today_mm": weather.get("rain_today_mm"),
        "rain_72h_incl_today_mm": weather.get("rain_72h_incl_today_mm"),
        "rain_ante_7d_mm": weather.get("rain_ante_7d_mm", 0.0),
        "rain_ante_30d_mm": weather.get("rain_ante_30d_mm", 0.0),
        "sm_0_7cm_ante": soil.get("sm_0_7cm_ante"),
        "sm_0_7cm_change_3d": soil.get("sm_0_7cm_change_3d"),
        "doy_sin": weather.get("doy_sin", 0.0),
        "doy_cos": weather.get("doy_cos", 1.0),
        "mean_slope": gis.get("mean_slope"),
        "elevation_range": gis.get("elevation_range"),
    }
    missing = [name for name, value in values.items() if value is None]
    if missing:
        raise ValueError(f"missing risk features: {', '.join(missing)}")
    return [float(values[name]) for name in FEATURE_NAMES]


def score(payload: dict[str, Any]) -> dict[str, Any]:
    probability = float(MODEL.predict_proba([_features(payload)])[0][1])
    if probability >= 0.7:
        level = "high"
    elif probability >= 0.35:
        level = "moderate"
    else:
        level = "low"
    return {
        "risk_score": probability,
        "risk_level": level,
        "model": MODEL_PATH.name,
        "features": FEATURE_NAMES,
    }


class RiskHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        if self.path != "/score":
            self.send_error(404, "Use POST /score")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            response = score(payload)
            status = 200
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            response = {"error": str(exc)}
            status = 400
        encoded = json.dumps(response).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main() -> None:
    port = RISK_PORT
    server = ThreadingHTTPServer((RISK_HOST, port), RiskHandler)
    print(f"Risk service listening on http://{server.server_address[0]}:{port}/score")
    server.serve_forever()


if __name__ == "__main__":
    main()