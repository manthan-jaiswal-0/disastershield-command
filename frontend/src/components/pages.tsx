import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Camera, Check, CheckCircle2, Clock3, Database, Edit, MapPin, Navigation, Phone, Plus, Radio, Send, ShieldAlert, Users, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analytics, CITY, dataSources, safetyGuide, signals } from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUS_LABELS, RESPONDER_STATUS_LABELS, type IncidentStatus, type Resolution } from "@/lib/types";
import { IncidentRow, Metric, Page, PriorityBadge, SectorMap, StageBadge, Workflow } from "./disaster-shield";

/* ─── DEMO BANNER ─── */
function DemoBanner() {
  return (
    <div className="mb-4 border border-dashed border-p2 bg-p2-soft px-4 py-2 text-center text-xs font-semibold text-p2">
      {CITY.demoLabel} — All data is fictional and for demonstration only
    </div>
  );
}

/* ─── COMMAND PAGE ─── */
export function CommandPage() {
  const { incidents, resources } = useAppState();
  const active = incidents.filter((item) => item.status !== "resolved");
  const urgent = active[0] ?? incidents[0]!;
  const deployedCount = resources.filter((r) => r.status !== "available" && r.status !== "offline" && r.status !== "completed").length;
  return <Page title="Command centre" description={`${CITY.zone} · Live operational picture`} actions={<div className="flex items-center gap-2 text-xs text-muted-foreground"><Radio className="size-3.5 text-ok" /> 12 sources reporting normally</div>}>
    <DemoBanner />
    <div className="mb-5 grid divide-y border bg-surface sm:grid-cols-4 sm:divide-x sm:divide-y-0"><Metric label="Active incidents" value={active.length} detail={`${active.filter((i) => i.priority === "P1").length} priority one`} tone="danger" /><Metric label="People exposed" value={active.reduce((s, i) => s + (i.populationExposed || 0), 0).toLocaleString()} detail={`Across ${active.length} open areas`} /><Metric label="Resources deployed" value={`${deployedCount} / ${resources.length}`} detail={`${resources.filter((r) => r.status === "en_route" || r.status === "on_site").length} en route or on site`} /><Metric label="Median verification" value="12 min" detail="Today · down 3 min" tone="ok" /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.7fr)]">
      <section className="overflow-hidden border bg-surface"><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="font-semibold">Live risk map</h2><p className="text-xs text-muted-foreground">Active incidents and modelled flood extent</p></div><Link to="/map" className="text-xs font-semibold text-primary">Open full map</Link></div><SectorMap incidents={active} showResources /></section>
      <section className="border bg-surface"><div className="border-b px-4 py-3"><span className="label-xs">Decision required</span><h2 className="mt-1 font-semibold">{urgent.title}</h2></div><div className="p-4"><div className="flex items-center gap-2"><PriorityBadge priority={urgent.priority} /><StageBadge stage={urgent.stage} /><span className="num ml-auto text-sm font-bold text-p1">Risk {urgent.riskScore}</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{urgent.summary}</p><div className="mt-4 border-l-2 border-primary pl-3"><div className="text-xs font-semibold">System recommendation</div><div className="mt-1 text-sm">{urgent.recommendation.headline}</div></div><Button className="mt-5 w-full" asChild><Link to="/incidents/$incidentId" params={{ incidentId: urgent.id }}>Review evidence and decide <ArrowRight /></Link></Button></div></section>
    </div>
    <section className="mt-5 border bg-surface"><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="font-semibold">Incident queue</h2><p className="text-xs text-muted-foreground">Ordered by operational priority, not detection time</p></div><span className="num text-xs text-muted-foreground">{active.length} OPEN</span></div>{active.map((incident) => <IncidentRow key={incident.id} incident={incident} />)}</section>
    <section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="border bg-surface"><div className="border-b px-4 py-3"><h2 className="font-semibold">Early signals</h2></div>{signals.map((signal) => <div key={signal.id} className="border-b p-4 last:border-0"><div className="flex gap-3"><span className="num text-sm font-bold text-p2">{signal.strength}</span><div><div className="text-sm font-semibold">{signal.label}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.detail}</p></div></div></div>)}</div><div className="border bg-surface"><div className="border-b px-4 py-3"><h2 className="font-semibold">Operational doctrine</h2></div><Workflow active="Recommend" /><p className="p-4 text-sm leading-6 text-muted-foreground">Every recommendation remains reviewable. The system combines official sensors, citizen evidence, exposure and vulnerability—then an authorised officer decides.</p></div></section>
  </Page>;
}

