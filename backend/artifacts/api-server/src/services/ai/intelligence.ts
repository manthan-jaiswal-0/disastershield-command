import { z } from "zod";
import type { IncidentInput } from "../../types/domain";

// --- INTELLIGENCE REQUEST TYPES (from schemas.py) ---

export interface LocationMetadata {
  location_id?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
}

export interface RainfallInput {
  intensity_mm_per_hour: number;
  duration_minutes?: number;
  trend?: "high" | "rising" | "stable" | "decreasing";
}

export interface WaterEnvironmentInput {
  water_level?: number;
  water_level_unit?: string;
  trend?: "rising" | "stable" | "falling" | "unknown";
  sensor_status?: "valid" | "unreliable" | "degraded" | "error" | "offline" | "unknown";
}

export interface CitizenReportInput {
  id?: string;
  report: string;
  timestamp?: string;
}

export interface ImageEvidenceInput {
  id?: string;
  assessment: string;
  quality?: string;
  timestamp?: string;
}

export interface GISInput {
  population_exposure?: "high" | "moderate" | "low";
  road_exposure?: "high" | "moderate" | "low";
  critical_infrastructure?: string[];
  vulnerability?: "high" | "moderate" | "low";
}

export interface IncidentPayload {
  incident_id?: string;
  timestamp?: string;
  location?: LocationMetadata;
  rainfall?: RainfallInput;
  water_environment?: WaterEnvironmentInput;
  citizen_reports?: CitizenReportInput[];
  image_evidence?: ImageEvidenceInput[];
  gis?: GISInput;
}

// --- INTELLIGENCE RESPONSE TYPES (from main.py) ---

export interface IntelligenceResponse {
  engine: { name: string; version: string; mode: string };
  metadata: { incident_id?: string; timestamp?: string; location?: any };
  incident?: { type: string; status: string };
  verification: {
    score: number;
    level: string;
    evidence_strength: string;
    source_diversity: string;
    conflict_detected: boolean;
  };
  risk: {
    level: string;
    hazard: string;
    exposure: string;
    vulnerability: string;
  };
  priority: {
    level: string;
    action: string;
    decision_basis: Record<string, any>;
  };
  explanation: Record<string, any>;
  recommendation: {
    action: string;
    secondary_actions?: string[];
    contextual_advisories?: string[];
    autonomous_dispatch: boolean;
    human_review_required: boolean;
    basis?: any;
    reason?: string;
  };
  limitations: string[];
}

// --- MAPPING FUNCTIONS ---

/**
 * Maps Backend data models to the Intelligence Engine Request Payload.
 * Represents missing/unavailable data as explicitly null/empty per the schema.
 */
