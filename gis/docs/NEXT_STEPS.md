# Exactly what the GIS team member should do

## Step 1 — Show the leader this package

Tell the leader:

> I have built the GIS + Human Impact prototype. It accepts incident coordinates and returns ward context, nearby emergency facilities, affected roads, population exposure, water/drainage context, elevation and vulnerability evidence. The included data is clearly marked synthetic for testing; real datasets still need to be acquired and loaded.

## Step 2 — Confirm the team's geographic scope

The project brief says start with India, then choose one practical demonstration area if nationwide coverage is too large.

Do NOT silently assume Mumbai if your team has already selected another city.

## Step 3 — Ask the backend developer for the integration point

Find out:
- backend language/framework
- database
- existing API style
- whether they want this as a separate service or Python module

## Step 4 — Acquire real data

Start with the highest-value layers:

1. ward/admin polygons
2. roads
3. hospitals
4. fire stations
5. police stations
6. schools
7. population
8. water bodies/drainage
9. elevation
10. shelters/critical infrastructure where reliable data exists

## Step 5 — Record provenance

For every dataset, record:
source, official URL, format, resolution, fields, CRS, license, coverage, limitations and integration method.

## Step 6 — Replace demo data

Do not rename synthetic files and call them real.

Import legitimate data into a separate `data/real/` or PostGIS database and keep source metadata.

## Step 7 — Run test coordinates

Test:
- inside a known ward
- near a hospital
- near a fire station
- near a road
- near water
- outside data coverage

## Step 8 — Give the backend team

Hand over:
- source catalogue
- acquisition/preprocessing scripts
- GIS schema
- impact engine
- API contract
- tests
- sample request/response
- limitations

## What you do NOT need to build

- frontend dashboard
- fancy map UI
- login
- chatbot
- unrelated backend pages

Your job is the GIS/data/impact-analysis layer.
