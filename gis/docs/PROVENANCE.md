# Data provenance rules

Every result must be one of:

## DATASET-DERIVED

Directly present in a real source dataset.

Examples:
- hospital location
- road geometry
- ward name
- population grid value
- DEM elevation

## CALCULATED

Produced by GIS logic.

Examples:
- distance to hospital
- roads intersecting impact geometry
- ward containing incident
- estimated population inside impact geometry

## DEMO/SEEDED

Synthetic data inserted only to demonstrate the software.

The included `data/demo/` directory is entirely synthetic.

Never present DEMO/SEEDED values as real-world facts.
