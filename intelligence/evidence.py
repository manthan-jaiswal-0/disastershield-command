def evaluate_evidence(data):
    """
    Evaluates available evidence.

    The score is an operational evidence-strength score.
    It is NOT a probability of flooding.
    """

    score = 0
    evidence_items = []

    rainfall = data.get("rainfall", {})
    water = data.get("water_environment", {})
    citizen_reports = data.get("citizen_reports", [])
    images = data.get("image_evidence", [])

    # Rainfall
    rainfall_intensity = rainfall.get("intensity_mm_per_hour", 0)
    duration_minutes = rainfall.get("duration_minutes", 60) or 60
    accumulated_mm = round(rainfall_intensity * (duration_minutes / 60.0), 1)

    if rainfall_intensity >= 50 or accumulated_mm >= 50:
        rain_score = 25 if (rainfall_intensity >= 75 or accumulated_mm >= 75) else 20
        score += rain_score

        evidence_items.append({
            "source": "rainfall",
            "strength": rain_score,
            "reason": (
                f"Rainfall signal is present: {rainfall_intensity} mm/hr "
                f"(accumulated ~{accumulated_mm} mm over {duration_minutes} min)."
            )
        })

    # Water sensor & reliability checks
    sensor_status = str(water.get("sensor_status", "valid")).lower()
    water_level = water.get("water_level")
    water_trend = water.get("trend")

    if sensor_status in ["error", "offline"]:
        evidence_items.append({
            "source": "water_environment",
            "strength": 0,
            "reason": f"Water sensor status is '{sensor_status}'; observational reliability compromised, no score awarded."
        })
    elif sensor_status in ["unreliable", "degraded"]:
        reduced_score = 10
        score += reduced_score
        evidence_items.append({
            "source": "water_environment",
            "strength": reduced_score,
            "reason": f"Water sensor status is '{sensor_status}'; discounted confidence applied."
        })
    else:
        # Valid sensor
        water_score = 0
        water_reasons = []

        if water_level is not None:
            try:
                wl = float(water_level)
                if wl >= 1.0:
                    water_score = 30
                    water_reasons.append(
                        f"Water level of {wl} m indicates hazardous flooding (>= 1.0 m threshold)."
                    )
                elif wl >= 0.5:
                    water_score = 25
                    water_reasons.append(
                        f"Water level of {wl} m indicates minor street flooding (>= 0.5 m threshold)."
                    )
            except (ValueError, TypeError):
                pass

        if water_trend == "rising":
            if water_score == 0:
                water_score = 25
            water_reasons.append("Water indicator is rising.")

        if water_score > 0:
            score += water_score
            evidence_items.append({
                "source": "water_environment",
                "strength": water_score,
                "reason": " ".join(water_reasons)
            })

    # Citizen reports
    report_count = len(citizen_reports)

    if report_count > 0:
        report_score = min(report_count * 8, 24)
        score += report_score

        evidence_items.append({
            "source": "citizen_reports",
            "strength": report_score,
            "reason": f"{report_count} citizen report(s) available."
        })

    # Image evidence
    if images:
        score += 20

        evidence_items.append({
            "source": "image_evidence",
            "strength": 20,
            "reason": "Visual evidence is available."
        })

    score = min(score, 100)

    if score >= 75:
        strength = "Strong"
    elif score >= 50:
        strength = "Moderate"
    elif score >= 25:
        strength = "Limited"
    else:
        strength = "Weak"

    return {
        "score": score,
        "strength": strength,
        "evidence_items": evidence_items
    }
