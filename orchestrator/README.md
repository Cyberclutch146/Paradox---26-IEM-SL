# Landslide EWS Orchestrator

This service coordinates the GIS agent and the risk-scoring agent through an OpenAI-compatible OpenRouter call. Qwen decides when to call each specialist, receives their JSON results, and returns a single prediction response.

## Run

1. Copy `.env.example` to `.env` and set the OpenRouter key/model. The agent URLs already default to the local GIS and risk services; environment variables can override them. Load variables in your shell; the service does not read `.env` automatically.
2. Put a DEM GeoTIFF at `GIS_agent/dem.tif` (or set `DEM_FILE_PATH` to its location), install the GIS dependencies, and start the existing GIS backend:

```powershell
python -m pip install fastapi uvicorn rasterio geopandas joblib numpy scikit-learn
python GIS_agent/api_backend.py
```

The GIS service URL is `http://127.0.0.1:8000/api/gis/inference`.

3. Install the risk model runtime and start the risk service:

```powershell
python -m pip install -r requirements.txt
python risk_service.py
```

This creates the URL used by the orchestrator: `http://127.0.0.1:8002/score`. Keep that value in `RISK_AGENT_URL`.

4. Start the orchestrator in a second terminal:

```powershell
python orchestrator.py
```

5. Send a prediction request:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/predict -Method Post -ContentType 'application/json' -Body (@{
  location = @{ latitude = 30.3165; longitude = 78.0322 }
  weather = @{ rain_today_mm = 85.0; rain_72h_incl_today_mm = 190.0 }
  soil = @{ sm_0_7cm_ante = 0.42; sm_0_7cm_change_3d = 0.08 }
} | ConvertTo-Json -Depth 6)
```

## Agent contract

The orchestrator accepts a point location and converts it to a bounding box before calling the GIS service. The GIS backend returns GeoJSON plus `gis_context.mean_slope` and `gis_context.elevation_range`; those values feed the risk model. The exported model needs ten total features, so rainfall and soil values must come from your weather/soil pipeline.

The exported risk model files in this folder are model artifacts, not Python callables. They should be loaded by the risk agent service, not by the orchestrator.