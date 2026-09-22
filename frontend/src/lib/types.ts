/**
 * DisasterShield Kurla West Demo Operational Viewport
 * 
 * IMPORTANT: This represents the frontend visualization extent (viewport) 
 * for the stylized SectorMap. It is NOT an authoritative administrative boundary
 * of Kurla West. It expects canonical WGS84 input coordinates and projects
 * them into the CSS 0-100% space.
 */
export const MAP_BOUNDS = {
  minLng: 72.860,
  maxLng: 72.900,
  minLat: 19.060,
  maxLat: 19.090,
};

/**
 * Projects a canonical WGS84 coordinate into CSS percentages (0-100%)
 * bounded by the Kurla West demo viewport.
 */
export function projectWGS84ToCSS(latitude: number, longitude: number): { x: number; y: number } {
  if (
    typeof latitude !== "number" || typeof longitude !== "number" ||
    isNaN(latitude) || isNaN(longitude) ||
    !isFinite(latitude) || !isFinite(longitude)
  ) {
    // Fallback safely to center if malformed
    return { x: 50, y: 50 };
  }

  // Linear projection
  let x = ((longitude - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  // Y is inverted: latitude increases North, but CSS top: 0% is North
  let y = ((MAP_BOUNDS.maxLat - latitude) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;

  // Clamp safely to SectorMap limits to avoid CSS overflowing visual bounds
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));

  return { x, y };
}

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

/**
 * Fine-grained incident status that maps onto the broader Stage.
 * The UI displays the Stage for the workflow stepper, but operations
 * use IncidentStatus for precise state transitions.
 */
export const INCIDENT_STATUSES = [
  "detected",
  "verifying",
  "verified",
  "prioritized",
  "awaiting_approval",
  "approved",
  "resources_assigned",
  "dispatched",
  "on_scene",
  "mitigating",
  "resolved",
  "rejected",
  "closed",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** Map an IncidentStatus to the corresponding lifecycle Stage */
export function statusToStage(status: IncidentStatus): Stage {
  switch (status) {
    case "detected":
      return "Detect";
    case "verifying":
    case "verified":
      return "Verify";
    case "prioritized":
      return "Prioritize";
    case "awaiting_approval":
      return "Recommend";
    case "approved":
      return "Approve";
    case "resources_assigned":
    case "dispatched":
    case "on_scene":
    case "mitigating":
      return "Respond";
    case "resolved":
    case "closed":
      return "Resolve";
    case "rejected":
      return "Approve";
  }
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected",
  verifying: "Verifying",
  verified: "Verified",
  prioritized: "Prioritized",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  resources_assigned: "Resources Assigned",
  dispatched: "Dispatched",
  on_scene: "On Scene",
  mitigating: "Mitigating",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};

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

/**
 * Responder status tracks the lifecycle of a single resource assignment.
 */
export const RESPONDER_STATUSES = [
  "assigned",
  "en_route",
  "on_scene",
  "assisting",
  "completed",
] as const;

export type ResponderStatus = (typeof RESPONDER_STATUSES)[number];

export const RESPONDER_STATUS_LABELS: Record<ResponderStatus, string> = {
  assigned: "Assigned",
  en_route: "En Route",
  on_scene: "On Scene",
  assisting: "Assisting",
  completed: "Completed",
};

/**
 * Resolution captures how an incident was closed.
 */
export type Resolution = {
  resolvedAt: string;
  reason: string;
  resourcesUsed: string[];
  responderNotes: string;
  impactSummary: string;
  responseMinutes: number;
};

export type Incident = {
  id: string;
  ref: string;
  title: string;
  hazard: string;
  ward: string;
  locality: string;
  latitude?: number; // Canonical WGS84
  longitude?: number; // Canonical WGS84
  coords: { x: number; y: number }; // % position on the sector map
  priority: Priority;
  priorityRationale: string[];
  stage: Stage;
  incidentStatus: IncidentStatus;
  status: "open" | "monitoring" | "resolved";
  confidence?: number; // 0-100
  riskScore?: number; // 0-100
  populationExposed?: number;
  vulnerable?: string[];
  gisProvenance?: any[];
  detectedAt?: string;
  detectionSource?: string;
  summary?: string;
  rainfallMm?: number[]; // last 6 hourly readings
  waterLevelCm?: number[];
  evidence?: Evidence[];
  reports?: CitizenReport[];
  timeline: TimelineEntry[];
  factors?: RiskFactor[];
  recommendation: Recommendation;
  assigned: string[]; // resource ids
  alertIssued: boolean;
  resolution?: Resolution;
  resolutionSummary?: string;
  responseMinutes?: number;
};

export type ResourceKind =
  | "team"
  | "vehicle"
  | "hospital"
  | "shelter"
  | "boat"
  | "relief";

export type ResourceStatus =
  | "available"
  | "assigned"
  | "en_route"
  | "on_site"
  | "assisting"
  | "completed"
  | "offline";

export type Resource = {
  id: string;
  name: string;
  kind: ResourceKind;
  type?: string; // specific type label e.g. "Rescue Team", "Ambulance", "Fire Response"
  org: string;
  base: string;
  latitude?: number;
  longitude?: number;
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
