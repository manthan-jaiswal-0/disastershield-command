def generate_recommendation(priority, verification, risk, data=None):
    """
    Generate an explainable response recommendation with context-aware advisories.

    This module provides decision-support advisories only.
    It does NOT autonomously dispatch emergency resources.
    Human review is mandatory before any operational action.
    """

    # priority.py returns "level", not "priority"
    priority_level = priority.get("level", "P3")

    priority_action = priority.get(
        "action",
        "continue_monitoring"
    )

    verification_level = verification.get(
        "level",
        "weak"
    )

    conflict_detected = verification.get(
        "conflict_detected",
        False
    )

    risk_level = risk.get(
        "level",
        "Low"
    )

    infra_impact = risk.get(
        "infrastructure_impact",
        {}
    )

    critical_infra = list(
        infra_impact.get(
            "critical_infrastructure",
            []
        )
    )

    road_exposure = infra_impact.get(
        "road_exposure",
        ""
    )

    # ==================================================
    # FALLBACK CHECKS FROM INPUT DATA
    # ==================================================

    if data:

        gis_data = data.get(
            "gis",
            {}
        )

        if not critical_infra:
            critical_infra = list(
                gis_data.get(
                    "critical_infrastructure",
                    []
                )
            )

        if not road_exposure:
            road_exposure = gis_data.get(
                "road_exposure",
                ""
            )

        water_data = data.get(
            "water_environment",
            {}
        )

        sensor_status = str(
            water_data.get(
                "sensor_status",
                "valid"
            )
        ).lower()

    else:
        sensor_status = "valid"

    # ==================================================
    # 1. BASELINE ACTION BY PRIORITY
    # ==================================================

    secondary_actions = []

    if priority_level == "P1":

        action = "immediate_human_assessment"

        secondary_actions = [
            "review incident evidence immediately",
            "confirm affected location and severity",
            "assess impact on people and critical infrastructure",
            "consider appropriate response escalation"
        ]

    elif priority_level == "P2":

        action = "urgent_human_review"

        secondary_actions = [
            "review available evidence",
            "confirm affected location",
            "continue monitoring rainfall and water indicators",
            "assess potential impact on people and infrastructure"
        ]

    else:

        action = "continue_monitoring"

        secondary_actions = [
            "seek additional evidence",
            "continue monitoring available signals"
        ]

    # ==================================================
    # 2. CONTEXT-AWARE ADVISORIES
    # ==================================================

    contextual_advisories = []
    advisory_actions = []

    # --------------------------------------------------
    # Critical Infrastructure
    # --------------------------------------------------

    if len(critical_infra) > 0:

        infra_str = ", ".join(
            critical_infra
        )

        contextual_advisories.append({
            "type": "critical_infrastructure_advisory",
            "target": critical_infra,
            "advisory": (
                f"Notify responsible authorities for critical assets: "
                f"{infra_str}."
            ),
            "why": (
                f"Critical infrastructure ({infra_str}) is identified "
                f"in the exposed hazard area."
            )
        })

        advisory_actions.append(
            f"notify authorities for critical infrastructure: "
            f"{infra_str}"
        )

    # --------------------------------------------------
    # High Road Exposure
    # --------------------------------------------------

    if str(
        road_exposure
    ).lower() == "high":

        contextual_advisories.append({
            "type": "traffic_and_access_advisory",
            "advisory": (
                "Coordinate with transit authorities for traffic "
                "diversion and actively monitor low-lying road "
                "underpasses."
            ),
            "why": (
                "High road exposure indicates elevated danger of "
                "stranded vehicles and blocked emergency transit "
                "corridors."
            )
        })

        advisory_actions.append(
            "evaluate traffic diversions and actively monitor "
            "flood-prone underpasses"
        )

    # --------------------------------------------------
    #     # --------------------------------------------------
    # Conflicting Evidence
    # --------------------------------------------------

    if conflict_detected:

        contextual_advisories.append({
            "type": "field_verification_advisory",
            "advisory": (
                "Recommend deploying a local ground observer "
                "or field team for physical on-site verification."
            ),
            "why": (
                "Observational conflict was detected between "
                "environmental signals and reported observations; "
                "physical verification is required to reduce uncertainty."
            )
        })

        advisory_actions.append(
            "deploy field observer for physical ground verification "
            "to resolve conflicting signals"
        )

    # --------------------------------------------------
    # Sensor Reliability
    # --------------------------------------------------

    if sensor_status in [
        "unreliable",
        "error",
        "degraded",
        "offline"
    ]:

        contextual_advisories.append({
            "type": "sensor_health_advisory",
            "advisory": (
                "Cross-check water depth using a manual gauge "
                "or an adjacent reliable sensor."
            ),
            "why": (
                f"Water sensor status is reported as "
                f"'{sensor_status}'; sensor data should not be "
                f"solely relied upon."
            )
        })

        advisory_actions.append(
            f"perform manual cross-check of water levels due to "
            f"'{sensor_status}' sensor status"
        )

    # Add contextual actions
    secondary_actions.extend(
        advisory_actions
    )

    # ==================================================
    # 3. EXPLAINABLE DECISION BASIS
    # ==================================================

    basis = {
        "priority": priority_level,
        "verification": verification_level,
        "risk": risk_level,
        "conflict_detected": conflict_detected,
        "critical_infrastructure_count": len(
            critical_infra
        ),
        "road_exposure": road_exposure
    }

    # ==================================================
    # 4. FINAL RECOMMENDATION
    # ==================================================

    return {

        "action": action,

        "secondary_actions": secondary_actions,

        "contextual_advisories": contextual_advisories,

        # Governance constraints
        "autonomous_dispatch": False,

        "human_review_required": True,

        # Explainable basis
        "basis": basis,

        "reason": (
            f"Recommendation is based on {priority_level} priority, "
            f"{verification_level} verification, and "
            f"{risk_level} risk."
        )
    }