/* ─── MAP PAGE ─── */
export function MapPage() {
  const { incidents } = useAppState(); const [selected, setSelected] = useState(incidents[0]?.id); const [priority, setPriority] = useState("All");
  const filtered = incidents.filter((item) => priority === "All" || item.priority === priority); const incident = incidents.find((item) => item.id === selected);
  return <Page title="Live risk map" description={`Incident severity, vulnerable assets and response resources across ${CITY.name}`} actions={<div className="flex gap-1 rounded border bg-surface p-1">{["All","P1","P2","P3"].map((item) => <Button key={item} variant={priority === item ? "default" : "ghost"} size="sm" onClick={() => setPriority(item)}>{item}</Button>)}</div>}><div className="grid overflow-hidden border bg-surface xl:grid-cols-[1fr_360px]"><SectorMap incidents={filtered} selectedId={selected} onSelect={setSelected} showResources /><aside className="border-t xl:border-l xl:border-t-0"><div className="border-b p-4"><span className="label-xs">Selected incident</span>{incident ? <><div className="mt-2 flex gap-2"><PriorityBadge priority={incident.priority} /><span className="num text-xs text-muted-foreground">{incident.ref}</span></div><h2 className="mt-2 text-lg font-semibold">{incident.title}</h2><p className="mt-2 text-sm text-muted-foreground">{incident.locality}</p></> : <p className="mt-2 text-sm">Select an incident marker.</p>}</div>{incident && <div className="p-4"><div className="grid grid-cols-2 gap-3"><MiniStat label="Risk" value={incident.riskScore != null ? `${incident.riskScore}/100` : "Unknown"} /><MiniStat label="Confidence" value={incident.confidence != null ? `${incident.confidence}%` : "Unknown"} /><MiniStat label="Exposed" value={incident.populationExposed?.toLocaleString() ?? "Unknown"} /><MiniStat label="Stage" value={incident.stage} /></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{incident.summary}</p><Button className="mt-4 w-full" asChild><Link to="/incidents/$incidentId" params={{ incidentId: incident.id }}>Open incident <ArrowRight /></Link></Button></div>}</aside></div></Page>;
}

