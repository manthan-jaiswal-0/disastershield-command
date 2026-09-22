# Backend integration guide

## Start the GIS service

```bash
pip install -r requirements.txt
python scripts/make_demo_data.py
uvicorn api.app:app --host 0.0.0.0 --port 8000
```

## Backend call

```http
POST http://localhost:8000/api/impact/analyze
Content-Type: application/json
```

Body:

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "hazardType": "fire",
  "radiusMeters": 500
}
```

## Integration pattern

```text
Frontend / incident detector
          |
          v
Main DisasterShield backend
          |
          | HTTP POST
          v
GIS impact service
          |
          v
Impact JSON
          |
          v
Main backend response
          |
          v
Frontend map/dashboard
```

The GIS service should not own the frontend.

## Coordinate convention

API coordinates are WGS84 latitude/longitude (EPSG:4326).

For distance/buffer calculations in the Mumbai prototype, the engine uses EPSG:32643 internally because it is a metre-based projected CRS suitable for that demonstration area.

If the team expands nationally, the storage/calculation CRS strategy should be redesigned rather than blindly using one UTM zone everywhere.

## Real data migration

Replace the files in `data/demo/` with processed, licensed real datasets or change `load_layer()` to read from PostGIS.

Do not modify the response contract just because a source dataset uses different field names. Map source fields into the stable API schema.

## Missing data

Return `null`, `[]`, or an explicit `UNAVAILABLE` classification. Never fabricate values.
