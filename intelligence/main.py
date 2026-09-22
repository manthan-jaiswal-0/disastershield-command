import json

from detector import detect_incident
from evidence import evaluate_evidence
from verification import verify_incident
from risk import assess_risk
from priority import assign_priority
from recommendation import generate_recommendation


ENGINE_NAME = "DisasterShield Intelligence Engine"
ENGINE_VERSION = "0.2.0"
ENGINE_MODE = "decision_support"


LIMITATIONS = [
    "This system provides decision-support only.",
    "Scores are operational indicators, not scientifically validated probabilities.",
    "The system does not autonomously predict floods.",
    "Available evidence may be incomplete or inaccurate.",
    "Human review is required before operational action.",
    "The system does not autonomously dispatch emergency resources."
]


def analyze_incident(data):
    """
    DisasterShield Intelligence Engine

    Pipeline:
    DETECT → EVIDENCE → VERIFY → ASSESS → PRIORITIZE → RECOMMEND

    Decision-support system only.
    Human review is required before operational action.
    """

    # ==================================================
    # 1. DETECTION
    # ==================================================

    detection = detect_incident(data)

    if not detection["detected"]:
        return {
            "engine": {
                "name": ENGINE_NAME,
                "version": ENGINE_VERSION,
                "mode": ENGINE_MODE
            },

            "metadata": {
                "incident_id": data.get("incident_id"),
                "timestamp": data.get("timestamp"),
                "location": data.get("location")
            },

            "status": "no_emerging_incident",

            "message": (
                "No sufficient emerging incident signal detected."
            ),

            "recommendation": {
                "action": "continue_monitoring",

                "secondary_actions": [
                    "continue routine monitoring",
                    "await updated sensory observations"
                ],

                "contextual_advisories": [],

                "autonomous_dispatch": False,

                "human_review_required": True,

                "basis": {
                    "detection": "no_sufficient_signal"
                },

                "reason": (
                    "No sufficient emerging incident signal detected; "
                    "maintain passive monitoring."
                )
            },

            "explanation": {
                "detection": {
                    "what_was_detected": None,

                    "why": detection.get(
                        "reasons",
                        [
                            "No signals exceeded "
                            "observational thresholds."
                        ]
                    )
                }
            },

            "limitations": LIMITATIONS
        }

    # ==================================================
    # 2. EVIDENCE EVALUATION
    # ==================================================

    evidence = evaluate_evidence(data)

    # ==================================================
    # 3. VERIFICATION
    # ==================================================

    verification = verify_incident(
        data,
        evidence
    )

    # ==================================================
    # 4. RISK ASSESSMENT
    # ==================================================

    risk = assess_risk(data)

    # ==================================================
    # 5. PRIORITIZATION
    # ==================================================

    priority = assign_priority(
        data,
        verification,
        risk
    )

    # ==================================================
    # 6. RECOMMENDATION
    # ==================================================

    recommendation = generate_recommendation(
        priority,
        verification,
        risk,
        data=data
    )

    # ==================================================
    # 7. EXPLANATION DATA
    # ==================================================

    detection_reasons = detection.get(
        "reasons",
        []
    )

    # ----------------------------------------------
    # Evidence WHY
    # ----------------------------------------------

    evidence_reasons = []

    for item in evidence.get(
        "evidence_items",
        []
    ):
        if "reason" in item:
            evidence_reasons.append(
                item["reason"]
            )

    # ----------------------------------------------
    # Verification WHY
    # ----------------------------------------------

    verification_reasons = verification.get(
        "reasons",
        []
    )

    # ----------------------------------------------
    # Risk WHY
    # ----------------------------------------------

    risk_reasons = risk.get(
        "reasons",
        []
    )

    # ----------------------------------------------
    # Priority WHY
    # ----------------------------------------------

    priority_reasons = priority.get(
        "reasons",
        []
    )

    # ==================================================
    # 8. FINAL STRUCTURED RESPONSE
    # ==================================================

    return {

        # ==================================================
        # ENGINE
        # ==================================================

        "engine": {
            "name": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "mode": ENGINE_MODE
        },

        # ==================================================
        # METADATA
        # ==================================================

        "metadata": {
            "incident_id": data.get(
                "incident_id"
            ),

            "timestamp": data.get(
                "timestamp"
            ),

            "location": data.get(
                "location"
            )
        },

        # ==================================================
        # INCIDENT
        # ==================================================

        "incident": {
            "type": detection.get(
                "incident_type"
            ),

            "status": detection.get(
                "status",
                "emerging"
            )
        },

        # ==================================================
        # VERIFICATION
        # ==================================================

        "verification": {
            "score": verification.get(
                "score",
                0
            ),

            "level": verification.get(
                "level",
                "weak"
            ),

            "evidence_strength": evidence.get(
                "strength",
                "Unknown"
            ),

            "source_diversity": verification.get(
                "source_diversity",
                "none"
            ),

            "conflict_detected": verification.get(
                "conflict_detected",
                False
            )
        },

        # ==================================================
        # RISK
        # ==================================================

        "risk": {
            "level": risk.get(
                "level",
                "Low"
            ),

            "hazard": risk.get(
                "hazard",
                "Low"
            ),

            "exposure": risk.get(
                "exposure",
                "Low"
            ),

            "vulnerability": risk.get(
                "vulnerability",
                "low"
            )
        },

        # ==================================================
        # PRIORITY
        # ==================================================

        # IMPORTANT:
        # priority.py returns:
        #     "level": "P1/P2/P3"
        #
        # Therefore main.py must read:
        #     priority.get("level")
        #
        "priority": {
            "level": priority.get(
                "level",
                "P3"
            ),

            "action": priority.get(
                "action",
                "continue_monitoring"
            ),

            "decision_basis": priority.get(
                "decision_basis",
                {}
            )
        },

        # ==================================================
        # EXPLAINABLE DECISION
        # ==================================================

        "explanation": {

            # ----------------------------------------------
            # DETECTION
            # ----------------------------------------------

            "detection": {
                "what_was_detected": detection.get(
                    "incident_type"
                ),

                "why": detection_reasons
            },

            # ----------------------------------------------
            # EVIDENCE
            # ----------------------------------------------

            "evidence": {
                "strength": evidence.get(
                    "strength",
                    "Unknown"
                ),

                "why": evidence_reasons
            },

            # ----------------------------------------------
            # VERIFICATION
            # ----------------------------------------------

            "verification": {
                "level": verification.get(
                    "level",
                    "weak"
                ),

                "score": verification.get(
                    "score",
                    0
                ),

                "conflict_detected": verification.get(
                    "conflict_detected",
                    False
                ),

                "why": verification_reasons
            },

            # ----------------------------------------------
            # RISK
            # ----------------------------------------------

            "risk": {
                "level": risk.get(
                    "level",
                    "Low"
                ),

                "hazard": risk.get(
                    "hazard",
                    "Low"
                ),

                "exposure": risk.get(
                    "exposure",
                    "Low"
                ),

                "vulnerability": risk.get(
                    "vulnerability",
                    "low"
                ),

                "hazard_score": risk.get(
                    "hazard_score",
                    0
                ),

                "exposure_score": risk.get(
                    "exposure_score",
                    0
                ),

                "human_impact": risk.get(
                    "human_impact",
                    {}
                ),

                "infrastructure_impact": risk.get(
                    "infrastructure_impact",
                    {}
                ),

                "why": risk_reasons
            },

            # ----------------------------------------------
            # PRIORITY
            # ----------------------------------------------

            "priority": {
                "level": priority.get(
                    "level",
                    "P3"
                ),

                "why": priority_reasons
            },

            # ----------------------------------------------
            # RECOMMENDATION
            # ----------------------------------------------

            "recommendation": {
                "action": recommendation.get(
                    "action"
                ),

                "why": recommendation.get(
                    "reason"
                ),

                "contextual_advisories":
                    recommendation.get(
                        "contextual_advisories",
                        []
                    )
            }
        },

        # ==================================================
        # RECOMMENDATION
        # ==================================================

        "recommendation": recommendation,

        # ==================================================
        # SAFETY / GOVERNANCE LIMITATIONS
        # ==================================================

        "limitations": LIMITATIONS
    }


# ==========================================================
# LOCAL TEST
# ==========================================================

if __name__ == "__main__":

    sample_input = {

        "rainfall": {
            "intensity_mm_per_hour": 92,
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
                "report": "Water accumulating on road"
            },
            {
                "id": "CR-002",
                "report": "Road partially flooded"
            },
            {
                "id": "CR-003",
                "report": "Water level increasing"
            }
        ],

        "image_evidence": [
            {
                "id": "IMG-001",
                "assessment": "surface water visible",
                "quality": "medium"
            }
        ],

        "gis": {
            "population_exposure": "high",
            "road_exposure": "high",
            "critical_infrastructure": [
                "major_transport_corridor"
            ],
            "vulnerability": "moderate"
        }
    }

    result = analyze_incident(
        sample_input
    )

    print(
        json.dumps(
            result,
            indent=4
        )
    )