import json
import unittest
import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pydantic import ValidationError
from schemas import IncidentPayload
from detector import detect_incident
from evidence import evaluate_evidence
from verification import verify_incident
from risk import assess_risk
from priority import assign_priority
from recommendation import generate_recommendation
from main import analyze_incident
from api import app
from fastapi.testclient import TestClient


class TestDisasterShieldEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        json_path = os.path.join(os.path.dirname(__file__), "test_input.json")
        with open(json_path, "r") as f:
            cls.scenarios = json.load(f)

    # ==================================================
    # 1. API HTTP ENDPOINT TESTS (TestClient)
    # ==================================================

    def test_api_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["engine"], "DisasterShield Intelligence Engine")
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["version"], "0.2.0")
        self.assertEqual(data["mode"], "decision_support")

    def test_api_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

    def test_api_analyze_endpoint_valid_payload(self):
        payload = self.scenarios["p1_severe_flooding"]
        response = self.client.post("/api/v1/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["engine"]["version"], "0.2.0")
        self.assertEqual(data["metadata"]["incident_id"], "INC-BM-P1")
        self.assertEqual(data["priority"]["level"], "P1")
        self.assertEqual(data["recommendation"]["action"], "immediate_human_assessment")
        self.assertFalse(data["recommendation"]["autonomous_dispatch"])
        self.assertTrue(data["recommendation"]["human_review_required"])

    def test_api_analyze_endpoint_invalid_payload_returns_422(self):
        # Negative rainfall intensity violates ge=0.0 constraint
        bad_payload = {"rainfall": {"intensity_mm_per_hour": -25.0}}
        response = self.client.post("/api/v1/analyze", json=bad_payload)
        self.assertEqual(response.status_code, 422)

    def test_api_analyze_endpoint_missing_optional_fields_succeeds(self):
        payload = self.scenarios["missing_optional_fields"]
        response = self.client.post("/api/v1/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("incident", data)
        self.assertIn("recommendation", data)

    # ==================================================
    # 2. PYDANTIC SCHEMA VALIDATION TESTS
    # ==================================================

    def test_pydantic_all_benchmarks_parse_cleanly(self):
        for name, scenario in self.scenarios.items():
            payload = IncidentPayload(**scenario)
            self.assertIsNotNone(payload.incident_id, f"Scenario {name} missing incident_id")

    def test_pydantic_validation_rejects_invalid_values(self):
        # Negative duration
        with self.assertRaises(ValidationError):
            IncidentPayload(rainfall={"duration_minutes": 0})

        # Negative water level
        with self.assertRaises(ValidationError):
            IncidentPayload(water_environment={"water_level": -0.5})

        # Invalid exposure literal
        with self.assertRaises(ValidationError):
            IncidentPayload(gis={"population_exposure": "catastrophic"})

    # ==================================================
    # 3. BENCHMARK SCENARIO TESTS (P1, P2, P3)
    # ==================================================

    def test_benchmark_p1_severe_flooding(self):
        data = self.scenarios["p1_severe_flooding"]
        result = analyze_incident(data)

        self.assertEqual(result["priority"]["level"], "P1")
        self.assertEqual(result["priority"]["action"], "immediate_human_assessment")
        self.assertEqual(result["risk"]["level"], "High")
        self.assertEqual(result["verification"]["level"], "strong")

        # Contextual advisories
        advisories = result["recommendation"]["contextual_advisories"]
        self.assertTrue(any(a["type"] == "critical_infrastructure_advisory" for a in advisories))
        self.assertTrue(any(a["type"] == "traffic_and_access_advisory" for a in advisories))

    def test_benchmark_p2_elevated_risk(self):
        data = self.scenarios["p2_elevated_risk"]
        result = analyze_incident(data)

        self.assertEqual(result["priority"]["level"], "P2")
        self.assertEqual(result["priority"]["action"], "urgent_human_review")
        self.assertIn(result["risk"]["level"], ["Moderate", "High"])

        advisories = result["recommendation"]["contextual_advisories"]
        self.assertTrue(any(a["type"] == "critical_infrastructure_advisory" for a in advisories))

    def test_benchmark_p3_low_signal_monitoring(self):
        data = self.scenarios["p3_low_signal_monitoring"]
        result = analyze_incident(data)

        self.assertEqual(result["priority"]["level"], "P3")
        self.assertEqual(result["priority"]["action"], "continue_monitoring")

    # ==================================================
    # 4. CONFLICT HANDLING & SENSOR RELIABILITY TESTS
    # ==================================================

    def test_benchmark_conflicting_signals(self):
        data = self.scenarios["conflicting_signals"]
        result = analyze_incident(data)

        self.assertTrue(result["verification"]["conflict_detected"])
        self.assertTrue(any("conflicting" in r.lower() for r in result["explanation"]["verification"]["why"]))

        advisories = result["recommendation"]["contextual_advisories"]
        conflict_adv = next((a for a in advisories if a["type"] == "field_verification_advisory"), None)
        self.assertIsNotNone(conflict_adv)
        self.assertIn("ground observer", conflict_adv["advisory"].lower())

    def test_benchmark_unreliable_sensor(self):
        data = self.scenarios["unreliable_sensor"]
        result = analyze_incident(data)

        self.assertTrue(any("unreliable" in r.lower() for r in result["explanation"]["verification"]["why"]))
        advisories = result["recommendation"]["contextual_advisories"]
        sensor_adv = next((a for a in advisories if a["type"] == "sensor_health_advisory"), None)
        self.assertIsNotNone(sensor_adv)
        self.assertIn("manual gauge", sensor_adv["advisory"].lower())

    def test_benchmark_error_offline_sensor(self):
        data = self.scenarios["error_offline_sensor"]
        result = analyze_incident(data)

        self.assertTrue(any("error" in r.lower() or "untrusted" in r.lower() for r in result["explanation"]["verification"]["why"]))
        # Sensor status error should be omitted from hazard calculation
        self.assertTrue(any("omitted" in r.lower() or "error" in r.lower() for r in result["explanation"]["risk"]["why"]))

    # ==================================================
    # 5. WATER-LEVEL BOUNDARIES & PHYSICAL THRESHOLDS
    # ==================================================

    def test_benchmark_exact_threshold_0_5m(self):
        data = self.scenarios["exact_threshold_0_5m"]
        result = analyze_incident(data)

        self.assertTrue(any("minor street flooding" in r.lower() for r in result["explanation"]["detection"]["why"]))
        self.assertTrue(any("minor street flooding" in r.lower() for r in result["explanation"]["risk"]["why"]))

    def test_benchmark_exact_threshold_1_0m(self):
        data = self.scenarios["exact_threshold_1_0m"]
        result = analyze_incident(data)

        self.assertTrue(any("hazardous flooding" in r.lower() for r in result["explanation"]["detection"]["why"]))
        self.assertTrue(any("hazardous flooding" in r.lower() for r in result["explanation"]["risk"]["why"]))

    # ==================================================
    # 6. ACCUMULATED RAINFALL & BOUNDARIES
    # ==================================================

    def test_benchmark_rainfall_threshold_boundaries(self):
        # Test boundary at exactly 50.0 mm/hr
        data_50 = self.scenarios["rainfall_threshold_boundaries"]
        det_50 = detect_incident(data_50)
        self.assertTrue(det_50["detected"])
        self.assertIn("heavy_rainfall", det_50["signals"])

        # Test boundary at exactly 20.0 mm/hr (moderate hazard boundary)
        data_20 = {"rainfall": {"intensity_mm_per_hour": 20.0, "duration_minutes": 60}}
        risk_20 = assess_risk(data_20)
        self.assertEqual(risk_20["hazard_score"], 20)

        # Test boundary at exactly 75.0 mm/hr (severe hazard boundary)
        data_75 = {"rainfall": {"intensity_mm_per_hour": 75.0, "duration_minutes": 60}}
        risk_75 = assess_risk(data_75)
        self.assertEqual(risk_75["hazard_score"], 60)
        self.assertEqual(risk_75["hazard"], "High")

    def test_accumulated_rainfall_long_duration(self):
        # 30 mm/hr over 180 min = 90 mm accumulated
        data = {"rainfall": {"intensity_mm_per_hour": 30.0, "duration_minutes": 180}}
        risk = assess_risk(data)
        self.assertEqual(risk["hazard"], "High")
        self.assertEqual(risk["hazard_score"], 60)
        self.assertTrue(any("90.0 mm over 180 min" in r for r in risk["reasons"]))

    # ==================================================
    # 7. VULNERABILITY INTEGRATION
    # ==================================================

    def test_benchmark_high_vulnerability_escalation(self):
        data = self.scenarios["high_vulnerability_escalation"]
        result = analyze_incident(data)

        self.assertEqual(result["risk"]["hazard"], "Moderate")
        self.assertEqual(result["risk"]["exposure"], "Moderate")
        # Elevated to High Risk because vulnerability is high
        self.assertEqual(result["risk"]["level"], "High")
        self.assertTrue(any("elevates assessed risk" in r for r in result["explanation"]["risk"]["why"]))

    # ==================================================
    # 8. GOVERNANCE INVARIANTS ACROSS ALL BENCHMARKS
    # ==================================================

    def test_governance_invariants_across_all_benchmarks(self):
        for name, scenario in self.scenarios.items():
            res = analyze_incident(scenario)

            # Invariant 1: No autonomous emergency dispatch
            self.assertFalse(
                res["recommendation"]["autonomous_dispatch"],
                f"Scenario '{name}' violated autonomous_dispatch == False"
            )

            # Invariant 2: Human review is mandatory
            self.assertTrue(
                res["recommendation"]["human_review_required"],
                f"Scenario '{name}' violated human_review_required == True"
            )

            # Invariant 3: Disclaimers / limitations present
            self.assertTrue(
                len(res.get("limitations", [])) >= 5,
                f"Scenario '{name}' missing safety limitations"
            )

            # Invariant 4: Every decision explains why
            self.assertIn("explanation", res, f"Scenario '{name}' missing explanation")
            if res.get("status") == "no_emerging_incident":
                self.assertIn("detection", res["explanation"])
            else:
                for module in ["detection", "evidence", "verification", "risk", "priority", "recommendation"]:
                    self.assertIn(module, res["explanation"], f"Scenario '{name}' missing explanation for {module}")

    def test_no_emerging_incident_early_exit(self):
        data = self.scenarios["no_incident_signal"]
        res = analyze_incident(data)
        self.assertEqual(res["status"], "no_emerging_incident")
        self.assertEqual(res["recommendation"]["action"], "continue_monitoring")
        self.assertFalse(res["recommendation"]["autonomous_dispatch"])
        self.assertTrue(res["recommendation"]["human_review_required"])
        self.assertEqual(len(res["limitations"]), 6)
        self.assertTrue(any("decision-support only" in lim for lim in res["limitations"]))


if __name__ == "__main__":
    unittest.main()
