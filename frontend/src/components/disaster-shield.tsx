import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, Ambulance, BarChart3, Bell, BookOpen, Building2,
  CheckCircle2, ChevronRight, CircleDot, Database, FileWarning, Gauge, Home,
  Layers3, Map, MapPin, Menu, Radio, Shield, Siren, Users, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CITY } from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import type { Incident, Priority } from "@/lib/types";

export const roleRoutes = {
  authority: "/",
  citizen: "/citizen",
  responder: "/responder",
} as const;

const authorityNav = [
  { to: "/", label: "Command", icon: Home },
  { to: "/map", label: "Risk map", icon: Map },
  { to: "/resources", label: "Resources", icon: Ambulance },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const citizenNav = [
  { to: "/citizen", label: "Overview", icon: Home },
  { to: "/report", label: "Report", icon: FileWarning },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/safety", label: "Safety", icon: BookOpen },
  { to: "/sources", label: "Data sources", icon: Database },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, alerts, backendConnected, backendDataMode, authError } = useAppState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const nav = role === "citizen" ? citizenNav : role === "responder" ? [{ to: "/responder", label: "Assignments", icon: Radio }] as const : authorityNav;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center px-4 lg:px-6">
          <button className="mr-3 lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></button>
          <Link to="/" className="flex items-center gap-2.5" aria-label="DisasterShield command home">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Shield className="size-4" /></span>
            <div><div className="text-sm font-bold">DisasterShield</div><div className="hidden text-[10px] text-muted-foreground sm:block">Unified Emergency Operations</div></div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 border-r pr-3 text-xs font-semibold md:flex">
              {backendConnected ? (
                backendDataMode === "LIVE" ? (
                  <span className="text-ok flex items-center gap-2"><span className="size-2 rounded-full bg-ok" />LIVE / OPERATIONAL MODE</span>
                ) : (
                  <span className="text-p2 flex items-center gap-2"><span className="size-2 rounded-full bg-p2" />LIVE CONNECTED (DEMO DATA)</span>
                )
              ) : authError ? (
                <span className="text-p1 flex items-center gap-2"><span className="size-2 rounded-full bg-p1" />AUTHENTICATION REQUIRED</span>
              ) : (
                <span className="text-p2 flex items-center gap-2"><span className="size-2 rounded-full bg-p2" />OFFLINE / DEMO MODE</span>
              )}
            </span>
            <Link to="/alerts" className="relative grid size-9 place-items-center rounded-md hover:bg-muted" aria-label="View alerts">
              <Bell className="size-4" />
              {alerts.some((alert) => !alert.acknowledged) && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-p1" />}
            </Link>
            <div className="hidden rounded-md border bg-muted p-0.5 sm:flex" aria-label="Select operational role">
              {(["citizen", "authority", "responder"] as const).map((item) => (
                <Link key={item} to={roleRoutes[item]} onClick={() => setRole(item)} className={cn("rounded px-2.5 py-1.5 text-xs font-medium capitalize", role === item ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground")}>{item}</Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-14 left-0 z-40 hidden w-56 border-r bg-surface lg:block">
        <nav className="p-3" aria-label="Primary navigation">
          <p className="label-xs px-3 py-3">{role} workspace</p>
          {nav.map((item) => <NavItem key={item.to} {...item} active={pathname === item.to} />)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="text-xs font-semibold">{CITY.name} EOC</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{CITY.zone}</div>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-[60] bg-foreground/25 lg:hidden" onClick={() => setMobileOpen(false)}>
        <aside className="h-full w-72 bg-surface p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><b>Navigation</b><Button size="icon" variant="ghost" onClick={() => setMobileOpen(false)}><X /></Button></div>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">{(["citizen", "authority", "responder"] as const).map((item) => <Link key={item} to={roleRoutes[item]} onClick={() => { setRole(item); setMobileOpen(false); }} className={cn("rounded px-1 py-2 text-center text-xs capitalize", role === item && "bg-surface font-semibold")}>{item}</Link>)}</div>
          {nav.map((item) => <div key={item.to} onClick={() => setMobileOpen(false)}><NavItem {...item} active={pathname === item.to} /></div>)}
        </aside>
      </div>}

      <main className="pb-20 lg:ml-56 lg:pb-0">
        {!backendConnected ? (
          <div className={cn("px-4 py-2 text-center text-xs font-bold uppercase tracking-wider md:hidden", authError ? "bg-p1 text-white" : "bg-p2 text-white")}>
            {authError ? "AUTHENTICATION REQUIRED / DEMO DATA" : "OFFLINE / DEMO MODE"}
          </div>
        ) : backendDataMode === "DEMO" && (
          <div className="bg-p2 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white md:hidden">
            LIVE CONNECTED (DEMO DATA)
          </div>
        )}
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-surface lg:hidden" aria-label="Mobile navigation">
        {nav.slice(0, 4).map((item) => <Link key={item.to} to={item.to} className={cn("flex min-w-16 flex-col items-center gap-1 text-[10px] text-muted-foreground", pathname === item.to && "text-primary")}><item.icon className="size-5" />{item.label}</Link>)}
      </nav>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Home; active: boolean }) {
  return <Link to={to} className={cn("mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium", active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4" />{label}</Link>;
}

export function Page({ children, title, description, actions }: { children: ReactNode; title: string; description: string; actions?: ReactNode }) {
  return <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p></div>{actions}</div>{children}</div>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold", priority === "P1" ? "bg-p1-soft text-p1" : priority === "P2" ? "bg-p2-soft text-p2" : "bg-p3-soft text-p3")}><span className="size-1.5 rounded-full bg-current" />{priority}</span>;
}

export function StageBadge({ stage }: { stage: string }) {
  return <span className="inline-flex rounded border bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{stage === "Recommend" ? "Decide" : stage}</span>;
}

export function Metric({ label, value, detail, tone }: { label: string; value: string | number; detail?: string; tone?: "danger" | "ok" }) {
  return <div className="border-r px-4 py-3 last:border-r-0"><div className="label-xs">{label}</div><div className={cn("num mt-1 text-2xl font-semibold", tone === "danger" && "text-p1", tone === "ok" && "text-ok")}>{value}</div>{detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}</div>;
}

export function IncidentRow({ incident }: { incident: Incident }) {
  return <Link to="/incidents/$incidentId" params={{ incidentId: incident.id }} className="grid gap-3 border-b px-4 py-4 transition-colors hover:bg-muted/60 sm:grid-cols-[72px_1fr_100px_90px_32px] sm:items-center">
    <div><PriorityBadge priority={incident.priority} /><div className="num mt-1 text-[10px] text-muted-foreground">{incident.ref}</div></div>
    <div><div className="text-sm font-semibold">{incident.title}</div><div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{incident.locality}</div></div>
    <div><div className="num text-sm font-semibold">{incident.riskScore}/100</div><div className="text-[10px] text-muted-foreground">Risk score</div></div>
    <StageBadge stage={incident.stage} /><ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
  </Link>;
}

export function Workflow({ active }: { active: string }) {
  const steps = ["Detect", "Verify", "Assess", "Prioritize", "Decide", "Respond", "Monitor", "Resolve"];
  const mapped = active === "Recommend" || active === "Approve" ? "Decide" : active;
  const activeIndex = steps.indexOf(mapped);
  return <div className="overflow-x-auto border-y bg-surface"><div className="flex min-w-[760px] items-center px-4 py-4">{steps.map((step, index) => <div key={step} className="flex flex-1 items-center"><div className="flex flex-col items-center gap-1.5"><span className={cn("grid size-6 place-items-center rounded-full border text-[10px] font-bold", index < activeIndex ? "border-ok bg-ok text-primary-foreground" : index === activeIndex ? "border-primary bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")}>{index < activeIndex ? <CheckCircle2 className="size-3.5" /> : index + 1}</span><span className={cn("text-[10px] font-semibold", index === activeIndex ? "text-foreground" : "text-muted-foreground")}>{step}</span></div>{index < steps.length - 1 && <div className={cn("mb-5 h-px flex-1", index < activeIndex ? "bg-ok" : "bg-border")} />}</div>)}</div></div>;
}

export function SectorMap({ incidents, selectedId, onSelect, showResources = false }: { incidents: Incident[]; selectedId?: string | undefined; onSelect?: ((id: string) => void) | undefined; showResources?: boolean | undefined }) {
  const { resources } = useAppState();
  return <div className="relative min-h-[430px] overflow-hidden bg-surface-sunken hairline-grid" aria-label={`Operational map of ${CITY.name} sectors`}>
    <div className="absolute left-[12%] top-[10%] h-[75%] w-[72%] rotate-[-5deg] rounded-[42%_58%_55%_45%] border-2 border-water/50 bg-water/10" />
    <div className="absolute left-[40%] top-0 h-full w-16 rotate-[12deg] border-x border-water/30 bg-water/10" />
    {incidents.map((incident) => <button key={incident.id} aria-label={`${incident.ref} ${incident.title}`} onClick={() => onSelect?.(incident.id)} className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-md transition-transform hover:scale-110", incident.priority === "P1" ? "size-7 bg-p1" : incident.priority === "P2" ? "size-6 bg-p2" : "size-5 bg-p3", selectedId === incident.id && "ring-4 ring-primary/25")} style={{ left: `${incident.coords.x}%`, top: `${incident.coords.y}%` }}><span className="sr-only">{incident.title}</span></button>)}
    {showResources && resources.map((resource) => <span key={resource.id} title={resource.name} className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border border-primary bg-surface text-primary" style={{ left: `${resource.coords.x}%`, top: `${resource.coords.y}%` }}><Ambulance className="size-3" /></span>)}
    <div className="absolute bottom-3 left-3 rounded border bg-surface/95 px-3 py-2 text-[10px] text-muted-foreground shadow-sm"><div className="mb-1 font-semibold text-foreground">Operational layers</div><div className="flex gap-3"><span className="text-p1">● P1</span><span className="text-p2">● P2</span><span className="text-p3">● P3</span>{showResources && <span className="text-primary">▣ Resource</span>}</div></div>
  </div>;
}

export const icons = { Activity, AlertTriangle, Building2, CircleDot, Gauge, Layers3, Radio, Siren, Users };