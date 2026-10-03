# Project Context Prompt: Landslide Early Warning System

You are helping on an existing landslide early-warning project. Read this context before changing code.

## Goal

Build and stabilize a local multi-agent landslide prediction system with:

1. A GIS agent that extracts terrain evidence from DEM rasters and a trained GIS classifier.
2. A risk-scoring agent that loads an already-trained XGBoost model and scores weather, soil, and GIS features.
3. An OpenRouter/Qwen orchestrator that coordinates GIS first, then risk scoring, and returns one structured prediction for a chatbot or frontend.

The community-reporting component is not currently an autonomous agent and is out of scope for this integration.

## Repository

Workspace root:

```text
D:\College_5th sem\Paradox_IEM\orchestrator
```

Important files:

- `orchestrator.py`: OpenRouter/Qwen tool-calling coordinator and HTTP API.
- `risk_service.py`: local HTTP adapter around the trained risk XGBoost model.
- `risk_agent/`: exported risk model JSON artifacts; these are model files, not Python source.
- `GIS_agent/api_backend.py`: FastAPI GIS inference service.
- `GIS_agent/train_agent.py`: optional retraining script; training is already complete and this script does not need to be run for normal inference.
- `GIS_agent/gis_agent_model.joblib`: trained Random Forest GIS model artifact.
- `GIS_agent/ner_landslides.geojson`: historical landslide inventory used during training.
- `GIS_agent/dem_tiles/`: 23 Copernicus DEM GeoTIFF tiles used at inference time.
- `GIS_agent/notebook8f7201018c.ipynb`: original Kaggle-style training workflow. Its final multi-tile cell was transferred into `train_agent.py` with local paths.
- `.env`: local configuration and API key. Never print, commit, or include its secret values in responses or logs.
- `.env.example`: example configuration if present; the user may have customized or renamed configuration files.

## Trained Artifacts

### GIS model

`GIS_agent/gis_agent_model.joblib` contains a trained scikit-learn `RandomForestClassifier`. It was trained with two features:

```text
[elevation, slope]
```

Do not retrain it unless explicitly requested. Normal inference loads it with `joblib.load`.

### Risk model

`risk_agent/model_main (1).json` and related JSON files are exported XGBoost model artifacts. The file named `risk_agent (1).py` is actually a mislabeled JSON model export, not executable Python.

The risk model expects these ten features:

```text
rain_today_mm
rain_72h_incl_today_mm
rain_ante_7d_mm
rain_ante_30d_mm
sm_0_7cm_ante
sm_0_7cm_change_3d
doy_sin
doy_cos
mean_slope
elevation_range
```

`risk_service.py` loads `model_main (1).json` and returns a risk probability plus a coarse level:

- `high`: score >= 0.70
- `moderate`: score >= 0.35
- `low`: score < 0.35

## Running Services

Use the workspace virtual environment:

```powershell
.venv\Scripts\Activate.ps1
```

Services:

```text
GIS service:          http://127.0.0.1:8000
GIS inference:        POST /api/gis/inference
Risk service:         http://127.0.0.1:8002/score
Orchestrator:         http://127.0.0.1:8080
Orchestrator health:  GET /health
Prediction endpoint:  POST /predict
```

Start them from the repository root:

```powershell
.venv\Scripts\python.exe GIS_agent\api_backend.py
.venv\Scripts\python.exe risk_service.py
.venv\Scripts\python.exe orchestrator.py
```

The GIS backend reads `GIS_agent/dem_tiles` by default. It mosaics the tiles intersecting the requested bounding box. A single DEM file can still be used by setting `DEM_FILE_PATH`.

## GIS Contract

Request:

```json
{
  "min_lon": 92.02,
  "min_lat": 23.02,
  "max_lon": 92.04,
  "max_lat": 23.04
}
```

Response is GeoJSON plus terrain context:

```json
{
  "type": "FeatureCollection",
  "features": [],
  "gis_context": {
    "mean_slope": 5.36,
    "elevation_range": 42.91
  }
}
```

The downloaded DEM tiles cover approximately longitude 90E to 95E. Requests around longitude 78E will fail because they are outside the available raster coverage.

## Risk Contract

Request:

```json
{
  "request_id": "example-001",
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
  },
  "gis_context": {
    "mean_slope": 5.36,
    "elevation_range": 42.91
  }
}
```

Example response:

```json
{
  "risk_score": 0.0101,
  "risk_level": "low",
  "model": "model_main (1).json"
}
```

## Orchestrator Behavior

`orchestrator.py` sends a system prompt and tools to the OpenRouter OpenAI-compatible API. Qwen should:

1. Call the GIS tool when GIS context is missing.
2. Receive GIS GeoJSON and `gis_context`.
3. Call the risk-scoring tool with weather, soil, and GIS context.
4. Return JSON containing `risk_level`, `risk_score`, `confidence`, `rationale`, `recommended_actions`, `evidence`, and `limitations`.

The orchestrator accepts a point location and converts it to a bounding box using `GIS_BBOX_DEGREES` (default `0.01`). It has local defaults for the GIS and risk URLs, so those variables are optional when running locally.

Browser behavior:

- `GET /health` returns a service status JSON object.
- `GET /` also returns a service status JSON object.
- `POST /predict` performs an actual prediction.

A browser click on `/predict` is not a valid prediction request because it sends GET instead of POST.

## Prediction Request to Orchestrator

```json
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

## Dependencies

Install with the workspace interpreter:

```powershell
.venv\Scripts\python.exe -m pip install numpy pandas rasterio geopandas shapely scikit-learn joblib fastapi pydantic uvicorn xgboost
```

Never install the deprecated `sklearn` package; use `scikit-learn`.

## Verified Behavior

Verified successfully:

- GIS service starts and responds at port 8000.
- Risk service starts and responds at port 8002.
- GIS inference works inside DEM coverage and returned 56 features for a test bounding box.
- GIS returned `mean_slope` approximately 5.36 and `elevation_range` approximately 42.91 for that test.
- Risk service independently scored the GIS context and returned `low` with a score around 0.0101.
- Orchestrator health endpoint returns HTTP 200.
- GIS point-to-bounding-box adapter works.
- Python compilation and diagnostics pass for the services.

## Current Blocker

The latest full orchestrator test reached the OpenRouter call but received:

```text
HTTP 403 Forbidden
```

The `.env` key metadata was checked without printing the secret:

- Key present: yes
- Starts with `sk-`: yes
- Outer quotes: no
- Configured model: `qwen/qwen3-8b`

Likely causes are an inactive/revoked key, insufficient OpenRouter credits, or model access restrictions. Do not modify or print the secret. Test OpenRouter access independently or verify the key/model permissions in the OpenRouter dashboard.

A previous attempt with an earlier key/configuration returned HTTP 429, so rate limits and account access should also be considered.

## Guidance for Future Agents

- Do not rerun GIS training unless explicitly requested; the trained `.joblib` artifact already exists.
- Do not treat risk JSON exports as Python scripts.
- Do not invent DEM data or risk features.
- Preserve the existing local service contracts.
- Do not expose API keys in logs, prompts, patches, or final responses.
- Keep changes focused and validate with a real endpoint or a narrow executable test after editing.
- The immediate next task is to resolve OpenRouter 403 access, then rerun the full `/predict` test through Qwen.
