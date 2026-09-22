import type { IncidentInput, RiskLevel, PriorityLevel, Severity } from "../types/domain";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const level = (score: number): RiskLevel => score >= 76 ? "CRITICAL" : score >= 51 ? "HIGH" : score >= 26 ? "MODERATE" : "LOW";
export function calculateRisk(input: Partial<IncidentInput> & Record<string, any>) {
  const rainfall = clamp((Number(input.rainfall ?? 0) / 200) * 30);
  const warning = input.officialWarning ? 25 : 0;
  const river = clamp((Number(input.riverLevel ?? 0) / 10) * 20);
  const population = clamp((Number(input.affectedPopulation ?? 0) / 10000) * 10);
  const infrastructure = clamp((Number(input.affectedInfrastructure ?? 0) / 100) * 10);
  const citizenReports = clamp((Number(input.citizenReports ?? 0) / 10) * 5);
  const score = clamp(rainfall + warning + river + population + infrastructure + citizenReports);
  return { score, level: level(score), factors: { rainfall, officialWarning: warning, river, population, infrastructure, citizenReports }, explanation: [
    rainfall ? `Rainfall contributes ${rainfall}/30` : "No rainfall observation supplied",
    warning ? "An official warning is present" : "No official warning supplied",
    river ? `River risk contributes ${river}/20` : "No river observation supplied",
  ] };
}
export function calculateEvidence(input: Record<string, any>) {
  const factors = { official: input.official ? 30 : 0, independentSources: Math.min(20, Number(input.independentSources ?? 0) * 5), citizenReports: Math.min(15, Number(input.citizenReports ?? 0) * 3), photo: input.photo ? 15 : 0, freshness: input.fresh ? 10 : 0, conflicts: -Math.min(20, Number(input.conflicts ?? 0) * 5), duplicates: -Math.min(15, Number(input.duplicates ?? 0) * 3) };
  const score = clamp(Object.values(factors).reduce((sum, value) => sum + value, 0));
  return { score, level: level(score), sources: input.sources ?? [], conflicts: input.conflictDetails ?? [], explanation: Object.entries(factors).filter(([, value]) => value !== 0).map(([key, value]) => `${key}: ${value > 0 ? "+" : ""}${value}`) };
}
const priorityLevel = (score: number): PriorityLevel => score >= 76 ? "URGENT" : score >= 51 ? "HIGH" : score >= 26 ? "MEDIUM" : "LOW";
export function calculatePriority(input: Record<string, any>) {
  const severity: Record<Severity, number> = { LOW: 0, MODERATE: 10, HIGH: 20, CRITICAL: 30 };
  const score = clamp(Number(input.riskScore ?? 0) * 0.4 + Number(input.evidenceScore ?? 0) * 0.2 + Math.min(20, Number(input.affectedPopulation ?? 0) / 500) + Math.min(15, Number(input.affectedInfrastructure ?? 0) / 10) + (severity[input.severity as Severity] ?? 0) + (input.officialWarning ? 10 : 0) + (input.recent ? 5 : 0));
  return { score, level: priorityLevel(score), reasons: ["risk score", "evidence confidence", "exposure", ...(input.officialWarning ? ["official warning"] : [])] };
}
export const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const r = 6371000, rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};