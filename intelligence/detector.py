def detect_incident(data):
    """
    Detect an emerging urban flooding incident
    using observed signals.

    This is NOT flood prediction.
    It only identifies whether available
    observations indicate a possible incident.
    """

    signals = []
    reasons = []

    # ==========================================
    # 1. RAINFALL / WEATHER
    # ==========================================

    rainfall = data.get("rainfall", {})

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

    if rainfall_intensity >= 50:
        signals.append("heavy_rainfall")

        reasons.append(
            f"Heavy rainfall observed: "
            f"{rainfall_intensity} mm/hour "
            f"(accumulated ~{accumulated_mm} mm over {duration_minutes} min)."
        )
    elif accumulated_mm >= 50:
        signals.append("heavy_rainfall")

        reasons.append(
            f"Significant accumulated rainfall: "
            f"{accumulated_mm} mm over {duration_minutes} min."
        )

    # ==========================================
    # 2. WATER / ENVIRONMENT
    # ==========================================

    water = data.get(
        "water_environment",
        {}
    )

    water_trend = water.get("trend")
    water_level = water.get("water_level")
    sensor_status = str(
        water.get("sensor_status", "valid")
    ).lower()

    if sensor_status in ["error", "offline"]:
        reasons.append(
            f"Water sensor status is '{sensor_status}'; sensor signal disregarded."
        )
    else:
        # Check physical water level thresholds
        if water_level is not None:
            try:
                wl = float(water_level)
                if wl >= 1.0:
                    signals.append("hazardous_water_level")
                    reasons.append(
                        f"Water level reached {wl} m (>= 1.0 m hazardous flooding indicator)."
                    )
                elif wl >= 0.5:
                    signals.append("elevated_water_level")
                    reasons.append(
                        f"Water level reached {wl} m (>= 0.5 m minor street flooding indicator)."
                    )
            except (ValueError, TypeError):
                pass

        if water_trend == "rising":
            signals.append("rising_water")

            reasons.append(
                "Water/environmental indicator "
                "is showing a rising trend."
            )

    # ==========================================
    # 3. CITIZEN REPORTS
    # ==========================================

    citizen_reports = data.get(
        "citizen_reports",
        []
    )

    if len(citizen_reports) >= 1:

        signals.append("citizen_reports")

        reasons.append(
            f"{len(citizen_reports)} citizen "
            f"report(s) received."
        )

    # ==========================================
    # 4. IMAGE EVIDENCE
    # ==========================================

    image_evidence = data.get(
        "image_evidence",
        []
    )

    if len(image_evidence) >= 1:

        signals.append("visual_evidence")

        reasons.append(
            f"{len(image_evidence)} image "
            f"evidence item(s) available."
        )

    # ==========================================
    # 5. DETECTION DECISION
    # ==========================================

    detected = len(signals) > 0

    if detected:
        incident_type = "potential_urban_flooding"
        status = "emerging"
    else:
        incident_type = None
        status = "no_sufficient_signal"

    # ==========================================
    # 6. OUTPUT
    # ==========================================

    return {
        "detected": detected,

        "incident_type": incident_type,

        "status": status,

        "signals": signals,

        "reasons": reasons
    }