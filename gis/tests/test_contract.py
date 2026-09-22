from fastapi.testclient import TestClient
from api.app import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_impact_contract():
    r = client.post("/api/impact/analyze", json={
        "latitude": 19.0760,
        "longitude": 72.8777,
        "hazardType": "fire",
        "radiusMeters": 500
    })
    assert r.status_code == 200
    body = r.json()

    required = [
        "incident", "impactArea", "administrativeArea",
        "estimatedExposure", "nearbyHospitals",
        "nearbyFireStations", "nearbyPoliceStations",
        "nearbyShelters", "nearbySchools", "affectedRoads",
        "criticalInfrastructure", "waterBodies", "drainage",
        "elevation", "vulnerabilityFactors", "dataProvenance"
    ]
    for key in required:
        assert key in body
