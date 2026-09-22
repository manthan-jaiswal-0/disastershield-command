def assign_priority(data, verification, risk):
    """
    Assign operational P1/P2/P3 priority.

    P1 = Immediate human assessment
    P2 = Urgent human review
    P3 = Continue monitoring

    These are operational decision-support categories,
    not scientifically validated probabilities.
    """

    verification_level = verification.get("level", "weak")
    risk_level = risk.get("level", "Low")
    exposure = risk.get("exposure", "low")
    vulnerability = risk.get("vulnerability", "low")

    rainfall = data.get("rainfall", {})
    water = data.get("water_environment", {})
    citizen_reports = data.get("citizen_reports", [])
    image_evidence = data.get("image_evidence", [])
    gis = data.get("gis", {})

    rainfall_intensity = rainfall.get(
        "intensity_mm_per_hour",
        0
    )

    # Support the actual input format: trend = "rising"
    # Also supports rising = true if supplied.
    rising_water = (
        water.get("rising", False)
        or str(water.get("trend", "")).lower() == "rising"
    )

    critical_infrastructure = gis.get(
        "critical_infrastructure",
        []
    )

    high_vulnerability = (
        str(vulnerability).lower() == "high"
    )

    # ==================================================
    # SEVERITY INDICATORS
    # ==================================================

    severity_indicators = 0

    if risk_level == "High":
        severity_indicators += 1

    if exposure == "high":
        severity_indicators += 1

    if critical_infrastructure:
        severity_indicators += 1

    if rainfall_intensity >= 75:
        severity_indicators += 1

    if rising_water:
        severity_indicators += 1

    if len(citizen_reports) >= 3:
        severity_indicators += 1

    if image_evidence:
        severity_indicators += 1

    if high_vulnerability:
        severity_indicators += 1

    # ==================================================
    # EXPLAINABLE REASONS
    # ==================================================

    reasons = []

    if risk_level == "High":
        reasons.append(
            "Overall assessed risk is High."
        )

    if exposure == "high":
        reasons.append(
            "Population or infrastructure exposure is High."
        )

    if critical_infrastructure:
        reasons.append(
            "Critical infrastructure is potentially affected."
        )

    if rainfall_intensity >= 75:
        reasons.append(
            f"Heavy rainfall intensity is "
            f"{rainfall_intensity} mm/hour."
        )

    elif rainfall_intensity >= 50:
        reasons.append(
            f"Elevated rainfall intensity is "
            f"{rainfall_intensity} mm/hour."
        )

    if rising_water:
        reasons.append(
            "Water/environmental indicator is rising."
        )

    if len(citizen_reports) >= 3:
        reasons.append(
            f"{len(citizen_reports)} citizen reports "
            "support the incident."
        )

    elif len(citizen_reports) >= 1:
        reasons.append(
            f"{len(citizen_reports)} citizen report "
            "supports the incident."
        )

    if image_evidence:
        reasons.append(
            "Visual evidence is available."
        )

    if high_vulnerability:
        reasons.append(
            "High vulnerability may increase potential consequences."
        )

    if verification_level == "strong":
        reasons.append(
            "Multiple evidence sources provide strong verification."
        )

    elif verification_level == "moderate":
        reasons.append(
            "Available evidence provides moderate verification."
        )

    # ==================================================
    # P1 — IMMEDIATE HUMAN ASSESSMENT
    # ==================================================

    if (
        risk_level == "High"
        and verification_level == "strong"
        and severity_indicators >= 4
    ):
        level = "P1"
        action = "immediate_human_assessment"

    # ==================================================
    # P2 — URGENT HUMAN REVIEW
    # ==================================================

    elif (
        risk_level in ["High", "Moderate"]
        and verification_level in ["strong", "moderate"]
        and (
            exposure in ["high", "moderate"]
            or rising_water
            or rainfall_intensity >= 50
            or len(citizen_reports) >= 1
            or bool(image_evidence)
            or high_vulnerability
        )
    ):
        level = "P2"
        action = "urgent_human_review"

    # ==================================================
    # P3 — CONTINUE MONITORING
    # ==================================================

    else:
        level = "P3"
        action = "continue_monitoring"

    # ==================================================
    # ADD FINAL PRIORITY REASON
    # ==================================================

    if level == "P1":
        reasons.append(
            "Priority P1 is assigned because High risk, strong "
            "verification, and multiple severity indicators "
            "meet the immediate human-assessment rule."
        )

    elif level == "P2":
        reasons.append(
            "Priority P2 is assigned because the incident has "
            "Moderate/High risk with sufficient supporting "
            "evidence and an exposure or hazard indicator."
        )

    else:
        reasons.append(
            "Priority P3 is assigned because the available "
            "evidence and risk indicators do not meet the "
            "P1 or P2 thresholds."
        )

    return {
        "level": level,
        "action": action,
        "reasons": reasons,
        "decision_basis": {
            "verification": verification_level,
            "risk": risk_level,
            "exposure": exposure,
            "vulnerability": vulnerability,
            "critical_infrastructure": bool(
                critical_infrastructure
            ),
            "rainfall_intensity_mm_per_hour": rainfall_intensity,
            "rising_water": rising_water,
            "citizen_report_count": len(
                citizen_reports
            ),
            "visual_evidence": bool(
                image_evidence
            ),
            "severity_indicator_count": severity_indicators
        }
    }