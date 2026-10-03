"""Train the GIS landslide classifier from local DEM tiles and GeoJSON labels."""

from __future__ import annotations

import glob
import os
import warnings
from pathlib import Path
from typing import Iterable

import geopandas as gpd
import joblib
import numpy as np
import rasterio
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split


warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
DEM_DIR = Path(os.getenv("GIS_DEM_DIR", BASE_DIR / "dem_tiles"))
INVENTORY_FILE_PATH = Path(
    os.getenv("GIS_INVENTORY_PATH", BASE_DIR / "ner_landslides.geojson")
)
STATES_FILE_PATH = os.getenv("GIS_STATES_PATH")
MODEL_SAVE_PATH = Path(
    os.getenv("GIS_MODEL_PATH", BASE_DIR / "gis_agent_model.joblib")
)
SEED = int(os.getenv("GIS_TRAINING_SEED", "42"))


def list_tiles(dem_dir: Path) -> list[str]:
    tiles = sorted(glob.glob(str(dem_dir / "*.tif")))
    if not tiles:
        raise FileNotFoundError(
            f"No DEM .tif files found in '{dem_dir}'. "
            "Set GIS_DEM_DIR or place the downloaded tiles there."
        )
    print(f"Found {len(tiles)} DEM tiles in {dem_dir}")
    return tiles


def load_real_dem(file_path: str):
    with rasterio.open(file_path) as source:
        dem_data = source.read(1).astype(np.float32)
        transform = source.transform
        bounds = source.bounds
        center_lat = (bounds.bottom + bounds.top) / 2.0
        res_x = transform[0]
        res_y = -transform[4]
    return dem_data, transform, center_lat, res_x, res_y


def tile_bounds(file_path: str):
    with rasterio.open(file_path) as source:
        return source.bounds


def calculate_slope(dem: np.ndarray, res_x_deg: float, res_y_deg: float, center_lat: float):
    res_y_m = 111320 * res_y_deg
    res_x_m = 111320 * res_x_deg * np.cos(np.radians(center_lat))
    dy, dx = np.gradient(dem, res_y_m, res_x_m)
    slope_percent = np.sqrt(dx**2 + dy**2)
    return np.degrees(np.arctan(slope_percent))


def get_features_at_coords(coords, dem_data, slope_data, transform):
    features = []
    for index, (x_coord, y_coord) in coords:
        row, column = rasterio.transform.rowcol(transform, x_coord, y_coord)
        if 0 <= row < dem_data.shape[0] and 0 <= column < dem_data.shape[1]:
            elevation = dem_data[row, column]
            slope = slope_data[row, column]
            if elevation > -1000 and np.isfinite(slope):
                features.append((index, [float(elevation), float(slope)]))
    return features


def in_box(coords, bounds):
    return [
        (index, (x_coord, y_coord))
        for index, (x_coord, y_coord) in coords
        if bounds.left <= x_coord < bounds.right
        and bounds.bottom < y_coord <= bounds.top
    ]


def keep_inside_states(candidates, states_path: str):
    states = gpd.read_file(states_path).to_crs(4326)
    try:
        from shapely import contains_xy, union_all

        region = union_all(states.geometry.values)
        coordinates = np.asarray(candidates)
        if coordinates.size == 0:
            return candidates
        keep = contains_xy(region, coordinates[:, 0], coordinates[:, 1])
        return [candidate for candidate, selected in zip(candidates, keep) if selected]
    except ImportError:
        from shapely.geometry import Point
        from shapely.ops import unary_union

        region = unary_union(states.geometry.values)
        return [
            candidate
            for candidate in candidates
            if region.contains(Point(candidate[0], candidate[1]))
        ]


