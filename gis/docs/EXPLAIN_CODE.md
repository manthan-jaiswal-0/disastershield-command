# Beginner-friendly code explanation

## 1. `api/app.py`

This is the web API.

### FastAPI app

```python
app = FastAPI(...)
```

Creates the API server.

### Request model

```python
class ImpactRequest(BaseModel):
    latitude: float
    longitude: float
    hazardType: str
    radiusMeters: float
```

This tells the API what data it expects.

### Endpoint

```python
@app.post("/api/impact/analyze")
def impact_analysis(request: ImpactRequest):
```

When the backend sends coordinates to this URL, the function calls the GIS engine.

---

## 2. `gis/impact_engine.py`

This is YOUR main module.

### Load data

```python
load_layer("hospitals")
```

reads a GeoJSON layer into GeoPandas.

### Create incident point

```python
Point(lon, lat)
```

A latitude/longitude becomes a map point.

### Create impact area

```python
buffer(radius_m)
```

creates a circular area around the incident.

This is a **CALCULATED** prototype area, not an observed disaster footprint.

### Ward lookup

```python
wards[wards.geometry.contains(point)]
```

asks:

> Which ward polygon contains this incident point?

### Nearby facilities

For each hospital/fire station/police station/shelter, the code calculates straight-line distance from the incident. Facilities inside the configured radius are returned.

### Affected roads

```python
road.geometry.intersects(impact_geometry)
```

asks:

> Does this mapped road geometry intersect the calculated impact area?

Important: this does NOT prove that the road is closed.

### Population

The demo uses population grid points. If a grid point falls inside the impact area, its population value is included in the demonstration estimate.

For real gridded population data, use the dataset's documented methodology and clearly label the result as an estimate.

### Vulnerability factors

The prototype produces explainable evidence such as:

- no mapped fire station within radius
- no mapped hospital within radius
- nearby water body

It does NOT invent an unexplained `riskScore = 87`.

---

## 3. `scripts/make_demo_data.py`

This creates synthetic GeoJSON files so the code can be tested without downloading real datasets.

Every feature uses IDs such as `DEMO-H01`.

Never tell the SIH judges that these demo features are real.

---

## 4. `tests/test_contract.py`

This checks that:

1. the API is alive;
2. `/api/impact/analyze` accepts a valid request;
3. the response contains all required keys.

---

## 5. Why GeoPandas + Shapely?

GeoPandas handles geographic vector data such as:

- points
- lines
- polygons

Shapely performs geometry operations such as:

- contains
- intersects
- buffer

That is enough for the first prototype.

## 6. Why PostGIS later?

GeoJSON files are fine for a student prototype.

For a larger real deployment, the team should load the datasets into PostgreSQL/PostGIS and add spatial indexes. That prevents every API request from scanning huge raw files.
