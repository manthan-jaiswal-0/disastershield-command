# DisasterShield — GIS + Human Impact Layer

This package implements the SIH GIS + Human Impact module described in the project brief.

## What this module does

Input:
- incident latitude
- incident longitude
- hazard type
- impact radius (prototype)

Output:
- impact area
- ward/admin context
- estimated population exposure when a population dataset is loaded
- nearby hospitals
- nearby fire stations
- nearby police stations
- nearby shelters
- nearby schools
- affected roads
- critical infrastructure
- water bodies
- drainage
- elevation
- vulnerability factors
- provenance

The core question is:

> If an incident happens here, who and what could be affected?

## Important

The files in `data/demo/` are SYNTHETIC demo data. They are not real hospitals, roads, wards, or population figures.

For a real SIH demonstration, replace demo files with legitimately acquired datasets and keep the source/license metadata.

## Stack

- Python 3.10+
- FastAPI
- GeoPandas
- Shapely
- Pyogrio/Fiona

PostGIS is recommended for the final integrated deployment, but the included prototype works directly from GeoJSON so that a student team can run it without installing PostgreSQL first.

## Run

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

python scripts/make_demo_data.py

uvicorn api.app:app --reload
```

Open:
http://127.0.0.1:8000/docs

Test request:

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "hazardType": "fire",
  "radiusMeters": 500
}
```

The demo geometries are intentionally around Mumbai-like coordinates but are synthetic.

## Folder guide

- `gis/impact_engine.py` — main GIS logic
- `api/app.py` — API endpoint
- `scripts/make_demo_data.py` — creates synthetic test data
- `tests/test_contract.py` — API/engine contract tests
- `docs/DATA_SOURCES.md` — dataset catalogue template and verified source guidance
- `docs/API.md` — request/response contract
- `docs/INTEGRATION.md` — how the backend team consumes this module
- `docs/EXPLAIN_CODE.md` — beginner-friendly explanation
- `docs/PROVENANCE.md` — real/calculated/demo classification
- `docs/NEXT_STEPS.md` — exact work checklist

## What is NOT included

No real government/third-party GIS data is bundled. This avoids accidentally redistributing data whose license/access terms may not permit redistribution.

Use the acquisition instructions and source catalogue to obtain the real data legally.
