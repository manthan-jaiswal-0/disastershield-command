export type Role = "CITIZEN" | "RESPONDER" | "ADMIN";
export type IncidentStatus = "DETECTED" | "VERIFYING" | "VERIFIED" | "PRIORITIZED" | "AWAITING_APPROVAL" | "APPROVED" | "RESPONDING" | "RESOLVED" | "REJECTED" | "CLOSED";
export type Severity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Priority = "P1" | "P2" | "P3";
export type DataMode = "DEMO" | "LIVE";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface IncidentInput extends Coordinates {
  title: string;
  description: string;
  type: string;
  severity?: Severity;
  address?: string;
  district?: string;
  state?: string;
  affectedPopulation?: number;
  affectedInfrastructure?: number;
  rainfall?: number;
  riverLevel?: number;
  officialWarning?: boolean;
  metadata?: Record<string, unknown>;
}
export type ResourceAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "OFFLINE";
export type ResponderStatus = "ASSIGNED" | "EN_ROUTE" | "ON_SCENE" | "ASSISTING" | "COMPLETED";

export interface ResourceAssignment {
  assignmentId: string;
  resourceId: string;
  status: ResponderStatus;
  assignedAt: string;
}
