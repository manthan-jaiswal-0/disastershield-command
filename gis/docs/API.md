# API Contract

## Endpoint

`POST /api/impact/analyze`

## Request

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "hazardType": "fire",
  "radiusMeters": 500
}
```

## Meaning

- `latitude`, `longitude`: incident coordinate in WGS84.
- `hazardType`: label supplied by the incident system.
- `radiusMeters`: configurable prototype impact radius.

The radius is a **calculated assumption** for the prototype. It is not automatically the true disaster footprint.

## Response

The response contains:

- `incident`
- `impactArea`
- `administrativeArea`
- `estimatedExposure`
- `nearbyHospitals`
- `nearbyFireStations`
- `nearbyPoliceStations`
- `nearbyShelters`
- `nearbySchools`
- `affectedRoads`
- `criticalInfrastructure`
- `waterBodies`
- `drainage`
- `elevation`
- `vulnerabilityFactors`
- `dataProvenance`

## Error handling

FastAPI returns HTTP 422 for invalid request fields. The service returns HTTP 500 for unexpected processing errors.

## Integration

The main backend can call this service over HTTP and pass the returned JSON to its own response model/frontend.
