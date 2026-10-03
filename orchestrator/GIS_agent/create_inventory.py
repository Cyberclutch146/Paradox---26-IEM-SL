import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

# ==============================================================
# HELPER SCRIPT: Convert a standard CSV into a GeoJSON Inventory
# ==============================================================

# 1. Update this with the path to your downloaded CSV
CSV_FILE_PATH = "C:\\Users\\Asus\\Downloads\\ne_landslide_training_new.csv"

def create_geojson_from_csv(csv_path, output_geojson_path):
    print(f"Reading {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: Could not find {csv_path}. Please place your CSV in this folder.")
        return

    # 2. Update these column names if your CSV headers are different
    # (e.g., 'lat', 'lon', 'Latitude', 'Longitude', 'Y', 'X')
    LAT_COL = 'latitude'
    LON_COL = 'longitude'

    if LAT_COL not in df.columns or LON_COL not in df.columns:
        print(f"Error: Columns '{LAT_COL}' and/or '{LON_COL}' not found in CSV.")
        print(f"Available columns: {df.columns.tolist()}")
        return

    # Drop rows without coordinates
    df = df.dropna(subset=[LAT_COL, LON_COL])

    # 3. Convert tabular Lat/Lon into spatial Point geometries
    geometry = [Point(xy) for xy in zip(df[LON_COL], df[LAT_COL])]
    
    # 4. Create GeoDataFrame (EPSG:4326 is standard GPS coordinates)
    gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")

    # 5. Export to GeoJSON
    gdf.to_file(output_geojson_path, driver='GeoJSON')
    print(f"Success! GeoJSON saved to: {output_geojson_path}")
    print(f"Total historical landslides converted: {len(gdf)}")

if __name__ == "__main__":
    create_geojson_from_csv(CSV_FILE_PATH, "ner_landslides.geojson")
