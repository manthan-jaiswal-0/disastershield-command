export type Priority = "P1" | "P2" | "P3";

export const LIFECYCLE = [
  "Detect",
  "Verify",
  "Assess",
  "Prioritize",
  "Recommend",
  "Approve",
  "Respond",
  "Monitor",
  "Resolve",
] as const;

export type Stage = (typeof LIFECYCLE)[number];

export type EvidenceKind = "official" | "citizen" | "image" | "gis" | "historical";

export type Evidence = {
  id: string;
  kind: EvidenceKind;
  source: string;
  summary: string;
  detail: string;
  reliability: number; // 0-1 source reliability
  weight: number; // -1..1 contribution to verification confidence
  at: string;
  conflicting?: boolean;
};

export type CitizenReport = {
  id: string;
  by: string;
  text: string;
  ward: string;
  at: string;
  hasPhoto: boolean;
  photoNote?: string;
  waterDepthCm?: number;
  state: "queued" | "matched" | "verified" | "duplicate";
};

export type TimelineEntry = {
  id: string;
  at: string;
  stage: Stage | "Learn";
  actor: string;
  text: string;
};

export type RiskFactor = {
  label: string;
  detail: string;
  value: number; // 0-100 normalised contribution
  weight: number; // share of total score
};

export type Recommendation = {
  headline: string;
  rationale: string;
  actions: string[];
  status: "pending" | "approved" | "modified" | "rejected";
  decidedBy?: string;
  note?: string;
};

export type Incident = {
  id: string;
  ref: string;
  title: string;
  hazard: string;
  ward: string;
  locality: string;
  coords: { x: number; y: number }; // % position on the sector map
  priority: Priority;
  priorityRationale: string[];
  stage: Stage;
  status: "open" | "monitoring" | "resolved";
  confidence: number; // 0-100
  riskScore: number; // 0-100
  populationExposed: number;
  vulnerable: string[];
  detectedAt: string;
  detectionSource: string;
  summary: string;
  rainfallMm: number[]; // last 6 hourly readings
  waterLevelCm: number[];
  evidence: Evidence[];
  reports: CitizenReport[];
  timeline: TimelineEntry[];
  factors: RiskFactor[];
  recommendation: Recommendation;
  assigned: string[]; // resource ids
  alertIssued: boolean;
  resolutionSummary?: string;
  responseMinutes?: number;
};

export type ResourceKind = "team" | "vehicle" | "hospital" | "shelter";
export type ResourceStatus =
  | "available"
  | "assigned"
  | "en_route"
  | "on_site"
  | "completed"
  | "offline";

export type Resource = {
  id: string;
  name: string;
  kind: ResourceKind;
  org: string;
  base: string;
  coords: { x: number; y: number };
  status: ResourceStatus;
  incidentId?: string;
  crew?: number;
  capacityLabel?: string;
  capacityUsed?: number;
  capacityTotal?: number;
  etaMin?: number;
  route?: string;
};

export type AlertLevel = "watch" | "warning" | "critical";

export type CitizenAlert = {
  id: string;
  incidentId?: string;
  level: AlertLevel;
  title: string;
  area: string;
  body: string;
  action: string;
  at: string;
  acknowledged: boolean;
};

export type Signal = {
  id: string;
  label: string;
  detail: string;
  ward: string;
  strength: number; // 0-100
  sources: number;
  at: string;
  promoted?: boolean;
};
