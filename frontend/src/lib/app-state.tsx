import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { Toaster, toast } from "sonner";

import { alerts as initialAlerts, incidents as initialIncidents, resources as initialResources } from "./demo-data";
import type { CitizenAlert, Incident, IncidentStatus, Resource, Resolution, ResourceStatus } from "./types";
import { statusToStage, projectWGS84ToCSS } from "./types";

type Role = "authority" | "citizen" | "responder";

/** Produce a display timestamp for demo purposes (HH:MM format). */

const API_BASE = import.meta.env["VITE_API_URL"] || "http://localhost:3000/api";

interface BackendIncident {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  resources?: BackendResourceAssignment[];
  approval?: BackendApproval;
  timeline?: any[];
  gisImpact?: any;
  recommendation?: any;
  verification?: any;
  riskScore?: number;
  riskLevel?: string;
  riskFactors?: any;
  riskReasons?: string[];
  priorityLevel?: string;
  evidenceScore?: number;
  createdAt?: string;
  source?: string;
  description?: string;
  district?: string;
  address?: string;
  incidentStatus?: string;
  resolution?: Resolution;
}

interface BackendResourceAssignment {
  _id?: string;
  assignmentId?: string;
  id?: string;
  resourceId: string;
  status: string;
}

interface BackendApproval {
  status?: string;
  decidedBy?: string;
  note?: string;
}

interface BackendResource {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  availabilityStatus?: string;
  latitude?: number;
  longitude?: number;
}

type AppStateIncident = Incident & { _backendResources?: BackendResourceAssignment[] };
type AppStateResource = Resource & { _assignmentId?: string };

