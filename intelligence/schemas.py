from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class LocationMetadata(BaseModel):
    location_id: Optional[str] = Field(
        default=None,
        description="Ward, district, or catchment zone identifier."
    )
    location_name: Optional[str] = Field(
        default=None,
        description="Human-readable location or neighborhood name."
    )
    latitude: Optional[float] = Field(
        default=None,
        description="Geographic latitude coordinate."
    )
    longitude: Optional[float] = Field(
        default=None,
        description="Geographic longitude coordinate."
    )


class RainfallInput(BaseModel):
    intensity_mm_per_hour: float = Field(
        default=0.0,
        ge=0.0,
        description="Rainfall intensity rate in millimeters per hour."
    )
    duration_minutes: Optional[int] = Field(
        default=60,
        ge=1,
        description="Observed or forecast duration in minutes."
    )
    trend: Optional[str] = Field(
        default="stable",
        description="Rainfall trend indicator (e.g., high, rising, stable, decreasing)."
    )


class WaterEnvironmentInput(BaseModel):
    water_level: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Measured flood or surface water level."
    )
    water_level_unit: Optional[str] = Field(
        default="m",
        description="Unit of measurement for water level (default: m)."
    )
    trend: Optional[Literal["rising", "stable", "falling", "unknown"]] = Field(
        default="stable",
        description="Directional trend of water level."
    )
    sensor_status: Optional[Literal["valid", "unreliable", "degraded", "error", "offline", "unknown"]] = Field(
        default="valid",
        description="Operational health status of the water sensor."
    )


class CitizenReportInput(BaseModel):
    id: Optional[str] = Field(
        default=None,
        description="Unique identifier for the citizen report."
    )
    report: str = Field(
        ...,
        min_length=1,
        description="Text description of observed conditions or surface flooding."
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO 8601 timestamp of report submission."
    )


class ImageEvidenceInput(BaseModel):
    id: Optional[str] = Field(
        default=None,
        description="Unique identifier for the image evidence."
    )
    assessment: str = Field(
        ...,
        min_length=1,
        description="Visual assessment or descriptive tag of the image."
    )
    quality: Optional[str] = Field(
        default="medium",
        description="Quality or resolution tier of the visual evidence."
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO 8601 timestamp of image capture."
    )


class GISInput(BaseModel):
    population_exposure: Optional[Literal["high", "moderate", "low"]] = Field(
        default="low",
        description="Human population exposure category."
    )
    road_exposure: Optional[Literal["high", "moderate", "low"]] = Field(
        default="low",
        description="Road network and transportation corridor exposure category."
    )
    critical_infrastructure: List[str] = Field(
        default_factory=list,
        description="List of critical infrastructure entities in the affected area."
    )
    vulnerability: Optional[Literal["high", "moderate", "low"]] = Field(
        default="low",
        description="Area socio-economic or physical vulnerability category."
    )


class IncidentPayload(BaseModel):
    """
    Standardized payload for DisasterShield incident analysis.
    Decision-support only; human review required.
    """
    incident_id: Optional[str] = Field(
        default=None,
        description="Optional tracking identifier for this incident candidate."
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO 8601 timestamp of observational data collection."
    )
    location: Optional[LocationMetadata] = Field(
        default=None,
        description="Geographic and administrative location metadata."
    )
    rainfall: Optional[RainfallInput] = Field(
        default_factory=RainfallInput,
        description="Precipitation observations."
    )
    water_environment: Optional[WaterEnvironmentInput] = Field(
        default_factory=WaterEnvironmentInput,
        description="Environmental water sensors and hydrological indicators."
    )
    citizen_reports: List[CitizenReportInput] = Field(
        default_factory=list,
        description="List of citizen reports received for this location."
    )
    image_evidence: List[ImageEvidenceInput] = Field(
        default_factory=list,
        description="List of corroborated visual observations."
    )
    gis: Optional[GISInput] = Field(
        default_factory=GISInput,
        description="GIS layers including population, road networks, and infrastructure."
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "incident_id": "INC-2026-0913-01",
                "timestamp": "2026-09-13T20:00:00Z",
                "location": {
                    "location_id": "WARD-12-SOUTH",
                    "location_name": "Central Metro District",
                    "latitude": 12.9716,
                    "longitude": 77.5946
                },
                "rainfall": {
                    "intensity_mm_per_hour": 92.0,
                    "duration_minutes": 60,
                    "trend": "high"
                },
                "water_environment": {
                    "water_level": 1.2,
                    "water_level_unit": "m",
                    "trend": "rising",
                    "sensor_status": "valid"
                },
                "citizen_reports": [
                    {
                        "id": "CR-001",
                        "report": "Water accumulating on main road",
                        "timestamp": "2026-09-13T19:45:00Z"
                    },
                    {
                        "id": "CR-002",
                        "report": "Road partially flooded, vehicles slowing",
                        "timestamp": "2026-09-13T19:50:00Z"
                    },
                    {
                        "id": "CR-003",
                        "report": "Water level increasing rapidly at underpass",
                        "timestamp": "2026-09-13T19:55:00Z"
                    }
                ],
                "image_evidence": [
                    {
                        "id": "IMG-001",
                        "assessment": "surface water visible across carriageway",
                        "quality": "medium",
                        "timestamp": "2026-09-13T19:52:00Z"
                    }
                ],
                "gis": {
                    "population_exposure": "high",
                    "road_exposure": "high",
                    "critical_infrastructure": [
                        "major_transport_corridor",
                        "regional_hospital_access"
                    ],
                    "vulnerability": "moderate"
                }
            }
        }
    )
