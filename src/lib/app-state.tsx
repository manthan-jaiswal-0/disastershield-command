import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { alerts as initialAlerts, incidents as initialIncidents, resources as initialResources } from "./demo-data";
import type { CitizenAlert, Incident, Resource, ResourceStatus } from "./types";

type Role = "authority" | "citizen" | "responder";

type AppState = {
  role: Role;
  setRole: (role: Role) => void;
  incidents: Incident[];
  alerts: CitizenAlert[];
  resources: Resource[];
  approveRecommendation: (incidentId: string) => void;
  rejectRecommendation: (incidentId: string, note: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  updateResource: (resourceId: string, status: ResourceStatus) => void;
  addReport: (input: { location: string; description: string; depth: number }) => string;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("authority");
  const [incidents, setIncidents] = useState(initialIncidents);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [resources, setResources] = useState(initialResources);

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    incidents,
    alerts,
    resources,
    approveRecommendation: (incidentId) => {
      setIncidents((current) => current.map((incident) => incident.id === incidentId ? {
        ...incident,
        stage: "Approve",
        alertIssued: true,
        recommendation: { ...incident.recommendation, status: "approved", decidedBy: "A. Raman" },
        timeline: [...incident.timeline, {
          id: `t-${Date.now()}`,
          at: "14:08",
          stage: "Approve",
          actor: "A. Raman",
          text: "Recommended response package approved and released to operations.",
        }],
      } : incident));
    },
    rejectRecommendation: (incidentId, note) => {
      setIncidents((current) => current.map((incident) => incident.id === incidentId ? {
        ...incident,
        recommendation: { ...incident.recommendation, status: "rejected", decidedBy: "A. Raman", note },
      } : incident));
    },
    acknowledgeAlert: (alertId) => setAlerts((current) => current.map((alert) => alert.id === alertId ? { ...alert, acknowledged: true } : alert)),
    updateResource: (resourceId, status) => setResources((current) => current.map((resource) => resource.id === resourceId ? { ...resource, status } : resource)),
    addReport: ({ location, description, depth }) => {
      const id = `DS-R${Math.floor(1000 + Math.random() * 9000)}`;
      setIncidents((current) => current.map((incident) => incident.id === "i-2431" ? {
        ...incident,
        reports: [...incident.reports, {
          id,
          by: "You",
          text: description,
          ward: location,
          at: "14:08",
          hasPhoto: false,
          waterDepthCm: depth,
          state: "queued",
        }],
      } : incident));
      return id;
    },
  }), [role, incidents, alerts, resources]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}