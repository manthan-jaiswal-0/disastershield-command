export const imageClassifier = { available: false, reason: "AI provider not configured", async analyzeIncidentImage() { return { available: false, reason: "AI provider not configured" }; } };
export const reportClassifier = { available: false, reason: "AI provider not configured" };
export const incidentSimilarity = { available: false, reason: "AI provider not configured" };
export * from "./intelligence";