from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from main import analyze_incident
from schemas import IncidentPayload


app = FastAPI(
    title="DisasterShield Intelligence Engine",
    description="Explainable decision-support engine for urban flooding and extreme rainfall.",
    version="0.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "engine": "DisasterShield Intelligence Engine",
        "status": "online",
        "version": "0.2.0",
        "mode": "decision_support"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/api/v1/analyze")
def analyze(payload: IncidentPayload):
    """
    Analyze multi-source observational data to detect and assess emerging flood incidents.
    This is an explainable decision-support system. Human review is required.
    No autonomous emergency dispatch is executed.
    """
    if isinstance(payload, IncidentPayload):
        data = payload.model_dump()
    else:
        data = payload

    result = analyze_incident(data)
    return result