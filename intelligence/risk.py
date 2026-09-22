def assess_risk(data):
    """
    Assess operational risk using:
    HAZARD + EXPOSURE + VULNERABILITY

    This is an operational decision-support indicator,
    not a scientifically validated probability.
    """

    rainfall = data.get("rainfall", {})
    water = data.get("water_environment", {})
    gis = data.get("gis", {})

    rainfall_intensity = rainfall.get(
        "intensity_mm_per_hour",
        0
    )

    water_trend = water.get(
        "trend",
        "stable"
    )

    population_exposure = gis.get(
        "population_exposure",
        "low"
    )

    road_exposure = gis.get(
        "road_exposure",
        "low"
    )

    critical_infrastructure = gis.get(
        "critical_infrastructure",
        []
    )

    vulnerability = gis.get(
        "vulnerability",
        "low"
    )

    # ==========================================
    # HAZARD
    # ==========================================

    hazard_score = 0
    hazard_reasons = []

    duration_minutes = rainfall.get(
        "duration_minutes",
        60
    ) or 60

    accumulated_mm = round(
        rainfall_intensity * (duration_minutes / 60.0),
        1
    )

    if rainfall_intensity >= 75 or accumulated_mm >= 75:
        hazard_score += 60
        hazard_reasons.append(
            f"Severe rainfall observed: {rainfall_intensity} mm/hr "
            f"(accumulated ~{accumulated_mm} mm over {duration_minutes} min)."
        )

    elif rainfall_intensity >= 50 or accumulated_mm >= 50:
        hazard_score += 40
        hazard_reasons.append(
            f"High rainfall observed: {rainfall_intensity} mm/hr "
            f"(accumulated ~{accumulated_mm} mm over {duration_minutes} min)."
        )

    elif rainfall_intensity >= 20 or accumulated_mm >= 20:
        hazard_score += 20
        hazard_reasons.append(
            f"Moderate rainfall observed: {rainfall_intensity} mm/hr "
            f"(accumulated ~{accumulated_mm} mm over {duration_minutes} min)."
        )

    water_level = water.get("water_level")
    sensor_status = str(
        water.get("sensor_status", "valid")
    ).lower()

    if sensor_status in ["error", "offline"]:
        hazard_reasons.append(
            f"Water sensor status is '{sensor_status}'; sensor reading omitted from hazard calculation."
        )
    elif sensor_status in ["unreliable", "degraded"]:
        hazard_score += 15
        hazard_reasons.append(
            f"Water sensor status is '{sensor_status}'; discounted hazard contribution applied."
        )
    else:
        # Valid sensor
        water_hazard_added = False
        if water_level is not None:
            try:
                wl = float(water_level)
                if wl >= 1.0:
                    hazard_score += 40
                    water_hazard_added = True
                    hazard_reasons.append(
                        f"Physical water level {wl} m reaches hazardous flooding threshold (>= 1.0 m indicator)."
                    )
                elif wl >= 0.5:
                    hazard_score += 25
                    water_hazard_added = True
                    hazard_reasons.append(
                        f"Physical water level {wl} m reaches minor street flooding threshold (>= 0.5 m indicator)."
                    )
            except (ValueError, TypeError):
                pass

        if water_trend == "rising":
            if not water_hazard_added:
                hazard_score += 30
            hazard_reasons.append(
                "Rising water level strengthens the environmental hazard signal."
            )

    hazard_score = min(
        hazard_score,
        100
    )

    if hazard_score >= 60:
        hazard_level = "High"

    elif hazard_score >= 30:
        hazard_level = "Moderate"

    else:
        hazard_level = "Low"

    # ==========================================
    # EXPOSURE
    # ==========================================

    exposure_score = 0
    exposure_reasons = []

    if population_exposure == "high":
        exposure_score += 45
        exposure_reasons.append(
            "High population exposure increases potential human impact."
        )

    elif population_exposure == "moderate":
        exposure_score += 25
        exposure_reasons.append(
            "Moderate population exposure indicates potential human impact."
        )

    if road_exposure == "high":
        exposure_score += 25
        exposure_reasons.append(
            "High road exposure may affect mobility and access."
        )

    elif road_exposure == "moderate":
        exposure_score += 15
        exposure_reasons.append(
            "Moderate road exposure may affect mobility."
        )

    if len(critical_infrastructure) > 0:
        exposure_score += 30
        exposure_reasons.append(
            "Critical infrastructure is present in the exposed area."
        )

    exposure_score = min(
        exposure_score,
        100
    )

    if exposure_score >= 60:
        exposure_level = "High"

    elif exposure_score >= 30:
        exposure_level = "Moderate"

    else:
        exposure_level = "Low"

    # ==========================================
    # VULNERABILITY
    # ==========================================

    vulnerability_reasons = []

    if vulnerability == "high":
        vulnerability_reasons.append(
            "High vulnerability may increase potential consequences."
        )

    elif vulnerability == "moderate":
        vulnerability_reasons.append(
            "Moderate vulnerability may increase potential consequences."
        )

    else:
        vulnerability_reasons.append(
            "Low vulnerability indicates comparatively lower potential consequences."
        )

    # ==========================================
    # OVERALL RISK
    # ==========================================

    vulnerability_lower = str(vulnerability).lower()
    vulnerability_elevation_reason = None

    if (
        hazard_level == "High"
        and exposure_level == "High"
    ):
        risk_level = "High"

    elif (
        hazard_level == "High"
        and exposure_level in ["Moderate", "Low"]
    ):
        if vulnerability_lower == "high":
            risk_level = "High"
            vulnerability_elevation_reason = (
                "High area vulnerability elevates assessed risk from Moderate to High."
            )
        else:
            risk_level = "Moderate"

    elif (
        hazard_level == "Moderate"
        and exposure_level == "High"
    ):
        if vulnerability_lower in ["high", "moderate"]:
            risk_level = "High"
            vulnerability_elevation_reason = (
                "Area vulnerability elevates assessed risk from Moderate to High."
            )
        else:
            risk_level = "Moderate"

    elif (
        hazard_level == "Moderate"
        and exposure_level == "Moderate"
    ):
        if vulnerability_lower == "high":
            risk_level = "High"
            vulnerability_elevation_reason = (
                "High area vulnerability elevates assessed risk from Moderate to High."
            )
        else:
            risk_level = "Moderate"

    elif (
        hazard_level == "Moderate"
        and exposure_level == "Low"
    ):
        if vulnerability_lower == "high":
            risk_level = "Moderate"
            vulnerability_elevation_reason = (
                "High area vulnerability elevates assessed risk from Low to Moderate."
            )
        else:
            risk_level = "Low"

    else:
        risk_level = "Low"

    if vulnerability_elevation_reason:
        vulnerability_reasons.append(vulnerability_elevation_reason)

    # ==========================================
    # HUMAN IMPACT
    # ==========================================

    human_impact_reasons = []
    if str(population_exposure).lower() == "high":
        human_impact_reasons.append(
            "High population exposure increases potential human impact."
        )
    elif str(population_exposure).lower() == "moderate":
        human_impact_reasons.append(
            "Moderate population exposure indicates potential human impact."
        )
    else:
        human_impact_reasons.append(
            "Low population exposure indicates comparatively lower direct human impact."
        )

    human_impact = {
        "population_exposure": population_exposure,
        "potential_impact_level": exposure_level,
        "why": human_impact_reasons
    }

    # ==========================================
    # INFRASTRUCTURE IMPACT
    # ==========================================

    infrastructure_reasons = []
    if str(road_exposure).lower() == "high":
        infrastructure_reasons.append(
            "High road exposure may affect mobility and access."
        )
    elif str(road_exposure).lower() == "moderate":
        infrastructure_reasons.append(
            "Moderate road exposure may affect mobility."
        )

    if len(critical_infrastructure) > 0:
        infrastructure_reasons.append(
            f"Critical infrastructure present: {', '.join(critical_infrastructure)}."
        )
    else:
        infrastructure_reasons.append(
            "No critical infrastructure identified in the immediate area."
        )

    infrastructure_impact = {
        "critical_infrastructure_present":
            len(critical_infrastructure) > 0,

        "critical_infrastructure":
            critical_infrastructure,

        "road_exposure":
            road_exposure,

        "why": infrastructure_reasons
    }

    # ==========================================
    # FINAL RESULT
    # ==========================================

    return {
        "level": risk_level,

        "hazard": hazard_level,

        "exposure": exposure_level,

        "vulnerability": vulnerability,

        "hazard_score": hazard_score,

        "exposure_score": exposure_score,

        "human_impact": human_impact,

        "infrastructure_impact":
            infrastructure_impact,

        "reasons":
            hazard_reasons
            + exposure_reasons
            + vulnerability_reasons
            + [
                f"Overall assessed risk is {risk_level}."
            ]
    }