export function mapBackendToIntelligenceRequest(
  incident: any,
  reports: any[] = [],
  images: any[] = [],
  gisImpact: any = null
): IncidentPayload {
  
  // Base location
  const location: LocationMetadata = {
    location_id: incident.district || incident.ward || undefined,
    location_name: incident.address || undefined,
    latitude: incident.latitude,
    longitude: incident.longitude
  };

  // Rainfall - Only send if available. Do not fabricate duration or trend.
  let rainfall: RainfallInput | undefined;
  if (incident.rainfall != null) {
    rainfall = {
      intensity_mm_per_hour: Number(incident.rainfall)
    };
  }

  // Water Environment (River/Flood) - Only send if available. Explicitly mark unknown.
  let waterEnv: WaterEnvironmentInput | undefined;
  if (incident.riverLevel != null) {
    waterEnv = {
      water_level: Number(incident.riverLevel),
      water_level_unit: "m",
      trend: "unknown",
      sensor_status: "unknown"
    };
  }

  // Citizen Reports
  const citizen_reports: CitizenReportInput[] = reports.map(r => ({
    id: r._id?.toString() || r.id,
    report: r.description || r.report || "No description provided",
    timestamp: r.createdAt?.toISOString() || r.timestamp || new Date().toISOString()
  }));

  // Image Evidence
  const image_evidence: ImageEvidenceInput[] = images.map(i => ({
    id: i._id?.toString() || i.id,
    assessment: i.description || i.assessment || "Image evidence submitted",
    quality: "medium",
    timestamp: i.createdAt?.toISOString() || i.timestamp || new Date().toISOString()
  }));

  // GIS Context (Map Canonical GIS Snapshot to Intel GISInput)
  let gis: GISInput | undefined;
  if (gisImpact) {
    const pop = gisImpact.estimatedExposure?.population ?? 0;
    const roadsLen = Array.isArray(gisImpact.affectedRoads) ? gisImpact.affectedRoads.length : 0;
    const vulnLen = Array.isArray(gisImpact.vulnerabilityFactors) ? gisImpact.vulnerabilityFactors.length : 0;
    
    const infra: string[] = [];
    if (Array.isArray(gisImpact.nearbyHospitals)) {
      gisImpact.nearbyHospitals.forEach((f: any) => infra.push(f.name || f.facility_type || f.type || "Hospital"));
    }
    if (Array.isArray(gisImpact.nearbySchools)) {
      gisImpact.nearbySchools.forEach((f: any) => infra.push(f.name || f.type || "School"));
    }
    if (Array.isArray(gisImpact.criticalInfrastructure)) {
      gisImpact.criticalInfrastructure.forEach((f: any) => infra.push(f.name || f.category || f.type || "Infrastructure"));
    }
    
    gis = {
      population_exposure: pop > 5000 ? "high" : (pop > 1000 ? "moderate" : "low"),
      road_exposure: roadsLen >= 3 ? "high" : (roadsLen >= 1 ? "moderate" : "low"),
      critical_infrastructure: infra,
      vulnerability: vulnLen >= 3 ? "high" : (vulnLen >= 1 ? "moderate" : "low")
    };
  }
  // NOTE: If GIS is unavailable, we explicitly omit it to preserve data provenance.
  // The Intelligence Engine schema does not currently support mapping legacy scalar counters
  // (affectedPopulation/affectedInfrastructure) outside of spatial GIS input.

  return {
    incident_id: incident._id?.toString() || incident.id,
    timestamp: new Date().toISOString(),
    location,
    rainfall,
    water_environment: waterEnv,
    citizen_reports,
    image_evidence,
    gis
  };
}

const intelligenceResponseSchema = z.object({
  engine: z.object({ name: z.string(), version: z.string(), mode: z.string() }).passthrough().optional(),
  status: z.string().optional(),
  verification: z.object({
    score: z.number(),
    level: z.string(),
    evidence_strength: z.string(),
    source_diversity: z.string(),
    conflict_detected: z.boolean()
  }).passthrough().optional(),
  risk: z.object({
    level: z.string(),
    hazard: z.string(),
    exposure: z.string(),
    vulnerability: z.string()
  }).passthrough().optional(),
  priority: z.object({
    level: z.enum(["P1", "P2", "P3"])
  }).passthrough().optional(),
  recommendation: z.object({
    action: z.string(),
    secondary_actions: z.array(z.string()).optional(),
    contextual_advisories: z.array(z.any()).optional(),
    autonomous_dispatch: z.literal(false), // STRICT FAIL-CLOSED GOVERNANCE
    human_review_required: z.literal(true), // STRICT FAIL-CLOSED GOVERNANCE
    reason: z.string().optional()
  }).passthrough()
}).passthrough();

/**
 * Maps the Intelligence Engine Response back to Canonical Backend Snapshot fields.
 */