/* ─── INCIDENT PAGE ─── */
export function IncidentPage() {
  const { incidentId } = useParams({ from: "/incidents/$incidentId" });
  const {
    incidents, resources, approveRecommendation, modifyRecommendation,
    rejectRecommendation, assignResource, unassignResource,
    updateIncidentStatus, resolveIncident, backendConnected
  } = useAppState();
  const incident = incidents.find((item) => item.id === incidentId);
  const [note, setNote] = useState("");
  const [modifyMode, setModifyMode] = useState(false);
  const [modActions, setModActions] = useState<string[]>([]);
  const [resolveMode, setResolveMode] = useState(false);
  const [resForm, setResForm] = useState({ reason: "", notes: "", impact: "" });

  if (!incident) return <Page title="Incident unavailable" description="The requested incident could not be found."><Button asChild><Link to="/">Return to command centre</Link></Button></Page>;

  const assignedResources = resources.filter((r) => incident.assigned.includes(r.id));
  const availableResources = resources.filter((r) => r.status === "available");
  const statusLabel = INCIDENT_STATUS_LABELS[incident.incidentStatus];

  return <Page title={`${incident.ref} · ${incident.title}`} description={`${incident.locality} · Detected ${incident.detectedAt}`} actions={<div className="flex gap-2"><PriorityBadge priority={incident.priority} /><StageBadge stage={incident.stage} /><span className="rounded border bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{statusLabel}</span></div>}>
    <Workflow active={incident.stage} />
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
      {/* LEFT COLUMN */}
      <div className="space-y-5">
        {/* Situation */}
        <section className="border bg-surface p-5">
          <h2 className="font-semibold">Situation assessment</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{incident.summary}</p>
          <div className="mt-5 grid grid-cols-2 divide-x border sm:grid-cols-4">
            <Metric label="Risk" value={incident.riskScore ?? "Unknown"} tone="danger" />
            <Metric label="Confidence" value={incident.confidence != null ? `${incident.confidence}%` : "Unknown"} />
            <Metric label="Exposed" value={incident.populationExposed?.toLocaleString() ?? "Unknown"} />
            <Metric label="Reports" value={incident.reports?.length ?? 0} />
          </div>
          {incident.gisProvenance && incident.gisProvenance.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-b bg-surface-sunken px-4 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">GIS Data Provenance:</span>
              {incident.gisProvenance.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5" title={p.note}>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase", p.dataType?.includes("DEMO") || p.dataType?.includes("SYNTHETIC") ? "border-amber-200 bg-amber-50 text-amber-600" : p.dataType === "UNAVAILABLE" ? "bg-muted text-muted-foreground" : "border-blue-200 bg-blue-50 text-blue-600")}>
                    {p.dataType}
                  </span>
                  <span className="hidden opacity-75 sm:inline-block">{p.source}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Priority rationale + factors */}
        <section className="border bg-surface"><div className="border-b p-4"><h2 className="font-semibold">Why this priority</h2></div><div className="grid gap-5 p-4 md:grid-cols-2"><div>{incident.priorityRationale.map((reason) => <p key={reason} className="mb-3 flex gap-2 text-sm leading-5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{reason}</p>)}</div><div className="space-y-3">{incident.factors?.map((factor) => <div key={factor.label}><div className="flex justify-between text-xs"><b>{factor.label}</b><span className="num">{factor.value}</span></div><div className="mt-1 h-1.5 bg-muted"><div className="h-full bg-primary" style={{ width: `${factor.value}%` }} /></div><div className="mt-1 text-[10px] text-muted-foreground">{factor.detail}</div></div>)}</div></div></section>

        {/* Evidence */}
        <section className="border bg-surface"><div className="border-b p-4"><h2 className="font-semibold">Evidence ledger</h2><p className="text-xs text-muted-foreground">Source reliability and contribution remain visible to reviewers</p></div>{incident.evidence?.map((evidence) => <div key={evidence.id} className="grid gap-3 border-b p-4 sm:grid-cols-[120px_1fr_90px]"><div><span className={cn("rounded px-2 py-1 text-[10px] font-semibold uppercase", evidence.conflicting ? "bg-p1-soft text-p1" : "bg-ok-soft text-ok")}>{evidence.conflicting ? "Conflicting" : evidence.kind}</span><div className="num mt-2 text-[10px] text-muted-foreground">{evidence.at}</div></div><div><div className="text-sm font-semibold">{evidence.source}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{evidence.summary}</div></div><div className="text-right"><div className="num text-sm font-semibold">{Math.round(evidence.reliability * 100)}%</div><div className="text-[10px] text-muted-foreground">Reliability</div></div></div>)}</section>

        {/* Assigned Resources */}
        <section className="border bg-surface">
          <div className="border-b p-4">
            <h2 className="font-semibold">Assigned resources</h2>
            <p className="text-xs text-muted-foreground">Resources currently assigned to this incident</p>
          </div>
          {assignedResources.length === 0
            ? <p className="p-4 text-sm text-muted-foreground">No resources assigned yet.</p>
            : assignedResources.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b px-4 py-3 last:border-0">
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r.type ?? r.kind} · {r.org}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold capitalize">{r.status.replace(/_/g, " ")}</span>
                  {incident.status !== "resolved" && (
                    <Button variant="ghost" size="sm" onClick={() => unassignResource(incident.id, r.id)}>
                      <XIcon className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          }
          {/* Assign new resource */}
          {incident.status !== "resolved" && incident.recommendation.status !== "pending" && availableResources.length > 0 && (
            <div className="border-t p-4">
              <AssignResourcePanel incidentId={incident.id} available={availableResources} onAssign={assignResource} />
            </div>
          )}
        </section>

        {/* Resolution */}
        {incident.resolution && (
          <section className="border border-ok bg-surface p-5">
            <h2 className="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 className="size-4" />Resolution</h2>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <MiniStat label="Resolved at" value={incident.resolution.resolvedAt} />
              <MiniStat label="Response time" value={`${incident.resolution.responseMinutes} min`} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground"><b>Reason:</b> {incident.resolution.reason}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground"><b>Impact:</b> {incident.resolution.impactSummary}</p>
            {incident.resolution.responderNotes && <p className="mt-2 text-sm leading-6 text-muted-foreground"><b>Responder notes:</b> {incident.resolution.responderNotes}</p>}
            {incident.resolution.resourcesUsed.length > 0 && <p className="mt-2 text-sm text-muted-foreground"><b>Resources used:</b> {incident.resolution.resourcesUsed.join(", ")}</p>}
          </section>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <aside className="space-y-5">
        {/* Decision support */}
        <section className="border-2 border-primary bg-surface">
          <div className="border-b p-4">
            <span className="label-xs">Decision support · Human approval required</span>
            <h2 className="mt-2 text-lg font-semibold">{incident.recommendation.headline}</h2>
          </div>
          <div className="p-4">
            <p className="text-sm leading-6 text-muted-foreground">{incident.recommendation.rationale}</p>

            {modifyMode ? (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold">Edit recommended actions</div>
                {modActions.map((action, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={action} onChange={(e) => { const a = [...modActions]; a[i] = e.target.value; setModActions(a); }} className="text-sm" />
                    <Button variant="ghost" size="sm" onClick={() => setModActions(modActions.filter((_, j) => j !== i))}><XIcon className="size-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setModActions([...modActions, ""])}><Plus className="size-3" />Add action</Button>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Modification note (required)" className="mt-2" />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setModifyMode(false)}>Cancel</Button>
                  <Button disabled={!note.trim() || modActions.filter(Boolean).length === 0} onClick={() => { modifyRecommendation(incident.id, modActions.filter(Boolean), note); setModifyMode(false); }}>
                    <Check />Approve modified
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <ol className="mt-4 space-y-3">{incident.recommendation.actions.map((action, index) => <li key={action} className="flex gap-3 text-sm"><span className="num grid size-5 shrink-0 place-items-center rounded-sm bg-accent text-[10px] font-bold">{index + 1}</span>{action}</li>)}</ol>

                {incident.recommendation.status === "pending" ? (
                  <>
                    <Textarea className="mt-5" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Decision note (required for rejection)" />
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button variant="outline" disabled={!note.trim()} onClick={() => rejectRecommendation(incident.id, note)}>Reject</Button>
                      <Button variant="outline" disabled={backendConnected} title={backendConnected ? "Modification is not yet supported in Live mode" : ""} onClick={() => { setModActions([...incident.recommendation.actions]); setModifyMode(true); }}><Edit className="size-3" />Modify</Button>
                      <Button onClick={() => approveRecommendation(incident.id)}><Check />Approve</Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm font-semibold text-ok">
                    <CheckCircle2 className="size-4" />{incident.recommendation.status} by {incident.recommendation.decidedBy}
                    {incident.recommendation.note && <span className="ml-1 font-normal text-muted-foreground">— {incident.recommendation.note}</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Incident status transition */}
        {incident.status !== "resolved" && incident.recommendation.status !== "pending" && (
          <section className="border bg-surface p-4">
            <h2 className="font-semibold">Incident status</h2>
            <p className="mt-1 text-xs text-muted-foreground">Current: <b>{statusLabel}</b></p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["dispatched", "on_scene", "mitigating"] as IncidentStatus[]).map((s) => (
                <Button key={s} size="sm" variant={incident.incidentStatus === s ? "default" : "outline"} onClick={() => updateIncidentStatus(incident.id, s)} className="capitalize text-xs">
                  {s.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Resolve incident */}
        {incident.status !== "resolved" && incident.recommendation.status !== "pending" && (
          <section className="border bg-surface p-4">
            {resolveMode ? (
              <div className="space-y-3">
                <h2 className="font-semibold">Resolve incident</h2>
                <div><label className="text-xs font-semibold">Resolution reason</label><Textarea className="mt-1" value={resForm.reason} onChange={(e) => setResForm({ ...resForm, reason: e.target.value })} placeholder="Why is this incident being resolved?" /></div>
                <div><label className="text-xs font-semibold">Responder notes</label><Textarea className="mt-1" value={resForm.notes} onChange={(e) => setResForm({ ...resForm, notes: e.target.value })} placeholder="Field observations, lessons learned" /></div>
                <div><label className="text-xs font-semibold">Impact / outcome summary</label><Textarea className="mt-1" value={resForm.impact} onChange={(e) => setResForm({ ...resForm, impact: e.target.value })} placeholder="Injuries, property damage, population affected" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setResolveMode(false)}>Cancel</Button>
                  <Button disabled={!resForm.reason.trim()} onClick={() => {
                    const r: Resolution = {
                      resolvedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                      reason: resForm.reason,
                      resourcesUsed: assignedResources.map((res) => res.name),
                      responderNotes: resForm.notes,
                      impactSummary: resForm.impact || "No impact summary provided.",
                      responseMinutes: Math.round((Date.now() - Date.parse("2026-01-01T" + incident.detectedAt)) / 60000) || 45,
                    };
                    resolveIncident(incident.id, r);
                    setResolveMode(false);
                  }}><CheckCircle2 className="size-3" />Resolve</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setResolveMode(true)}><CheckCircle2 className="size-3" />Resolve this incident</Button>
            )}
          </section>
        )}

        {/* Audit timeline */}
        <section className="border bg-surface">
          <div className="border-b p-4"><h2 className="font-semibold">Audit timeline</h2></div>
          <div className="p-4">{incident.timeline.map((item) => <div key={item.id} className="relative border-l pb-5 pl-5 last:pb-0"><span className="absolute -left-1 top-1 size-2 rounded-full bg-primary" /><div className="flex justify-between gap-3"><b className="text-xs">{item.stage}</b><span className="num text-[10px] text-muted-foreground">{item.at}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p><p className="mt-1 text-[10px] font-semibold">{item.actor}</p></div>)}</div>
        </section>
      </aside>
    </div>
  </Page>;
}

/* ─── ASSIGN RESOURCE PANEL ─── */
function AssignResourcePanel({ incidentId, available, onAssign }: { incidentId: string; available: { id: string; name: string; type?: string; kind: string }[]; onAssign: (incidentId: string, resourceId: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}><Plus className="size-3" />Assign a resource</Button>;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">Available resources (simulated)</div>
      {available.map((r) => (
        <button key={r.id} onClick={() => { onAssign(incidentId, r.id); setOpen(false); }} className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm hover:bg-muted">
          <span>{r.name} <span className="text-xs text-muted-foreground">· {r.type ?? r.kind}</span></span>
          <Plus className="size-3 text-primary" />
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}

/* ─── RESOURCES PAGE ─── */
export function ResourcesPage() {
  const { resources } = useAppState();
  const [kind, setKind] = useState("all");
  const list = resources.filter((item) => kind === "all" || item.kind === kind);
  const kinds = ["all", "team", "vehicle", "boat", "hospital", "shelter", "relief"];
  return <Page title="Resource coordination" description={`Teams, vehicles, hospitals and shelters in the active response zone · ${CITY.demoLabel}`} actions={<div className="flex gap-1 rounded border bg-surface p-1">{kinds.map((item) => <Button size="sm" key={item} variant={kind === item ? "default" : "ghost"} onClick={() => setKind(item)} className="capitalize">{item}</Button>)}</div>}>
    <DemoBanner />
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="border bg-surface">
        <div className="grid grid-cols-[1fr_110px_110px_100px] border-b bg-muted px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
          <span>Resource</span><span>Status</span><span>Capacity</span><span>Incident</span>
        </div>
        {list.map((resource) => (
          <div key={resource.id} className="grid grid-cols-[1fr_110px_110px_100px] items-center border-b px-4 py-4">
            <div>
              <div className="text-sm font-semibold">{resource.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{resource.type ?? resource.kind} · {resource.org}</div>
            </div>
            <span className={cn("text-xs font-semibold capitalize", resource.status === "available" ? "text-ok" : resource.status === "offline" ? "text-muted-foreground" : "text-p2")}>{resource.status.replace(/_/g, " ")}</span>
            <span className="num text-xs">{resource.crew ? `${resource.crew} crew` : resource.capacityTotal ? `${resource.capacityUsed}/${resource.capacityTotal}` : "—"}</span>
            <span className="text-xs text-muted-foreground">{resource.incidentId ? <Link to="/incidents/$incidentId" params={{ incidentId: resource.incidentId }} className="text-primary underline">{resource.incidentId}</Link> : "—"}</span>
          </div>
        ))}
      </div>
      <div className="overflow-hidden border bg-surface"><SectorMap incidents={[]} showResources /></div>
    </div>
  </Page>;
}

/* ─── RESPONDER PAGE ─── */
export function ResponderPage() {
  const { incidents, resources, updateResource } = useAppState();
  const unit = resources.find((item: any) => item._assignmentId) || resources.find((item) => item.id === "res-ndrf08");
  const incident = incidents.find((item) => item.id === unit?.incidentId);
  const stages = ["assigned", "en_route", "on_site", "assisting", "completed"] as const;
  const responderStages: { key: typeof stages[number]; label: string }[] = [
    { key: "assigned", label: "Assigned" },
    { key: "en_route", label: "En Route" },
    { key: "on_site", label: "On Scene" },
    { key: "assisting", label: "Assisting" },
    { key: "completed", label: "Completed" },
  ];

  return <Page title="Field assignment" description="NDRF Team 08 · Mobile operational view">
    <DemoBanner />
    {unit && incident && <div className="mx-auto max-w-3xl">
      <div className="border-l-4 border-p1 bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <PriorityBadge priority={incident.priority} />
            <h2 className="mt-3 text-xl font-bold">{incident.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{incident.locality}</p>
          </div>
          <span className="num text-sm font-bold">ETA {unit.etaMin ?? "—"} min</span>
        </div>
        <div className="mt-5 grid gap-3 border-y py-4 sm:grid-cols-3">
          <MiniStat label="Assignment" value={unit.name} />
          <MiniStat label="Crew" value={`${unit.crew} personnel`} />
          <MiniStat label="Route" value={unit.route ? unit.route.split("→")[0]?.trim() ?? "—" : "—"} />
        </div>

        {/* Responder status workflow */}
        <div className="mt-5">
          <div className="label-xs">Responder status</div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto">
            {responderStages.map((s, i) => {
              const currentIdx = responderStages.findIndex((st) => st.key === unit.status);
              const isActive = s.key === unit.status;
              const isDone = i < currentIdx;
              return (
                <Button key={s.key} size="sm"
                  variant={isActive ? "default" : isDone ? "outline" : "ghost"}
                  onClick={() => updateResource(unit.id, s.key)}
                  className={cn("flex-1 text-xs", isDone && "border-ok text-ok")}
                >
                  {isDone && <CheckCircle2 className="mr-1 size-3" />}
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="label-xs">Mission actions</div>
          {incident.recommendation.actions.slice(0, 3).map((action) => <div key={action} className="mt-3 flex gap-3 text-sm"><span className="mt-0.5 size-4 shrink-0 rounded border" />{action}</div>)}
        </div>
        <Button variant="outline" className="mt-3 w-full"><Navigation />Open safe route</Button>
      </div>
      <div className="mt-5 border bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-p1" />Safety briefing</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Approach from LBS Marg. Do not use the flooded Kurla bypass. Electrical isolation is not yet confirmed on Nehru Nagar lanes.</p>
      </div>
    </div>}
  </Page>;
}

/* ─── CITIZEN PAGE ─── */
export function CitizenPage() { const { alerts } = useAppState(); return <Page title={`Good afternoon, ${CITY.citizenWard}`} description="Official updates and nearby help for your area"><DemoBanner /><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="border-l-4 border-p2 bg-surface p-5"><div className="flex items-center gap-2 text-sm font-semibold text-p2"><AlertTriangle className="size-4" />Warning active</div><h2 className="mt-3 text-xl font-bold">{alerts[1]?.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{alerts[1]?.body}</p><p className="mt-4 border-t pt-4 text-sm font-semibold">{alerts[1]?.action}</p></section><section className="border bg-surface p-5"><h2 className="font-semibold">Need help?</h2><p className="mt-2 text-sm text-muted-foreground">Tell the control room what you can see. Your report is checked against nearby sensors and other reports.</p><Button className="mt-5 w-full" asChild><Link to="/report"><Camera />Report an incident</Link></Button><Button className="mt-2 w-full" variant="outline" asChild><a href="tel:1916"><Phone />Call 1916</a></Button></section></div><div className="mt-5 grid gap-5 md:grid-cols-3"><InfoLink to="/alerts" title="Official alerts" text="3 updates in your surrounding wards" icon={<AlertTriangle />} /><InfoLink to="/safety" title="Flood safety" text="What to do before, during and after" icon={<ShieldAlert />} /><InfoLink to="/sources" title="How information is checked" text="See the sources behind each update" icon={<Database />} /></div></Page>; }

/* ─── REPORT PAGE ─── */
export function ReportPage() { const { addReport } = useAppState(); const [location, setLocation] = useState("Ward L · Kurla West"); const [description, setDescription] = useState(""); const [depth, setDepth] = useState(30); const [reference, setReference] = useState(""); const [submitting, setSubmitting] = useState(false); if (reference) return <Page title="Report received" description="Your information is now in the verification queue"><div className="mx-auto max-w-xl border bg-surface p-8 text-center"><CheckCircle2 className="mx-auto size-10 text-ok" /><h2 className="mt-4 text-xl font-bold">Thank you for reporting safely</h2><p className="mt-2 text-sm text-muted-foreground">Reference <span className="num font-semibold text-foreground">{reference}</span>. This report has been matched to the nearest incident.</p><Button className="mt-5" asChild><Link to="/citizen">Return to overview</Link></Button></div></Page>; return <Page title="Report an incident" description="Only report when you are in a safe place. Do not enter flood water to take a photo."><form className="mx-auto max-w-2xl border bg-surface p-5" onSubmit={async (event) => { event.preventDefault(); if (!description.trim() || submitting) return; setSubmitting(true); try { const ref = await addReport({ location, description, depth }); setReference(ref); } finally { setSubmitting(false); } }}><label className="text-sm font-semibold">Location</label><Input className="mt-2" value={location} onChange={(event) => setLocation(event.target.value)} disabled={submitting} /><label className="mt-5 block text-sm font-semibold">What is happening?</label><Textarea className="mt-2 min-h-28" required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the water level, people at risk and any blocked roads" disabled={submitting} /><label className="mt-5 block text-sm font-semibold">Estimated water depth: <span className="num">{depth} cm</span></label><input type="range" min="0" max="150" step="5" value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="mt-3 w-full accent-primary" disabled={submitting} /><div className="mt-5 rounded border border-p2 bg-p2-soft p-3 text-xs text-p2">Your report may be combined with nearby reports. Personal contact details are not shown publicly.</div><Button className="mt-5 w-full" type="submit" disabled={submitting}><Send />{submitting ? "Sending..." : "Send report"}</Button></form></Page>; }

/* ─── ALERTS PAGE ─── */
export function AlertsPage() { const { alerts, acknowledgeAlert } = useAppState(); return <Page title="Official alerts" description="Verified warnings and travel advice issued for nearby areas"><div className="space-y-4">{alerts.map((alert) => <article key={alert.id} className={cn("border-l-4 bg-surface p-5", alert.level === "critical" ? "border-p1" : alert.level === "warning" ? "border-p2" : "border-p3")}><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex items-center gap-2"><span className="text-xs font-bold uppercase">{alert.level}</span><span className="num text-xs text-muted-foreground">{alert.at}</span></div><h2 className="mt-2 text-lg font-semibold">{alert.title}</h2><div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{alert.area}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{alert.body}</p><p className="mt-3 text-sm font-semibold">{alert.action}</p></div><Button variant={alert.acknowledged ? "ghost" : "outline"} disabled={alert.acknowledged} onClick={() => acknowledgeAlert(alert.id)}>{alert.acknowledged ? <><Check />Acknowledged</> : "Mark as read"}</Button></div></article>)}</div></Page>; }

/* ─── SAFETY PAGE ─── */
export function SafetyPage() { return <Page title="Flood safety guide" description="Official practical guidance for households in flood-prone areas"><div className="grid gap-5 md:grid-cols-3">{(["before","during","after"] as const).map((phase) => <section key={phase} className="border bg-surface"><div className="border-b p-4"><span className="label-xs">{phase} flooding</span><h2 className="mt-1 text-lg font-semibold">{phase === "before" ? "Prepare early" : phase === "during" ? "Stay safe" : "Return carefully"}</h2></div><ol className="p-4">{safetyGuide[phase].map((item, index) => <li key={item} className="mb-4 flex gap-3 text-sm leading-5"><span className="num text-primary">{String(index + 1).padStart(2,"0")}</span>{item}</li>)}</ol></section>)}</div><div className="mt-5 grid gap-3 border bg-surface p-5 sm:grid-cols-4">{safetyGuide.contacts.map((contact) => <a key={contact.value} href={`tel:${contact.value}`} className="border-r last:border-r-0"><div className="text-xs text-muted-foreground">{contact.label}</div><div className="num mt-1 text-xl font-bold">{contact.value}</div></a>)}</div></Page>; }

/* ─── SOURCES PAGE ─── */
export function SourcesPage() { return <Page title="Data sources" description="How DisasterShield combines evidence without hiding uncertainty"><div className="mb-5 border-l-4 border-primary bg-surface p-5"><h2 className="font-semibold">No single source decides an emergency</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">Signals are cross-checked by time, location and source reliability. Conflicting evidence stays visible, and consequential actions require an authorised human decision.</p></div><div className="grid gap-4 md:grid-cols-2">{dataSources.map((source) => <article key={source.name} className="border bg-surface p-5"><div className="flex justify-between"><div><span className="label-xs">{source.kind}</span><h2 className="mt-1 font-semibold">{source.name}</h2></div><span className="num text-sm font-bold">{Math.round(source.reliability * 100)}%</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{source.note}</p><div className="mt-3 border-t pt-3 text-xs text-muted-foreground">Updated {source.cadence.toLowerCase()}</div></article>)}</div></Page>; }

/* ─── ANALYTICS PAGE ─── */
export function AnalyticsPage() { const maxResponse = Math.max(...analytics.responseMinutes.map((item) => item.value)); const maxVolume = Math.max(...analytics.volume.map((item) => item.value)); return <Page title="Response analytics" description="Operational performance, verification quality and seasonal learning"><div className="grid divide-y border bg-surface sm:grid-cols-4 sm:divide-x sm:divide-y-0"><Metric label="Median response" value="31 min" detail="Improved 40% this week" tone="ok" /><Metric label="Median verification" value="12 min" /><Metric label="Auto-verified" value="62%" /><Metric label="False positives" value="9%" /></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><BarPanel title="Median response time" subtitle="Minutes by day" data={analytics.responseMinutes} max={maxResponse} /><BarPanel title="Incident volume" subtitle="Events by hour today" data={analytics.volume} max={maxVolume} /></div><div className="mt-5 border bg-surface p-5"><h2 className="font-semibold">Seasonal learning</h2><p className="mt-1 text-xs text-muted-foreground">Flood incidents recorded after deduplication</p><div className="mt-6 flex h-40 items-end gap-4">{analytics.seasons.map((item) => <div key={item.label} className="flex flex-1 flex-col items-center gap-2"><div className="num text-xs">{item.value}</div><div className="w-full bg-primary" style={{ height: `${item.value / 3}px` }} /><div className="text-xs text-muted-foreground">{item.label}</div></div>)}</div></div></Page>; }

/* ─── HELPERS ─── */
function BarPanel({ title, subtitle, data, max }: { title: string; subtitle: string; data: { label: string; value: number }[]; max: number }) { return <section className="border bg-surface p-5"><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p><div className="mt-6 space-y-3">{data.map((item) => <div key={item.label} className="grid grid-cols-[48px_1fr_34px] items-center gap-3 text-xs"><span className="text-muted-foreground">{item.label}</span><div className="h-5 bg-muted"><div className="h-full bg-primary" style={{ width: `${item.value / max * 100}%` }} /></div><span className="num text-right">{item.value}</span></div>)}</div></section>; }
function MiniStat({ label, value }: { label: string; value: string | number }) { return <div><div className="label-xs">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>; }
function InfoLink({ to, title, text, icon }: { to: "/alerts" | "/safety" | "/sources"; title: string; text: string; icon: React.ReactNode }) { return <Link to={to} className="group border bg-surface p-5 hover:border-primary"><span className="text-primary [&_svg]:size-5">{icon}</span><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p><ArrowRight className="mt-4 size-4 text-muted-foreground group-hover:text-primary" /></Link>; }
