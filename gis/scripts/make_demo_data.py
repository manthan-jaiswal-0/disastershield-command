from pathlib import Path
import json
from shapely.geometry import Point, Polygon, LineString, mapping

OUT = Path(__file__).resolve().parents[1] / "data" / "demo"
OUT.mkdir(parents=True, exist_ok=True)


def write(name, features):
    fc = {"type": "FeatureCollection", "features": features}
    (OUT / name).write_text(json.dumps(fc, indent=2), encoding="utf-8")


def point_feature(lon, lat, props):
    return {"type": "Feature", "properties": props, "geometry": mapping(Point(lon, lat))}


def polygon_feature(coords, props):
    return {"type": "Feature", "properties": props, "geometry": mapping(Polygon(coords))}


def line_feature(coords, props):
    return {"type": "Feature", "properties": props, "geometry": mapping(LineString(coords))}


# Synthetic ward polygons around the demonstration point.
write("wards.geojson", [
    polygon_feature([
        (72.870,19.068),(72.885,19.068),(72.885,19.083),
        (72.870,19.083),(72.870,19.068)
    ], {"ward_id":"DEMO-W01","ward_name":"Demo Ward 1","municipality":"Demo Municipality"})
])

write("hospitals.geojson", [
    point_feature(72.8755,19.0785, {"facility_id":"DEMO-H01","name":"Demo Hospital A","type":"hospital"}),
    point_feature(72.8890,19.0820, {"facility_id":"DEMO-H02","name":"Demo Hospital B","type":"hospital"})
])

write("fire_stations.geojson", [
    point_feature(72.8740,19.0740, {"facility_id":"DEMO-F01","name":"Demo Fire Station A"}),
    point_feature(72.8920,19.0700, {"facility_id":"DEMO-F02","name":"Demo Fire Station B"})
])

write("police_stations.geojson", [
    point_feature(72.8790,19.0770, {"facility_id":"DEMO-P01","name":"Demo Police Station A"}),
    point_feature(72.8650,19.0810, {"facility_id":"DEMO-P02","name":"Demo Police Station B"})
])

write("shelters.geojson", [
    point_feature(72.8780,19.0800, {"facility_id":"DEMO-S01","name":"Demo Shelter A","capacity":None})
])

write("schools.geojson", [
    point_feature(72.8760,19.0750, {"facility_id":"DEMO-SCH01","name":"Demo School A","type":"school"})
])

write("critical_infrastructure.geojson", [
    point_feature(72.8810,19.0790, {"asset_id":"DEMO-CI01","name":"Demo Railway Station","type":"railway_station"})
])

write("water_bodies.geojson", [
    point_feature(72.8830,19.0760, {"water_id":"DEMO-WB01","name":"Demo Water Body","type":"lake"})
])

write("drainage.geojson", [
    point_feature(72.8795,19.0735, {"drain_id":"DEMO-D01","name":"Demo Drain","type":"storm_drain"})
])

write("roads.geojson", [
    line_feature([(72.868,19.070),(72.889,19.081)], {"road_id":"DEMO-R01","name":"Demo Road 1","road_type":"primary"}),
    line_feature([(72.870,19.082),(72.889,19.072)], {"road_id":"DEMO-R02","name":"Demo Road 2","road_type":"secondary"})
])

# Synthetic population grid values. These are intentionally labelled DEMO.
write("population.geojson", [
    point_feature(72.874,19.073, {"grid_id":"DEMO-G01","population":1200}),
    point_feature(72.878,19.076, {"grid_id":"DEMO-G02","population":1800}),
    point_feature(72.882,19.079, {"grid_id":"DEMO-G03","population":900})
])

write("elevation.geojson", [
    point_feature(72.8777,19.0760, {"elevation_id":"DEMO-E01","elevation_m":8.0})
])

print(f"Synthetic demo data written to {OUT}")