// Helper to make API requests with generic error handling
async function apiFetch(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem("ds_token"); // Only pass real token
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(data?.message || data?.errorCode || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Adapt a backend canonical incident to the frontend shape
function adaptIncident(backendInc: BackendIncident, existingInc?: AppStateIncident): AppStateIncident {
  // We use the backend fields where available
  const resources = backendInc.resources || [];
  const assigned = resources.map((r) => r.resourceId);
  
  let incidentStatus = backendInc.incidentStatus || backendInc.status?.toLowerCase() || "detected";
  
  // Combine backend operational status if resources are assigned
  if (incidentStatus === "approved" && assigned.length > 0) {
     incidentStatus = "resources_assigned";
  }

  // GIS coordinate mapping risk condition resolved:
  // WGS84 latitude/longitude are correctly projected into 0-100% CSS percentages
  // constrained by the frontend's explicit viewport bounds.
  const hasCoords = backendInc.latitude !== undefined && backendInc.longitude !== undefined;
  const coords = hasCoords
     ? projectWGS84ToCSS(Number(backendInc.latitude), Number(backendInc.longitude)) 
     : (existingInc && (backendInc._id === existingInc.id || backendInc.id === existingInc.id) 
         ? existingInc.coords 
         : { x: 50, y: 50 });

  return {
    id: backendInc._id || backendInc.id || existingInc?.id || "",
    ref: backendInc._id?.slice(-6).toUpperCase() || backendInc.id?.slice(-6).toUpperCase() || existingInc?.ref || "NEW",
    title: backendInc.title || existingInc?.title || "",
    hazard: backendInc.type?.toLowerCase() || existingInc?.hazard || "flood",
    status: ["resolved", "closed", "rejected"].includes(incidentStatus) ? "resolved" : "open",
    incidentStatus: incidentStatus as IncidentStatus,
    stage: statusToStage(incidentStatus as IncidentStatus) || existingInc?.stage || "Detect",
    assigned,
    coords: coords as { x: number, y: number },
    latitude: backendInc.latitude,
    longitude: backendInc.longitude,
    
    // Explicitly map backend location fields to frontend ward/locality
    ward: backendInc.district || "Unknown",
    locality: backendInc.address || "Unknown",
    priority: (backendInc.priorityLevel as any) || "P3",
    priorityRationale: backendInc.riskReasons || [],
    populationExposed: backendInc.gisImpact?.estimatedExposure?.population ?? undefined,
    gisProvenance: backendInc.gisImpact?.dataProvenance ?? [],
    riskScore: backendInc.riskScore ?? undefined,
    confidence: backendInc.evidenceScore ?? backendInc.verification?.score ?? undefined,
    vulnerable: backendInc.gisImpact?.vulnerabilityFactors?.map((v: any) => v.factor || v.evidence) ?? [],
    detectedAt: backendInc.createdAt ?? existingInc?.detectedAt ?? new Date().toISOString(),
    detectionSource: backendInc.source ?? existingInc?.detectionSource ?? "System",
    summary: backendInc.description ?? existingInc?.summary ?? "",
    rainfallMm: [],
    waterLevelCm: [],
    
    evidence: backendInc.verification?.reasons?.map((r: string, i: number) => ({
      id: `v-${i}`,
      kind: "official",
      source: "Intelligence Engine",
      summary: r,
      detail: r,
      reliability: backendInc.verification?.score != null ? backendInc.verification.score / 100 : 0.8,
      weight: 1,
      at: backendInc.createdAt || new Date().toISOString()
    })) || [],
    
    reports: [], 
    
    factors: backendInc.riskReasons?.map((r: string, i: number) => ({
      label: `Risk Factor ${i + 1}`,
      detail: r,
      value: backendInc.riskScore ?? 0,
      weight: 1
    })) || [],

    timeline: backendInc.timeline || [],
    alertIssued: false,
    
    recommendation: backendInc.recommendation ? {
       status: (backendInc.approval?.status?.toLowerCase() || "pending") as any,
       decidedBy: backendInc.approval?.decidedBy || "System",
       ...(backendInc.approval?.note ? { note: backendInc.approval.note } : {}),
       headline: backendInc.recommendation.headline || backendInc.recommendation.action || "Pending evaluation",
       rationale: backendInc.recommendation.rationale || backendInc.recommendation.reason || "",
       actions: backendInc.recommendation.actions || backendInc.recommendation.secondary_actions || [],
    } : backendInc.approval ? {
       status: (backendInc.approval.status?.toLowerCase() || "pending") as any,
       decidedBy: backendInc.approval.decidedBy || "System",
       ...(backendInc.approval.note ? { note: backendInc.approval.note } : {}),
       headline: "Pending evaluation",
       rationale: "",
       actions: [],
    } : { status: "pending", actions: [], headline: "Pending evaluation", rationale: "" },
    
    ...(backendInc.resolution ? {
      resolution: backendInc.resolution,
      resolutionSummary: backendInc.resolution.impactSummary,
      responseMinutes: backendInc.resolution.responseMinutes
    } : existingInc?.resolution ? {
      resolution: existingInc.resolution,
      resolutionSummary: existingInc.resolutionSummary,
      responseMinutes: existingInc.responseMinutes
    } : {}),

    _backendResources: resources 
  } as AppStateIncident;
}

// Adapt a backend canonical resource to frontend shape
function adaptResource(backendRes: BackendResource, incidents: AppStateIncident[], existingRes?: AppStateResource): AppStateResource {
  let status = backendRes.availabilityStatus?.toLowerCase() || "available";
  let incidentId: string | undefined = undefined;
  let assignmentId: string | undefined = undefined;

  // If UNAVAILABLE, find active assignment in incidents
  if (status === "unavailable") {
     for (const inc of incidents) {
        if (!inc._backendResources) continue;
        const assignment = inc._backendResources.find((r) => r.resourceId === (backendRes._id || backendRes.id));
        if (assignment && !["COMPLETED", "RELEASED"].includes(assignment.status)) {
           status = assignment.status.toLowerCase();
           if (status === "on_scene") status = "on_site"; // Frontend mismatch fix
           incidentId = inc.id;
           assignmentId = assignment.assignmentId || assignment._id || assignment.id;
           break;
        }
     }
  }

  const hasCoords = backendRes.latitude !== undefined && backendRes.longitude !== undefined;
  const coords = hasCoords
     ? projectWGS84ToCSS(Number(backendRes.latitude), Number(backendRes.longitude))
     : (existingRes && (backendRes._id === existingRes.id || backendRes.id === existingRes.id)
         ? existingRes.coords
         : { x: 50, y: 50 });

  const nextRes: any = {
    id: backendRes._id || backendRes.id || existingRes?.id || "",
    name: backendRes.name || existingRes?.name || "Unknown Resource",
    kind: (backendRes.type?.toLowerCase() as any) || existingRes?.kind || "team",
    org: "Unknown",
    base: "Unknown",
    status: status as ResourceStatus,
    coords: coords as { x: number, y: number },
  };

  if (backendRes.type || existingRes?.type) nextRes.type = backendRes.type || existingRes?.type;
  if (backendRes.latitude !== undefined) nextRes.latitude = backendRes.latitude;
  if (backendRes.longitude !== undefined) nextRes.longitude = backendRes.longitude;
  if (incidentId) nextRes.incidentId = incidentId;
  if (assignmentId) nextRes._assignmentId = assignmentId;
  
  return nextRes as AppStateResource;
}

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type AppState = {
  role: Role;
  setRole: (role: Role) => void;
  incidents: Incident[];
  alerts: CitizenAlert[];
  resources: Resource[];
  approveRecommendation: (incidentId: string) => void;
  modifyRecommendation: (incidentId: string, actions: string[], note: string) => void;
  rejectRecommendation: (incidentId: string, note: string) => void;
  assignResource: (incidentId: string, resourceId: string) => void;
  unassignResource: (incidentId: string, resourceId: string) => void;
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  resolveIncident: (incidentId: string, resolution: Resolution) => void;
  acknowledgeAlert: (alertId: string) => void;
  updateResource: (resourceId: string, status: ResourceStatus) => void;
  addReport: (input: { location: string; description: string; depth: number }) => Promise<string>;
  backendConnected: boolean;
  backendDataMode: "DEMO" | "LIVE" | null;
  authError: boolean;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("authority");
  const [incidents, setIncidents] = useState<AppStateIncident[]>(initialIncidents);
  const [alerts, setAlerts] = useState<CitizenAlert[]>(initialAlerts);
  const [resources, setResources] = useState<AppStateResource[]>(initialResources);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendDataMode, setBackendDataMode] = useState<"DEMO" | "LIVE" | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  // Fetch initial state
  useEffect(() => {
    async function load() {
      try {
        const [incRes, resRes] = await Promise.all([
          apiFetch("/incidents"),
          apiFetch("/resources")
        ]);
        
        setBackendConnected(true);
        setBackendDataMode(incRes.dataMode || "LIVE");
        setAuthError(false);
        
        let adaptedIncidents = incidents;
        if (incRes && incRes.data) {
           // Directly compute the new incidents list without a setState callback
           adaptedIncidents = incRes.data.map((b: BackendIncident) => adaptIncident(b, incidents.find(c => c.id === b._id || c.id === b.id)));
           setIncidents(adaptedIncidents);
        }
        
        if (resRes && resRes.data) {
           // Use the exactly matched adaptedIncidents, solving data-flow race
           const adaptedResources = resRes.data.map((b: BackendResource) => adaptResource(b, adaptedIncidents, resources.find(c => c.id === b._id || c.id === b.id)));
           setResources(adaptedResources);
        }
      } catch (err: any) {
        console.warn("Backend unavailable, using local mock data", err);
        setBackendConnected(false);
        setAuthError(err?.status === 401);
      }
    }
    load();
  }, []); // Note: leaving incidents/resources out of dep array is intentional for mount-only

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    incidents,
    alerts,
    resources,
    backendConnected,
    backendDataMode,
    authError,

    approveRecommendation: async (incidentId) => {
      try {
        const res = await apiFetch(`/incidents/${incidentId}/approve`, { method: "POST" });
        setIncidents((current) => current.map((inc) => inc.id === incidentId ? adaptIncident(res.data, inc) : inc));
        toast.success("Incident approved successfully");
      } catch (err: any) {
        toast.error(`Approval failed: ${err.message}`);
      }
    },

    modifyRecommendation: (incidentId, actions, note) => {
      if (backendConnected) {
        toast.error("Modification of recommendations is not yet supported in Live mode");
        return;
      }
      toast.info("Demo Mode: Recommendation modified locally");
      setIncidents((current) => current.map((incident) => incident.id === incidentId ? {
        ...incident,
        stage: "Approve",
        incidentStatus: "approved" as IncidentStatus,
        alertIssued: true,
        recommendation: {
          ...incident.recommendation,
          actions,
          status: "modified",
          decidedBy: "S. Deshmukh",
          note,
        },
        timeline: [...incident.timeline, {
          id: `t-${Date.now()}`,
          at: now(),
          stage: "Approve" as const,
          actor: "S. Deshmukh",
          text: `Recommendation modified and approved: ${note}`,
        }],
      } : incident));
    },

    rejectRecommendation: async (incidentId, note) => {
      try {
        const res = await apiFetch(`/incidents/${incidentId}/reject`, { 
          method: "POST", 
          body: JSON.stringify({ note }) 
        });
        setIncidents(current => current.map(inc => inc.id === incidentId ? adaptIncident(res.data, inc) : inc));
        toast.success("Incident rejected successfully");
      } catch (err: any) {
        toast.error(`Rejection failed: ${err.message}`);
      }
    },

    assignResource: async (incidentId, resourceId) => {
      try {
        const res = await apiFetch(`/resources/${resourceId}/assign`, { 
          method: "POST", 
          body: JSON.stringify({ incidentId }) 
        });
        // res.data contains { resource, incident } from backend
        setIncidents(current => current.map(inc => inc.id === incidentId ? adaptIncident(res.data.incident, inc) : inc));
        // Must update resource list so new adapter logic calculates the status properly
        setResources(current => current.map(resItem => {
          if (resItem.id === resourceId) {
             return adaptResource(res.data.resource, [adaptIncident(res.data.incident, incidents.find(i => i.id === incidentId))], resItem);
          }
          return resItem;
        }));
        toast.success("Resource assigned successfully");
      } catch (err: any) {
        toast.error(`Assignment failed: ${err.message}`);
      }
    },

    unassignResource: async (incidentId, resourceId) => {
      if (!backendConnected) {
        setResources((current) => current.map((resource) => {
          if (resource.id === resourceId) {
             const next = { ...resource, status: "available" as ResourceStatus };
             delete next.incidentId;
             return next;
          }
          return resource;
        }));
        setIncidents((current) => current.map((incident) => {
          if (incident.id !== incidentId) return incident;
          return {
            ...incident,
            assigned: incident.assigned.filter((id: string) => id !== resourceId),
          };
        }));
        return;
      }
      
      try {
        const resource = resources.find(r => r.id === resourceId);
        const assignmentId = (resource as any)?._assignmentId;
        if (!assignmentId) throw new Error("No active assignment found for this resource");
        
        const result = await apiFetch(`/responders/${assignmentId}/status`, {
          method: "POST",
          body: JSON.stringify({ status: "COMPLETED" })
        });
        
        if (result.success && result.data) {
           const existingInc = incidents.find((i) => i.id === incidentId);
           const updatedInc = adaptIncident(result.data, existingInc);
           setIncidents((current) => current.map(i => i.id === incidentId ? updatedInc : i));
           
           // Backend releases the resource automatically, but we also update local resource list quickly
           setResources((current) => current.map(r => {
             if (r.id === resourceId) {
                const next = { ...r, status: "available" as ResourceStatus };
                delete (next as any).incidentId;
                delete (next as any)._assignmentId;
                return next;
             }
             return r;
           }));
           toast.success("Resource unassigned");
        }
      } catch (err: any) {
        toast.error(`Unassign failed: ${err.message}`);
      }
    },

    updateIncidentStatus: async (incidentId, status) => {
      if (!backendConnected) {
        setIncidents((current) => current.map((incident) => {
          if (incident.id !== incidentId) return incident;
          const stage = statusToStage(status);
          return {
            ...incident,
            incidentStatus: status,
            stage,
            status: status === "resolved" || status === "closed" ? "resolved" : incident.status,
            timeline: [...incident.timeline, {
              id: `t-${Date.now()}`,
              at: now(),
              stage,
              actor: "S. Deshmukh",
              text: `Incident status changed to: ${status.replace(/_/g, " ")}`,
            }],
          };
        }));
        return;
      }
      
      try {
        const result = await apiFetch(`/incidents/${incidentId}/status`, {
          method: "POST",
          body: JSON.stringify({ incidentStatus: status })
        });
        
        if (result.success && result.data) {
           const existingInc = incidents.find((i) => i.id === incidentId);
           const updatedInc = adaptIncident(result.data, existingInc);
           // Also carry over stage since it's computed
           updatedInc.stage = statusToStage(status) || updatedInc.stage;
           setIncidents((current) => current.map((i) => i.id === incidentId ? updatedInc : i));
           toast.success("Incident status updated");
        }
      } catch (err: any) {
        toast.error(`Status update failed: ${err.message}`);
      }
    },

    resolveIncident: async (incidentId, resolution) => {
      if (!backendConnected) {
        setIncidents((current) => current.map((incident) => {
          if (incident.id !== incidentId) return incident;
          return {
            ...incident,
            stage: "Resolve",
            incidentStatus: "resolved",
            status: "resolved",
            resolution,
            resolutionSummary: resolution.impactSummary,
            responseMinutes: resolution.responseMinutes,
            timeline: [...incident.timeline, {
              id: `t-${Date.now()}`,
              at: now(),
              stage: "Resolve" as const,
              actor: "S. Deshmukh",
              text: `Incident resolved: ${resolution.reason}`,
            }],
          };
        }));
        setResources((current) => current.map((resource) => {
          if (resource.incidentId === incidentId) {
             const next = { ...resource, status: "available" as ResourceStatus };
             delete next.incidentId;
             return next;
          }
          return resource;
        }));
        return;
      }
      
      try {
        const result = await apiFetch(`/incidents/${incidentId}/resolve`, {
          method: "POST",
          body: JSON.stringify({ resolution })
        });
        
        if (result.success && result.data) {
           const existingInc = incidents.find((i) => i.id === incidentId);
           const updatedInc = adaptIncident(result.data, existingInc);
           setIncidents((current) => current.map((i) => i.id === incidentId ? updatedInc : i));
           toast.success("Incident resolved successfully");
        }
      } catch (err: any) {
        toast.error(`Resolution failed: ${err.message}`);
      }
    },

    acknowledgeAlert: (alertId) => setAlerts((current) => current.map((alert) =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    )),

    updateResource: async (resourceId, status) => {
      const resource = resources.find(r => r.id === resourceId);
      const assignmentId = (resource as any)?._assignmentId;
      
      if (!assignmentId) {
         // Prevent fallback mutation if we are connected to the backend
         if (backendConnected) {
            toast.error("Cannot update status: No active assignment found");
            return;
         }
         // Fallback to local mutation if purely mock/demo mode
         setResources((current) => current.map((r) => r.id === resourceId ? { ...r, status } : r));
         return;
      }
      
      // Backend expects ASSIGNED | EN_ROUTE | ON_SCENE | ASSISTING | COMPLETED
      let backendStatus = status.toUpperCase();
      if (backendStatus === "ON_SITE") backendStatus = "ON_SCENE";

      try {
        const res = await apiFetch(`/responders/${assignmentId}/status`, { 
          method: "POST", 
          body: JSON.stringify({ status: backendStatus }) 
        });
        setIncidents(current => current.map(inc => inc.id === resource?.incidentId ? adaptIncident(res.data, inc) : inc));
        
        // Update resource state
        setResources(current => current.map(r => {
           if (r.id === resourceId) {
              if (backendStatus === "COMPLETED") {
                 const next = { ...r, status: "available" as ResourceStatus };
                 delete next.incidentId;
                 delete next._assignmentId;
                 return next;
              }
              return { ...r, status };
           }
           return r;
        }));
        toast.success("Resource status updated");
      } catch (err: any) {
        toast.error(`Status update failed: ${err.message}`);
      }
    },

    addReport: async ({ location, description, depth }) => {
      // Find matching incident by location text, or fallback to the most recent open incident
      let targetIncident = incidents.find(i => 
        i.ward?.toLowerCase().includes(location.toLowerCase()) || 
        i.title?.toLowerCase().includes(location.toLowerCase()) ||
        i.locality?.toLowerCase().includes(location.toLowerCase())
      );
      if (!targetIncident) {
        targetIncident = incidents.find(i => i.status !== "resolved") || incidents[0];
      }
      
      const incidentId = targetIncident?.id || "i-2431"; 

      if (!backendConnected) {
         // DEMO MODE - Preserve exact deterministic behavior
         const id = `DS-R${Math.floor(1000 + Math.random() * 9000)}`;
         setIncidents((current) => current.map((incident) => incident.id === incidentId ? {
           ...incident,
           reports: [...(incident.reports || []), {
             id,
             by: "You",
             text: description,
             ward: location,
             at: now(),
             hasPhoto: false,
             waterDepthCm: depth,
             state: "queued" as const,
           }],
         } : incident));
         return id;
      }
      
      // LIVE MODE
      try {
        const payload = {
          type: "CITIZEN_REPORT",
          description: depth ? `${description}\n(Estimated water depth: ${depth}cm)` : description,
          address: location,
          latitude: targetIncident?.latitude ?? 19.07,
          longitude: targetIncident?.longitude ?? 72.87
        };
        
        const result = await apiFetch(`/reports`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        
        if (result.success && result.data) {
           const reportData = result.data;
           const refId = reportData._id?.slice(-6).toUpperCase() || reportData.id?.slice(-6).toUpperCase() || "NEW";
           const newReport = {
             id: refId,
             by: "You",
             text: description,
             ward: location,
             at: now(),
             hasPhoto: false,
             waterDepthCm: depth,
             state: "queued" as const
           };
           
           setIncidents((current) => current.map((incident) => incident.id === incidentId ? {
             ...incident,
             reports: [...(incident.reports || []), newReport]
           } : incident));
           
           return refId;
        }
        throw new Error("Invalid response from server");
      } catch (err: any) {
        toast.error(`Failed to submit report: ${err.message}`);
        throw err;
      }
    },
  }), [role, incidents, alerts, resources, backendConnected, backendDataMode, authError]);

  return <AppStateContext.Provider value={value}>{children}<Toaster position="top-right" /></AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}