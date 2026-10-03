import numpy as np
import rasterio
from rasterio.features import shapes
from rasterio.merge import merge
import geopandas as gpd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import joblib
import json
import warnings
import os

warnings.filterwarnings('ignore')

# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv("GIS_MODEL_PATH", os.path.join(BASE_DIR, "gis_agent_model.joblib"))
DEM_DIR_PATH = os.getenv("GIS_DEM_DIR", os.path.join(BASE_DIR, "dem_tiles"))
DEM_FILE_PATH = os.getenv("DEM_FILE_PATH")

app = FastAPI(title="NER GIS Agent - Live Inference Backend")

# Load trained AI Model globally on boot
print("--- BOOTING GIS AGENT BACKEND ---")
if os.path.exists(MODEL_PATH):
    print(f"Loading trained AI from {MODEL_PATH}...")
    ai_agent = joblib.load(MODEL_PATH)
    print("AI Agent loaded successfully.")
else:
    print(f"[WARNING] Model {MODEL_PATH} not found. You must run train_agent.py first!")
    ai_agent = None

class InferenceRequest(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

def calculate_slope(dem, res_x_deg, res_y_deg, center_lat):
    """Calculates local slope for the dynamically extracted patch."""
    res_y_m = 111320 * res_y_deg
    res_x_m = 111320 * res_x_deg * np.cos(np.radians(center_lat))
    dy, dx = np.gradient(dem, res_y_m, res_x_m)
    return np.degrees(np.arctan(np.sqrt(dx**2 + dy**2)))


def terrain_context(dem_patch, slope_patch):
    valid_elevation = dem_patch[np.isfinite(dem_patch) & (dem_patch > -1000)]
    valid_slope = slope_patch[np.isfinite(slope_patch)]
    return {
        "mean_slope": float(np.mean(valid_slope)) if valid_slope.size else None,
        "elevation_range": float(np.ptp(valid_elevation)) if valid_elevation.size else None,
    }


def load_dem_patch(min_lon, min_lat, max_lon, max_lat):
    if DEM_FILE_PATH and os.path.isfile(DEM_FILE_PATH):
        tile_paths = [DEM_FILE_PATH]
    else:
        tile_paths = sorted(
            os.path.join(DEM_DIR_PATH, name)
            for name in os.listdir(DEM_DIR_PATH)
            if name.lower().endswith(".tif")
        ) if os.path.isdir(DEM_DIR_PATH) else []
    if not tile_paths:
        raise FileNotFoundError(
            f"No DEM tiles found in '{DEM_DIR_PATH}'. "
            "Set GIS_DEM_DIR or add .tif files to GIS_agent/dem_tiles."
        )

    sources = []
    try:
        for tile_path in tile_paths:
            source = rasterio.open(tile_path)
            bounds = source.bounds
            intersects = (
                bounds.right > min_lon
                and bounds.left < max_lon
                and bounds.top > min_lat
                and bounds.bottom < max_lat
            )
            if intersects:
                sources.append(source)
            else:
                source.close()
        if not sources:
            raise ValueError("The requested bounding box does not intersect any DEM tile.")
        mosaic, transform = merge(
            sources,
            bounds=(min_lon, min_lat, max_lon, max_lat),
            nodata=np.nan,
        )
        return mosaic[0], transform, sources[0].transform[0], -sources[0].transform[4]
    finally:
        for source in sources:
            source.close()

@app.post("/api/gis/inference")
def run_agent_inference(req: InferenceRequest):
    """
    Live AI Inference Endpoint: 
    Takes a bounding box, extracts the DEM patch, runs the trained ML model,
    and returns high-risk hazard zones as vector GeoJSON polygons.
    """
    if not ai_agent:
        raise HTTPException(status_code=500, detail="AI Agent model not trained yet. Run train_agent.py")
        
    print(f"\n[INFERENCE REQUEST] Received BBOX: {req.min_lon}, {req.min_lat}, {req.max_lon}, {req.max_lat}")
    
    # 1. Read just the requested window from the huge DEM dataset
    try:
        dem_patch, patch_transform, res_x, res_y = load_dem_patch(
            req.min_lon, req.min_lat, req.max_lon, req.max_lat
        )
        center_lat = (req.min_lat + req.max_lat) / 2.0
    except Exception as e:
         raise HTTPException(status_code=400, detail=f"Failed to read DEM region: {e}")
         
    if dem_patch.size == 0:
            return {"type": "FeatureCollection", "features": [], "gis_context": {}, "message": "No data in requested bounds."}

    # 2. Local Topography Calculation
    slope_patch = calculate_slope(dem_patch, res_x, res_y, center_lat)
    context = terrain_context(dem_patch, slope_patch)
    
    # 3. Prepare features for AI [Elevation, Slope]
    elev_flat = dem_patch.flatten()
    slope_flat = slope_patch.flatten()
    
    valid_mask = (elev_flat > -1000) & (~np.isnan(slope_flat))
    features = np.column_stack((elev_flat[valid_mask], slope_flat[valid_mask]))
    
    # 4. AI Inference
    print(f"Running ML Inference on {features.shape[0]} valid pixels...")
    predictions = np.zeros(elev_flat.shape)
    
    if features.shape[0] > 0:
        preds = ai_agent.predict(features)
        # We can also use predict_proba for confidence scoring
        probs = ai_agent.predict_proba(features)[:, 1] 
        predictions[valid_mask] = preds
        
    predictions_matrix = predictions.reshape(dem_patch.shape)
    
    # 5. Vectorize positive predictions (Landslide = 1)
    mask = predictions_matrix == 1
    
    results = (
        {'properties': {'risk_level': 'High', 'ai_confidence': 'High'}, 'geometry': s}
        for i, (s, v) 
        in enumerate(shapes(mask.astype(rasterio.int16), mask=mask, transform=patch_transform))
        if v == 1
    )
    
    geoms = list(results)
    if not geoms:
        print("Inference Complete: No high-risk zones detected in this patch.")
        return {"type": "FeatureCollection", "features": [], "gis_context": context}
        
    gdf = gpd.GeoDataFrame.from_features(geoms, crs="EPSG:4326")
    print(f"Inference Complete: Extracted {len(gdf)} hazard polygons.")
    
    response = json.loads(gdf.to_json())
    response["gis_context"] = context
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