def train_and_save_agent(
    tiles: Iterable[str],
    inventory_path: Path,
    save_path: Path,
    states_path: str | None = None,
) -> None:
    print("\n--- STARTING GIS AGENT TRAINING ---")
    print(f"Loading historical landslide inventory from {inventory_path}...")
    if not inventory_path.exists():
        raise FileNotFoundError(f"Inventory file not found: {inventory_path}")

    landslides = gpd.read_file(inventory_path)
    if landslides.crs is not None and landslides.crs.to_epsg() != 4326:
        landslides = landslides.to_crs(4326)
    print(f"Loaded {len(landslides)} historical landslide records.")

    positive_coordinates = [
        (index, (point.x, point.y))
        for index, point in enumerate(landslides.geometry)
        if point is not None and point.geom_type == "Point"
    ]
    if not positive_coordinates:
        raise ValueError("The inventory contains no Point geometries.")

    rng = np.random.default_rng(SEED)
    tile_list = list(tiles)
    bounds_list = [tile_bounds(tile) for tile in tile_list]
    negative_count = len(positive_coordinates) * 2
    candidate_count = negative_count * 4
    selected_tiles = rng.integers(0, len(tile_list), candidate_count)
    negative_candidates = [
        (
            rng.uniform(bounds_list[tile_index].left, bounds_list[tile_index].right),
            rng.uniform(bounds_list[tile_index].bottom, bounds_list[tile_index].top),
        )
        for tile_index in selected_tiles
    ]

    if states_path and Path(states_path).exists():
        negative_candidates = keep_inside_states(negative_candidates, states_path)
        print(f"Safe samples limited to state boundaries: {len(negative_candidates)} candidates")
    else:
        print("[NOTE] No state boundary file configured; safe samples use DEM tile bounds.")

    negative_coordinates = list(enumerate(negative_candidates))
    positive_features: dict[int, list[float]] = {}
    negative_features: dict[int, list[float]] = {}

    for tile_number, (tile_path, bounds) in enumerate(zip(tile_list, bounds_list), 1):
        positive_here = in_box(positive_coordinates, bounds)
        negative_here = in_box(negative_coordinates, bounds)
        if not positive_here and not negative_here:
            continue

        dem, transform, center_lat, res_x, res_y = load_real_dem(tile_path)
        slope = calculate_slope(dem, res_x, res_y, center_lat)
        positive_features.update(get_features_at_coords(positive_here, dem, slope, transform))
        negative_features.update(get_features_at_coords(negative_here, dem, slope, transform))
        print(
            f"  [{tile_number}/{len(tile_list)}] {Path(tile_path).name}: "
            f"{len(positive_here)} landslides, {len(negative_here)} safe candidates"
        )
        del dem, slope

    positive_samples = [positive_features[index] for index in sorted(positive_features)]
    if not positive_samples:
        raise ValueError("No landslide points fell inside the DEM tiles.")

    negative_samples = [negative_features[index] for index in sorted(negative_features)]
    negative_samples = negative_samples[: len(positive_samples) * 2]
    if not negative_samples:
        raise ValueError("No valid safe/background samples were found.")

    features = np.asarray(positive_samples + negative_samples)
    labels = np.asarray([1] * len(positive_samples) + [0] * len(negative_samples))
    print(f"Dataset prepared: {features.shape[0]} samples (features: elevation, slope).")

    x_train, x_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.2, random_state=SEED, stratify=labels
    )
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(x_train, y_train)
    print(classification_report(y_test, model.predict(x_test), target_names=["Safe", "Landslide"]))

    save_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, save_path)
    print(f"[SUCCESS] GIS model saved to {save_path}")


if __name__ == "__main__":
    train_and_save_agent(
        list_tiles(DEM_DIR),
        INVENTORY_FILE_PATH,
        MODEL_SAVE_PATH,
        STATES_FILE_PATH,
    )
import numpy as np
import rasterio
import geopandas as gpd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import warnings
import os

warnings.filterwarnings('ignore')

# ==========================================
# CONFIGURATION
# ==========================================
DEM_FILE_PATH = (
    "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM/"
    "Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM.tif"
)  # <-- USER: Dataset path
INVENTORY_FILE_PATH = "ner_landslides.geojson" # <-- USER: Labels path
MODEL_SAVE_PATH = "gis_agent_model.joblib" # Where the trained AI will be saved

