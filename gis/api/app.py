from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from gis.impact_engine import analyze

app = FastAPI(
    title="DisasterShield GIS + Human Impact API",
    version="0.1.0",
    description="Prototype GIS impact-analysis service for DisasterShield."
)


class ImpactRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    hazardType: str = Field(default="unknown", min_length=1)
    radiusMeters: float = Field(default=500, gt=0, le=50000)


@app.get("/health")
def health():
    return {"status": "ok", "service": "disastershield-gis"}


@app.post("/api/impact/analyze")
def impact_analysis(request: ImpactRequest):
    try:
        return analyze(
            lat=request.latitude,
            lon=request.longitude,
            hazard_type=request.hazardType,
            radius_m=request.radiusMeters
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
