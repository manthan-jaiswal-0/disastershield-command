# GIS dataset source catalogue

The project brief requires every dataset to document source, official URL, format, resolution, fields, access/license, coverage, limitations and integration method.

Below is the recommended source plan. Verify the current terms before downloading or redistributing data.

| Category | Recommended source | Format / resolution | Integration |
|---|---|---|---|
| Administrative boundaries | Survey of India Online Maps | Shapefile/GDB where offered | Import polygons to PostGIS/GeoPandas |
| Mumbai wards | OpenCity/BharAtlas ward layer; cross-check with BMC GIS | GeoJSON/SHP/Parquet | Ward point-in-polygon |
| Roads | OpenStreetMap / Geofabrik India extract | PBF / vector road features | Import roads and spatially index |
| Hospitals | Government/open municipal sources where coordinate-ready; OSM as fallback | Point features | Nearby-distance query |
| Fire stations | BMC/Fire Brigade official references; OSM fallback | Point features | Nearby-distance query |
| Police stations | Mumbai Police official map/reference; OSM fallback | Point features | Nearby-distance query |
| Shelters | Government disaster-management datasets where available; OSM fallback | Point features | Nearby-distance query |
| Schools | UDISE+/government data if coordinate-ready; OSM fallback | Point features | Nearby-distance query |
| Population | Census of India and/or WorldPop | Census units or gridded population | Spatial aggregation |
| Water bodies | Bhuvan/ISRO or OSM | Vector features | Proximity/intersection |
| Drainage | Bhuvan/municipal/OSM where available | Vector features | Proximity/intersection |
| Elevation | Copernicus DEM/SRTM | DEM raster | Point elevation / derived terrain |

## Important source notes

### Survey of India

Official portal:
https://onlinemaps.surveyofindia.gov.in/

Use it for authoritative administrative boundary products where the required unit is available.

### BMC GIS

Official BMC GIS reference:
https://portal.mcgm.gov.in/irj/portal/anonymous/BMC-on-Map-NearMe-Amenities-Facilities

Use BMC as the official cross-check for Mumbai municipal boundaries/amenities where available.

### OpenCity / BharAtlas Mumbai wards

https://bharatlas.com/view/wards_mumbai

This is third-party/open mapping data, not an official BMC publication. Treat it as such and cross-check with BMC.

### Mumbai Police

https://mumbaipolice.gov.in/Police_map

Useful official reference for police-station coverage. A machine-readable GIS layer may still need to be sourced separately.

### OpenStreetMap / Geofabrik

https://download.geofabrik.de/asia/india.html

OSM provides broad road and POI coverage. Follow ODbL attribution requirements.

### Census of India

https://censusindia.gov.in/nada/

Useful for historical official population data. Census 2011 is not current population.

### WorldPop

https://hub.worldpop.org/geodata/

WorldPop provides gridded population estimates. These are modeled estimates, not exact census counts. Check the dataset's current license and attribution requirements.

### Bhuvan

https://bhuvan-app1.nrsc.gov.in/bhuvan2d/bhuvan/bhuvan2d.php

Useful for Indian geospatial layers including water/hydrology and infrastructure where available. Check the applicable Bhuvan terms before copying or redistributing data.

### Copernicus DEM

https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM.html

Potential DEM source. Check current access/licensing and use an accessible DEM product for the prototype.

## Dataset record template

For every real dataset, fill:

- Dataset name
- Category
- Source organization
- Official URL
- Direct download/API URL
- Format
- CRS
- Geographic resolution
- Coverage
- Important fields
- Update frequency
- License
- Access conditions
- Reliability
- Integration method
- Limitations
- DATASET-DERIVED vs CALCULATED classification