# ==========================================
# 1. Load Real DEM Data
# ==========================================
def load_real_dem(file_path):
    print(f"Loading actual DEM dataset from {file_path}...")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset not found at '{file_path}'.")
        
    with rasterio.open(file_path) as src:
        dem_data = src.read(1)
        transform = src.transform
        bounds = src.bounds
        crs = src.crs
        
        center_lat = (bounds.bottom + bounds.top) / 2.0
        res_x = transform[0]
        res_y = -transform[4] 
        
    return dem_data, transform, center_lat, res_x, res_y

# ==========================================
# 2. Geomorphological Calculations
# ==========================================
def calculate_slope(dem, res_x_deg, res_y_deg, center_lat):
    print("Calculating terrain slope gradients...")
    res_y_m = 111320 * res_y_deg
    res_x_m = 111320 * res_x_deg * np.cos(np.radians(center_lat))
    
    dy, dx = np.gradient(dem, res_y_m, res_x_m)
    slope_percent = np.sqrt(dx**2 + dy**2)
    return np.degrees(np.arctan(slope_percent))

# ==========================================
# 3. Training the GIS Agent
# ==========================================
def train_and_save_agent(dem_data, slope_data, transform, inventory_path, save_path):
    print(f"\n--- STARTING AGENT TRAINING ---")
    print(f"Loading historical landslide inventory from {inventory_path}...")
    
    if not os.path.exists(inventory_path):
        print(f"[ERROR] Inventory file not found: {inventory_path}.")
        return
        
    landslides_gdf = gpd.read_file(inventory_path)
    print(f"Loaded {len(landslides_gdf)} historical landslide records.")
    
    coords_pos = [(point.x, point.y) for point in landslides_gdf.geometry if point.type == 'Point']
    
    def get_features_at_coords(coords):
        features = []
        for x, y in coords:
            row, col = rasterio.transform.rowcol(transform, x, y)
            if 0 <= row < dem_data.shape[0] and 0 <= col < dem_data.shape[1]:
                elev = dem_data[row, col]
                slp = slope_data[row, col]
                if elev > -1000 and not np.isnan(slp):
                    features.append([elev, slp])
        return features

    print("Extracting topographical features for landslide locations...")
    X_pos = get_features_at_coords(coords_pos)
    y_pos = [1] * len(X_pos)
    
    if not X_pos:
        print("[ERROR] No landslide points fell within the DEM bounds.")
        return
        
    print("Generating background (safe) terrain samples...")
    num_negatives = len(X_pos) * 2 
    
    bounds = rasterio.transform.array_bounds(dem_data.shape[0], dem_data.shape[1], transform)
    min_x, min_y, max_x, max_y = bounds
    
    coords_neg = []
    for _ in range(num_negatives * 2):
        rx = np.random.uniform(min_x, max_x)
        ry = np.random.uniform(min_y, max_y)
        coords_neg.append((rx, ry))
        
    X_neg = get_features_at_coords(coords_neg)[:num_negatives]
    y_neg = [0] * len(X_neg)
    
    X = np.array(X_pos + X_neg)
    y = np.array(y_pos + y_neg)
    
    print(f"Dataset prepared: {X.shape[0]} total samples (Features: Elevation, Slope).")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest AI...")
    model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    print("\nModel Evaluation:")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=['Safe', 'Landslide']))
    
    print(f"\nSaving trained agent to: {save_path}")
    joblib.dump(model, save_path)
    print("[SUCCESS] Agent trained and saved! Ready for backend inference.")

if __name__ == "__main__":
    try:
        dem, transform, center_lat, res_x, res_y = load_real_dem(DEM_FILE_PATH)
        slope = calculate_slope(dem, res_x, res_y, center_lat)
        train_and_save_agent(dem, slope, transform, INVENTORY_FILE_PATH, MODEL_SAVE_PATH)
    except Exception as e:
        print(f"Error during training: {e}")
