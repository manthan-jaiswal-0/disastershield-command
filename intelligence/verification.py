def verify_incident(data, evidence):
    """
    Verify an emerging urban flooding incident
    using multiple observed evidence sources.

    This is an operational verification score,
    NOT a scientifically validated probability.
    """

    score = 0
    reasons = []

    # ==========================================
    # SOURCE AVAILABILITY
    # ==========================================

    rainfall = data.get("rainfall", {})
    water = data.get("water_environment", {})
    citizen_reports = data.get("citizen_reports", [])
    image_evidence = data.get("image_evidence", [])

    source_count = 0

    # ==========================================
    # 1. RAINFALL SIGNAL
    # ==========================================

    rainfall_intensity = rainfall.get(
        "intensity_mm_per_hour",
        0
    )

    duration_minutes = rainfall.get(
        "duration_minutes",
        60
    ) or 60

    accumulated_mm = round(
        rainfall_intensity * (duration_minutes / 60.0),
        1
    )

    if rainfall_intensity >= 50 or accumulated_mm >= 50:
        score += 20
        source_count += 1

        reasons.append(
            f"Heavy rainfall provides an independent weather signal "
            f"({rainfall_intensity} mm/hr, ~{accumulated_mm} mm over {duration_minutes} min)."
        )

    # ==========================================
    # 2. WATER / ENVIRONMENT SIGNAL & SENSOR HEALTH
    # ==========================================

    sensor_status = str(
        water.get("sensor_status", "valid")
    ).lower()

    water_level = water.get("water_level")
    water_trend = water.get("trend")

    if sensor_status in ["error", "offline"]:
        score -= 15
        reasons.append(
            f"Water sensor health is '{sensor_status}'; sensor readings are untrusted, reducing verification confidence."
        )
    elif sensor_status in ["unreliable", "degraded"]:
        score -= 10
        reasons.append(
            f"Water sensor health is '{sensor_status}'; questionable sensor reliability reduces verification confidence."
        )
    else:
        # Valid sensor health
        water_signal_applied = False

        if water_level is not None:
            try:
                wl = float(water_level)
                if wl >= 1.0:
                    score += 25
                    source_count += 1
                    water_signal_applied = True
                    reasons.append(
                        f"Water level of {wl} m provides physical environmental evidence of hazardous flooding (>= 1.0 m threshold)."
                    )
                elif wl >= 0.5:
                    score += 20
                    source_count += 1
                    water_signal_applied = True
                    reasons.append(
                        f"Water level of {wl} m provides physical environmental evidence of minor street flooding (>= 0.5 m threshold)."
                    )
            except (ValueError, TypeError):
                pass

        if water_trend == "rising":
            if not water_signal_applied:
                score += 25
                source_count += 1
            reasons.append(
                "Rising water indicator provides environmental evidence."
            )

    # ==========================================
    # 3. CITIZEN REPORTS
    # ==========================================

    report_count = len(citizen_reports)

    if report_count >= 3:
        score += 25
        source_count += 1

        reasons.append(
            f"{report_count} citizen reports provide corroborating observations."
        )

    elif report_count >= 1:
        score += 10
        source_count += 1

        reasons.append(
            f"{report_count} citizen report provides supporting evidence."
        )

    # ==========================================
    # 4. IMAGE EVIDENCE
    # ==========================================

    if len(image_evidence) > 0:

        score += 20
        source_count += 1

        reasons.append(
            "Visual evidence provides direct supporting information."
        )

    # ==========================================
    # 5. EVIDENCE STRENGTH ADJUSTMENT
    # ==========================================

    evidence_strength = str(
        evidence.get("strength", "weak")
    ).lower()

    if evidence_strength == "strong":
        score += 5

        reasons.append(
            "Overall evidence strength is strong."
        )

    elif evidence_strength == "weak":
        score -= 10

        reasons.append(
            "Evidence strength is weak, reducing verification confidence."
        )

    # ==========================================
    # 6. CONFLICT DETECTION
    # ==========================================

    conflict_detected = False

    # Example conflict:
    # rainfall is low while citizen reports and
    # water signals indicate flooding.

    if (
        rainfall_intensity < 10
        and
        (
            water.get("trend") == "rising"
            or report_count >= 2
            or len(image_evidence) >= 1
        )
    ):
        conflict_detected = True

        score -= 15

        reasons.append(
            "Conflicting signals detected between rainfall and other observations."
        )

    # Keep score within operational range

    score = max(
        0,
        min(score, 100)
    )

    # ==========================================
    # 7. VERIFICATION LEVEL
    # ==========================================

    if conflict_detected:

        if score >= 60:
            level = "moderate"
        else:
            level = "weak"

    else:

        if score >= 70:
            level = "strong"

        elif score >= 40:
            level = "moderate"

        else:
            level = "weak"

    # ==========================================
    # 8. SOURCE DIVERSITY
    # ==========================================

    if source_count >= 4:
        source_diversity = "high"

    elif source_count >= 2:
        source_diversity = "moderate"

    elif source_count == 1:
        source_diversity = "low"

    else:
        source_diversity = "none"

    # ==========================================
    # 9. FINAL OUTPUT
    # ==========================================

    return {
        "score": score,
        "level": level,
        "source_diversity": source_diversity,
        "conflict_detected": conflict_detected,
        "reasons": reasons
    }