from __future__ import annotations

from pathlib import Path
from math import radians, sin, cos, sqrt, atan2
import json
import geopandas as gpd
from shapely.geometry import Point


DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "demo"


def load_layer(name: str) -> gpd.GeoDataFrame:
    path = DATA_DIR / f"{name}.geojson"
    if not path.exists():
        return gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")
    return gpd.read_file(path)


def haversine_m(lat1, lon1, lat2, lon2):
    """Straight-line distance between two WGS84 coordinates in metres."""
    R = 6371000.0
    p1, p2 = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(p1) * cos(p2) * sin(dlon/2)**2
    return 2 * R * atan2(sqrt(a), sqrt(1-a))


def nearby_points(layer, lat, lon, radius_m, limit=10):
    if layer.empty:
        return []

    rows = []
    for _, r in layer.iterrows():
        geom = r.geometry
        if geom is None or geom.is_empty:
            continue
        if geom.geom_type != "Point":
            continue
        d = haversine_m(lat, lon, geom.y, geom.x)
        if d <= radius_m:
            item = {}
            for col in layer.columns:
                if col != "geometry":
                    value = r[col]
                    item[col] = None if value is None else str(value)
            item["latitude"] = geom.y
            item["longitude"] = geom.x
            item["distanceMeters"] = round(d, 1)
            item["dataType"] = "DEMO/SEEDED"
            rows.append(item)

    return sorted(rows, key=lambda x: x["distanceMeters"])[:limit]


def point_in_polygon(layer, point):
    if layer.empty:
        return None
    matches = layer[layer.geometry.contains(point)]
    if matches.empty:
        return None
    r = matches.iloc[0]
    return {
        k: (None if r[k] is None else str(r[k]))
        for k in layer.columns if k != "geometry"
    } | {"dataType": "DEMO/SEEDED"}


def intersecting_features(layer, impact_geom, limit=50):
    if layer.empty:
        return []
    out = []
    for _, r in layer.iterrows():
        geom = r.geometry
        if geom is None or geom.is_empty:
            continue
        if geom.intersects(impact_geom):
            item = {
                k: (None if r[k] is None else str(r[k]))
                for k in layer.columns if k != "geometry"
            }
            item["dataType"] = "DEMO/SEEDED"
            out.append(item)
    return out[:limit]


def analyze(lat: float, lon: float, hazard_type: str = "unknown",
            radius_m: float = 500.0) -> dict:
    """Run the complete prototype analysis.

    The buffer is a CALCULATED prototype impact area. It is not a real
    observed disaster footprint.
    """
    point = Point(lon, lat)

    # Use a local projected CRS for metre-based buffer calculations.
    # EPSG:32643 is suitable for the Mumbai demonstration area.
    point_gdf = gpd.GeoDataFrame({"id": [1]}, geometry=[point], crs="EPSG:4326")
    projected = point_gdf.to_crs("EPSG:32643")
    impact_projected = projected.geometry.iloc[0].buffer(radius_m)
    impact_gdf = gpd.GeoDataFrame(
        {"id": [1]}, geometry=[impact_projected], crs="EPSG:32643"
    )
    impact_wgs84 = impact_gdf.to_crs("EPSG:4326").geometry.iloc[0]

    wards = load_layer("wards")
    hospitals = load_layer("hospitals")
    fire = load_layer("fire_stations")
    police = load_layer("police_stations")
    shelters = load_layer("shelters")
    schools = load_layer("schools")
    roads = load_layer("roads")
    critical = load_layer("critical_infrastructure")
    water = load_layer("water_bodies")
    drainage = load_layer("drainage")
    population = load_layer("population")
    elevation = load_layer("elevation")

    ward = point_in_polygon(wards, point)

    result = {
        "incident": {
            "latitude": lat,
            "longitude": lon,
            "hazardType": hazard_type
        },
        "impactArea": {
            "type": "buffer",
            "radiusMeters": radius_m,
            "dataType": "CALCULATED",
            "note": "Prototype buffer; not the observed disaster footprint."
        },
        "administrativeArea": ward or {
            "ward": None,
            "dataType": "UNAVAILABLE"
        },
        "estimatedExposure": {
            "population": None,
            "unit": "persons",
            "method": None,
            "source": None,
            "isExact": False,
            "dataType": "UNAVAILABLE"
        },
        "nearbyHospitals": nearby_points(hospitals, lat, lon, radius_m),
        "nearbyFireStations": nearby_points(fire, lat, lon, radius_m),
        "nearbyPoliceStations": nearby_points(police, lat, lon, radius_m),
        "nearbyShelters": nearby_points(shelters, lat, lon, radius_m),
        "nearbySchools": nearby_points(schools, lat, lon, radius_m),
        "affectedRoads": intersecting_features(roads, impact_wgs84),
        "criticalInfrastructure": nearby_points(critical, lat, lon, radius_m),
        "waterBodies": nearby_points(water, lat, lon, radius_m),
        "drainage": nearby_points(drainage, lat, lon, radius_m),
        "elevation": {
            "meters": None,
            "source": None,
            "dataType": "UNAVAILABLE"
        },
        "vulnerabilityFactors": [],
        "dataProvenance": [
            {
                "source": "data/demo/*.geojson",
                "dataType": "DEMO/SEEDED",
                "note": "Synthetic data only; replace before presenting real-world results."
            },
            {
                "source": "GIS spatial calculations",
                "dataType": "CALCULATED",
                "methods": [
                    "point-in-polygon ward lookup",
                    "straight-line facility distance",
                    "impact-buffer road intersection"
                ]
            }
        ]
    }

    # Population calculation is intentionally conservative. The demo population
    # file contains grid cells with an estimated population value. If a cell's
    # centroid lies in the impact area, its population is summed.
    if not population.empty and "population" in population.columns:
        pop_projected = population.to_crs("EPSG:32643")
        selected = pop_projected[pop_projected.geometry.centroid.within(impact_projected)]
        total = 0.0
        for v in selected["population"]:
            try:
                total += float(v)
            except (TypeError, ValueError):
                pass
        result["estimatedExposure"] = {
            "population": round(total, 2),
            "unit": "persons",
            "method": "Sum of demo population-grid values whose centroids fall inside the calculated buffer",
            "source": "data/demo/population.geojson",
            "isExact": False,
            "dataType": "CALCULATED",
            "note": "This is a synthetic demonstration, not an official affected-population count."
        }

    # Simple transparent vulnerability evidence.
    if result["nearbyFireStations"] == []:
        result["vulnerabilityFactors"].append({
            "factor": "No mapped fire station inside configured radius",
            "source": "CALCULATED",
            "evidence": f"No demo fire-station point within {radius_m} m."
        })
    if result["nearbyHospitals"] == []:
        result["vulnerabilityFactors"].append({
            "factor": "No mapped hospital inside configured radius",
            "source": "CALCULATED",
            "evidence": f"No demo hospital point within {radius_m} m."
        })
    if result["waterBodies"]:
        result["vulnerabilityFactors"].append({
            "factor": "Nearby mapped water body",
            "source": "DATASET-DERIVED + CALCULATED",
            "evidence": f"{len(result['waterBodies'])} demo water-body feature(s) within radius."
        })

    return result
