# Project Setup & Running Commands

## Virtual Environment

Activate the workspace virtual environment:

```powershell
.venv\Scripts\Activate.ps1
```

## Environment Configuration

The `.env` file is required for all services. It is included in the repository with the following keys (never commit secrets):

```
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=qwen/qwen3.8-27b:free
GIS_AGENT_URL=http://127.0.0.1:8000/api/gis/inference
RISK_AGENT_URL=http://127.0.0.1:8002/score
GIS_BBOX_DEGREES=0.01
GIS_DEM_DIR=GIS_agent/dem_tiles
AGENT_TIMEOUT_SECONDS=20
OPENROUTER_TIMEOUT_SECONDS=60
MAX_ORCHESTRATION_ROUNDS=6
HOST=127.0.0.1
PORT=8080
```

## Install Dependencies

```powershell
.venv\Scripts\python.exe -m pip install numpy pandas rasterio geopandas shapely scikit-learn joblib fastapi pydantic uvicorn xgboost openai
```

## Start Services

Start all three services from the repository root (each in its own terminal):

```powershell
# GIS Agent (port 8000)
.venv\Scripts\python.exe GIS_agent\api_backend.py

# Risk Service (port 8002)
.venv\Scripts\python.exe risk_service.py

# Orchestrator (port 8080)
.venv\Scripts\python.exe orchestrator.py
```

## Service Endpoints

| Service | URL | Endpoint |
|---------|-----|----------|
| GIS Agent | `http://127.0.0.1:8000` | `POST /api/gis/inference` |
| Risk Service | `http://127.0.0.1:8002` | `POST /score` |
| Orchestrator | `http://127.0.0.1:8080` | `POST /predict` |
| Orchestrator Health | `http://127.0.0.1:8080/health` | `GET` |

## Prediction Flow

```json
POST /predict
{
  "request_id": "chatbot-001",
  "location": {
    "latitude": 23.03,
    "longitude": 92.03
  },
  "weather": {
    "rain_today_mm": 85.0,
    "rain_72h_incl_today_mm": 190.0,
    "rain_ante_7d_mm": 240.0,
    "rain_ante_30d_mm": 500.0,
    "doy_sin": 0.5,
    "doy_cos": 0.866
  },
  "soil": {
    "sm_0_7cm_ante": 0.42,
    "sm_0_7cm_change_3d": 0.08
  }
}
```

## GIS Agent Details

- Reads DEM tiles from `GIS_agent/dem_tiles/` by default
- Can use a single DEM file via `DEM_FILE_PATH` env var
- Bounding box radius controlled by `GIS_BBOX_DEGREES` (default 0.01)
- Returns GeoJSON with `gis_context` containing `mean_slope` and `elevation_range`

## Risk Service Details

- Loads XGBoost model from `risk_agent/model_main (1).json`
- Expects 10 features: rain_today_mm, rain_72h_incl_today_mm, rain_ante_7d_mm, rain_ante_30d_mm, sm_0_7cm_ante, sm_0_7cm_change_3d, doy_sin, doy_cos, mean_slope, elevation_range
- Returns `risk_score` (probability) and `risk_level`: high (>=0.70), moderate (>=0.35), low (<0.35)

## Orchestrator Details

- Coordinates GIS agent then risk scoring agent via OpenRouter Qwen model
- Accepts point location, converts to bounding box using `GIS_BBOX_DEGREES`
- Returns JSON with: `risk_level`, `risk_score`, `confidence`, `rationale`, `recommended_actions`, `evidence`, `limitations`

## Quick Test (without OpenRouter)

You can test the local services independently:

```bash
# Test GIS inference
curl -s -X POST http://127.0.0.1:8000/api/gis/inference \
  -H 'Content-Type: application/json' \
  -d '{"min_lon":92.02,"min_lat":23.02,"max_lon":92.04,"max_lat":23.04}'

# Test risk scoring
curl -s -X POST http://127.0.0.1:8002/score \
  -H 'Content-Type: application/json' \
  -d '{"request_id":"test","weather":{"rain_today_mm":85.0,"rain_72h_incl_today_mm":190.0,"rain_ante_7d_mm":240.0,"rain_ante_30d_mm":500.0,"doy_sin":0.5,"doy_cos":0.866},"soil":{"sm_0_7cm_ante":0.42,"sm_0_7cm_change_3d":0.08},"gis_context":{"mean_slope":5.36,"elevation_range":42.91}}'
```
