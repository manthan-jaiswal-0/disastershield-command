import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateEvidence, calculatePriority, calculateRisk, distanceMeters } from "./engines";

describe("DisasterShield scoring engines", () => {
  it("calculates a bounded high-risk score with transparent factors", () => {
    const result = calculateRisk({ rainfall: 180, officialWarning: true, riverLevel: 8, affectedPopulation: 5000, affectedInfrastructure: 50, citizenReports: 5 });
    assert.ok(result.score >= 76);
    assert.equal(result.level, "CRITICAL");
    assert.equal(Object.keys(result.factors).length, 6);
  });
  it("reduces evidence for conflicts and duplicates", () => {
    const result = calculateEvidence({ official: true, independentSources: 2, photo: true, fresh: true, conflicts: 2, duplicates: 1 });
    assert.ok(result.score < 100);
    assert.equal(result.explanation.some((line) => line.startsWith("conflicts")), true);
  });
  it("returns an urgent priority for high exposure and risk", () => {
    const result = calculatePriority({ riskScore: 90, evidenceScore: 90, affectedPopulation: 10000, affectedInfrastructure: 100, severity: "CRITICAL", officialWarning: true, recent: true });
    assert.equal(result.level, "URGENT");
  });
  it("calculates geographic distance in meters", () => {
    assert.ok(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) > 100000);
  });
});