export function mapIntelligenceToBackendSnapshot(rawResponse: any): Record<string, any> {
  let response: z.infer<typeof intelligenceResponseSchema>;
  
  try {
    response = intelligenceResponseSchema.parse(rawResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Differentiate governance failure from structural failure
      const isGovernance = error.errors.some(e => 
        e.path.includes("autonomous_dispatch") || e.path.includes("human_review_required")
      );
      if (isGovernance) {
        throw new Error("Governance Violation: Intelligence Engine bypassed safety invariants.");
      }
      throw new Error(`Malformed Intelligence Response: ${error.message}`);
    }
    throw error;
  }

  // EARLY RETURN SHAPE: No emerging incident detected
  if (response.status === "no_emerging_incident") {
    return {
      // Do not fabricate priority or risk
      priorityLevel: "LOW",
      priorityScore: 0,
      riskLevel: "LOW",
      riskFactors: {},
      riskReasons: [],
      
      verification: {
        status: "unverified",
        score: 0,
        level: "weak",
        sources: 0,
        corroboration: false,
        conflicts: [],
        reasons: [],
        advisories: response.recommendation?.contextual_advisories || []
      },
      evidenceScore: 0,
      evidenceLevel: "LOW",

      recommendation: {
        version: 1,
        createdAt: new Date(),
        status: "GENERATED",
        headline: response.recommendation?.action || "No emerging incident",
        rationale: response.recommendation?.reason || "No sufficient emerging incident signal detected.",
        actions: [
          response.recommendation?.action,
          ...(response.recommendation?.secondary_actions || [])
        ].filter(Boolean),
        urgency: "LOW",
        requiredResources: [],
        supportingEvidence: []
      },
      
      approval: {
        status: "PENDING",
        recommendationVersion: 1
      },

      intelligenceResult: response
    };
  }

  // NORMAL PIPELINE SHAPE: Must contain verification, risk, and priority
  if (!response.priority || !response.risk || !response.verification) {
    throw new Error("Malformed Intelligence Response: Missing required fields (priority, risk, verification) in normal response.");
  }

  return {
    priority: response.priority.level, // P1, P2, P3
    // Explicit legacy compatibility mapping for dashboard/overview consumers expecting LOW/MEDIUM/HIGH/URGENT
    priorityLevel: response.priority.level === "P1" ? "URGENT" : response.priority.level === "P2" ? "HIGH" : "MEDIUM",
    priorityScore: response.priority.level === "P1" ? 90 : response.priority.level === "P2" ? 70 : 40,
    
    riskLevel: response.risk.level, // Fallback compat
    riskFactors: {
      hazard: response.risk.hazard,
      exposure: response.risk.exposure,
      vulnerability: response.risk.vulnerability
    },
    riskReasons: (response as any).explanation?.risk?.why || [],

    verification: {
      status: response.verification.conflict_detected ? "conflict_detected" : "verified",
      score: response.verification.score || 0,
      level: response.verification.level || "weak",
      sources: response.verification.source_diversity === "none" ? 0 : 2, // Approximation
      corroboration: response.verification.evidence_strength === "strong",
      conflicts: response.verification.conflict_detected ? ["Intelligence engine detected conflicting evidence"] : [],
      reasons: (response as any).explanation?.verification?.why || [],
      advisories: response.recommendation?.contextual_advisories || []
    },
    
    evidenceScore: response.verification.score || 0, // Fallback compat
    evidenceLevel: response.verification.level?.toUpperCase() || "LOW", // Fallback compat

    recommendation: {
      version: 1, // Start at 1, increment in actual endpoint logic if updating
      createdAt: new Date(),
      status: "GENERATED", // The AI recommendation is generated. Human decision is tracked separately.
      headline: response.recommendation?.action || "Review required",
      rationale: response.recommendation?.reason || "Based on integrated signals",
      actions: [
        response.recommendation?.action,
        ...(response.recommendation?.secondary_actions || [])
      ].filter(Boolean),
      urgency: response.priority.level,
      requiredResources: [], // Determined later by human
      supportingEvidence: []
    },
    
    approval: {
      status: "PENDING", // Human decision state separate from AI recommendation
      recommendationVersion: 1
    },

    intelligenceResult: response // Save raw snapshot
  };
}

/**
 * Invokes the external Python Intelligence Engine API.
 * Uses native fetch and enforces a strict timeout.
 */
export async function executeIntelligenceAnalysis(payload: IncidentPayload): Promise<IntelligenceResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    // Default to localhost:8000 for the Python FastAPI server if env is unset
    const aiUrl = process.env.INTELLIGENCE_ENGINE_URL || "http://localhost:8000";
    
    const response = await fetch(`${aiUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Intelligence Engine returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as IntelligenceResponse;
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      throw new Error("Intelligence Engine request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
