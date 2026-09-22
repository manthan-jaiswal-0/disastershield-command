import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { databaseStatus } from "../db/connection";
import { Alert, CitizenReport, Evidence, Incident, Resource, RiverData, User, WeatherData } from "../models";
import { AppError, asyncHandler } from "../lib/errors";
import { authenticate, authorize, comparePassword, hashPassword, safeUser, signToken } from "../middleware/auth";
import { validate, coordinateSchema } from "../middleware/validation";
import { all, create, findById, list, remove, seed, update } from "../services/repository";
import { calculateEvidence, calculatePriority, calculateRisk, distanceMeters } from "../services/engines";
import { sourceManager } from "../services/sources";
import { imageClassifier, mapBackendToIntelligenceRequest, executeIntelligenceAnalysis, mapIntelligenceToBackendSnapshot } from "../services/ai";

const router = Router();
const uploadDir = path.resolve(env.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
const pageParams = (req: any) => ({ page: Math.max(1, Number(req.query.page ?? 1)), limit: Math.min(100, Math.max(1, Number(req.query.limit ?? 20))) });
const paginated = (data: unknown[], total: number, page: number, limit: number) => ({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
const idSchema = z.object({ id: z.string().min(1) });
const incidentSchema = coordinateSchema.extend({ title: z.string().min(3).max(200), description: z.string().min(3).max(5000), type: z.enum(["FLOOD", "WATERLOGGING", "EXTREME_RAINFALL", "RIVER_RISK", "LANDSLIDE", "CYCLONE", "OTHER"]), severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(), address: z.string().max(300).optional(), district: z.string().max(100).optional(), state: z.string().max(100).optional(), affectedPopulation: z.coerce.number().min(0).optional(), affectedInfrastructure: z.coerce.number().min(0).optional(), rainfall: z.coerce.number().min(0).optional(), riverLevel: z.coerce.number().min(0).optional(), officialWarning: z.boolean().optional(), metadata: z.record(z.string(), z.unknown()).optional() });
const reportSchema = coordinateSchema.extend({ type: z.string().min(2), description: z.string().min(3).max(5000), address: z.string().max(300).optional() });
const resourceSchema = z.object({
  name: z.string(),
  type: z.string(),
  availabilityStatus: z.enum(["AVAILABLE", "UNAVAILABLE", "OFFLINE"]).default("AVAILABLE"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  organization: z.string().optional(),
  contact: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const incidentStatusSchema = z.object({
  incidentStatus: z.enum([
    "detected", "verifying", "verified", "prioritized", "awaiting_approval", 
    "approved", "resources_assigned", "dispatched", "on_scene", "mitigating", 
    "resolved", "rejected", "closed"
  ])
});

const riskCalcSchema = z.object({
  rainfall: z.coerce.number().min(0).optional(),
  officialWarning: z.boolean().optional(),
  riverLevel: z.coerce.number().min(0).optional(),
  affectedPopulation: z.coerce.number().min(0).optional(),
  affectedInfrastructure: z.coerce.number().min(0).optional(),
  citizenReports: z.coerce.number().min(0).optional()
}).strict();

const priorityCalcSchema = z.object({
  riskScore: z.coerce.number().min(0).optional(),
  evidenceScore: z.coerce.number().min(0).optional(),
  affectedPopulation: z.coerce.number().min(0).optional(),
  affectedInfrastructure: z.coerce.number().min(0).optional(),
  severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(),
  officialWarning: z.boolean().optional(),
  recent: z.boolean().optional()
}).strict();

const reportUpdateSchema = z.object({
  type: z.string().min(2).optional(),
  description: z.string().min(3).max(5000).optional(),
  address: z.string().max(300).optional()
}).strict();

router.get("/", (_req, res) => res.json({ success: true, message: "DisasterShield API is running" }));
router.get("/health", (_req, res) => res.json({ success: true, status: "healthy", database: databaseStatus().status, environment: env.nodeEnv, timestamp: new Date().toISOString(), uptime: process.uptime() }));
router.get("/healthz", (_req, res) => res.json({ status: "ok", database: databaseStatus().status }));

router.post("/auth/register", validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), phone: z.string().optional(), location: z.record(z.string(), z.unknown()).optional() })), asyncHandler(async (req, res) => {
  const existing = await list("User", User, { email: req.body.email }, 1, 1);
  if (existing.total) throw new AppError("Email is already registered", 409, "DUPLICATE_RESOURCE");
  const user = await create("User", User, { ...req.body, role: "CITIZEN", password: await hashPassword(req.body.password) });
  const authUser = safeUser(user); res.status(201).json({ success: true, data: { user: authUser, token: signToken(authUser), refreshToken: signToken(authUser, env.refreshExpiresIn) } });
}));
router.post("/auth/login", validate(z.object({ email: z.string().email(), password: z.string().min(1) })), asyncHandler(async (req, res) => {
  let found;
  if (env.isMock) {
    found = (await list("User", User, { email: req.body.email }, 1, 1)).data[0] as any;
  } else {
    found = await User.findOne({ email: req.body.email }).select("+password");
  }
  if (!found || !(await comparePassword(req.body.password, found.password))) throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  const authUser = safeUser(found); res.json({ success: true, data: { user: authUser, token: signToken(authUser), refreshToken: signToken(authUser, env.refreshExpiresIn) } });
}));
router.get("/auth/me", authenticate, (req, res) => res.json({ success: true, data: req.user }));
router.post("/auth/refresh", validate(z.object({ refreshToken: z.string().min(1) })), asyncHandler(async (req, res) => {
  try { const payload = jwt.verify(req.body.refreshToken, env.jwtSecret) as { id: string }; const found = await findById("User", User, payload.id); if (!found) throw new Error("User not found"); const user = safeUser(found); res.json({ success: true, data: { token: signToken(user) } }); }
  catch { throw new AppError("Invalid refresh token", 401, "INVALID_TOKEN"); }
}));
router.post("/auth/logout", authenticate, (_req, res) => res.json({ success: true, data: { loggedOut: true } }));

router.post("/incidents", authenticate, validate(incidentSchema), asyncHandler(async (req, res) => {
  const candidates = (await list("Incident", Incident, { type: req.body.type }, 1, 1000)).data as any[];
  const duplicate = candidates.find((item) => item.latitude !== undefined && distanceMeters(req.body, item) <= env.duplicateRadiusMeters && Date.now() - new Date(item.createdAt ?? 0).getTime() <= env.duplicateTimeMinutes * 60000);
  if (duplicate) return res.status(409).json({ success: false, isDuplicate: true, matchedIncidentId: duplicate._id, confidence: 85, errorCode: "DUPLICATE_RESOURCE" });
  const item = await create("Incident", Incident, { ...req.body, reportedBy: req.user?.id, source: "CITIZEN", location: { type: "Point", coordinates: [req.body.longitude, req.body.latitude] } });
  return res.status(201).json({ success: true, data: item });
}));
router.get("/incidents", authenticate, asyncHandler(async (req, res) => { const { page, limit } = pageParams(req); const result = await list("Incident", Incident, req.query as any, page, limit); res.json(paginated(result.data, result.total, page, limit)); }));
router.get("/incidents/nearby", authenticate, asyncHandler(async (req, res) => {
  const coords = coordinateSchema.extend({ radius: z.coerce.number().min(1).max(100000).default(5000) }).parse(req.query);
  const result = await list("Incident", Incident, {}, 1, 1000); const data = (result.data as any[]).filter((item) => distanceMeters(coords, item) <= coords.radius);
  res.json({ success: true, data });
}));
router.get("/incidents/:id", authenticate, validate(idSchema, "params"), asyncHandler(async (req, res) => { const item = await findById("Incident", Incident, req.params.id); if (!item) throw new AppError("Incident not found", 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
router.patch("/incidents/:id", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => {
  const protectedFields = [
    "status", "dataMode", 
    "riskScore", "riskLevel", "riskFactors", "riskReasons",
    "evidenceScore", "evidenceLevel", "verification",
    "priorityScore", "priorityLevel", "priority",
    "gisImpact", "intelligenceResult", "recommendation", "approval", "resolution", "resources"
  ];
  
    const invalidUpdates = Object.keys(req.body).filter(key => 
      protectedFields.includes(key) || protectedFields.some(pf => key.startsWith(`${pf}.`))
    );
  if (invalidUpdates.length > 0) {
    throw new AppError(`Cannot directly mutate protected governance fields: ${invalidUpdates.join(", ")}`, 403, "FORBIDDEN_FIELD_MUTATION");
  }
  const mongoOperators = Object.keys(req.body).filter(key => key.startsWith("$"));
  if (mongoOperators.length > 0) {
    throw new AppError(`MongoDB operators are not allowed in updates: ${mongoOperators.join(", ")}`, 403, "FORBIDDEN_OPERATOR");
  }

  const item = await update("Incident", Incident, req.params.id, { ...req.body, lastUpdatedAt: new Date() }); 
  if (!item) throw new AppError("Incident not found", 404, "NOT_FOUND"); 
  res.json({ success: true, data: item }); 
}));
router.delete("/incidents/:id", authenticate, authorize("ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => { if (!(await remove("Incident", Incident, req.params.id))) throw new AppError("Incident not found", 404, "NOT_FOUND"); res.json({ success: true, data: { deleted: true } }); }));
router.post("/incidents/:id/assign", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => { 
  const incident = await findById("Incident", Incident, req.params.id);
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  if (incident.status !== "APPROVED") {
    throw new AppError("Cannot assign resources to an incident that is not APPROVED.", 403, "APPROVAL_REQUIRED");
  }
  const item = await update("Incident", Incident, req.params.id, { assignedTo: req.body.userId, status: "RESPONDING" }); 
  res.json({ success: true, data: item }); 
}));

router.post("/incidents/:id/status", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), validate(incidentStatusSchema), asyncHandler(async (req, res) => {
  const incident = await findById("Incident", Incident, req.params.id) as any;
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  
  const { incidentStatus } = req.body;
  
  // Governance Gate
  const operationalPostApproval = ["approved", "resources_assigned", "dispatched", "on_scene", "mitigating"];
  const unapprovedCanonical = ["DETECTED", "VERIFIED", "AWAITING_APPROVAL", "REJECTED"];
  
  if (unapprovedCanonical.includes(incident.status) && operationalPostApproval.includes(incidentStatus)) {
    throw new AppError("Cannot progress to operational status before human approval.", 403, "APPROVAL_REQUIRED");
  }

  const now = new Date();
  const userName = req.user?.name || "Unknown";
  
  const timelineEvent = {
    timestamp: now,
    actor: userName,
    actorRole: req.user?.role || "Unknown",
    action: "UPDATE_INCIDENT_STATUS",
    description: `Incident operational status changed to: ${incidentStatus.replace(/_/g, " ")}`
  };

  const item = await update("Incident", Incident, req.params.id, { 
    incidentStatus,
    timeline: [...(incident.timeline || []), timelineEvent],
    lastUpdatedAt: now
  }); 
  res.json({ success: true, data: item }); 
}));
router.post("/incidents/:id/verify", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => { 
  const incident = await findById("Incident", Incident, req.params.id);
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  if (incident.status === "AWAITING_APPROVAL") {
    throw new AppError("Cannot manually verify an incident that is already awaiting approval. The AI verification phase is complete.", 403, "INVALID_STATE_TRANSITION");
  }
  const item = await update("Incident", Incident, req.params.id, { status: "VERIFIED" }); 
  res.json({ success: true, data: item }); 
}));
router.post("/incidents/:id/resolve", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => { 
  const incident = await findById("Incident", Incident, req.params.id) as any;
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  if (incident.status === "AWAITING_APPROVAL") {
    throw new AppError("Cannot resolve an incident that is awaiting approval. It must be explicitly approved or rejected first.", 403, "APPROVAL_REQUIRED");
  }

  const now = new Date();
  const userName = req.user?.name || "Unknown";
  const userRole = req.user?.role || "Unknown";
  
  const resolutionData = req.body.resolution || {};
  const resolution = {
    ...resolutionData,
    resolvedAt: now,
  };

  const timelineEvent = {
    timestamp: now,
    actor: userName,
    actorRole: userRole,
    action: "RESOLVE_INCIDENT",
    description: `Incident resolved by ${userName}. ${resolution.reason ? `Reason: ${resolution.reason}` : ''}`
  };

  const item = await update("Incident", Incident, req.params.id, { 
    status: "RESOLVED", 
    resolvedAt: now,
    resolution,
    timeline: [...(incident.timeline || []), timelineEvent],
    lastUpdatedAt: now
  }); 
  res.json({ success: true, data: item }); 
}));

router.post("/incidents/:id/approve", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => {
  const incident = await findById("Incident", Incident, req.params.id) as any;
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  if (incident.status !== "AWAITING_APPROVAL") {
    throw new AppError("Incident is not awaiting approval.", 409, "INVALID_STATE_TRANSITION");
  }

  const now = new Date();
  const userName = req.user?.name || "Unknown";
  const userRole = req.user?.role || "Unknown";
  const note = req.body.note || undefined;

  const approvalData = {
    status: "APPROVED",
    decidedBy: userName,
    decidedAt: now,
    decision: "APPROVED",
    note: note,
    recommendationVersion: incident.approval?.recommendationVersion || 1
  };

  const timelineEvent = {
    timestamp: now,
    actor: userName,
    actorRole: userRole,
    action: "APPROVE_INCIDENT",
    description: `Incident recommendation approved by ${userName}. ${note ? `Note: ${note}` : ''}`
  };

  const updatePayload = {
    status: "APPROVED",
    approval: approvalData,
    timeline: [...(incident.timeline || []), timelineEvent],
    lastUpdatedAt: now
  };

  const item = await update("Incident", Incident, req.params.id, updatePayload);
  res.json({ success: true, data: item });
}));

router.post("/incidents/:id/reject", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => {
  const incident = await findById("Incident", Incident, req.params.id) as any;
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  if (incident.status !== "AWAITING_APPROVAL") {
    throw new AppError("Incident is not awaiting approval.", 409, "INVALID_STATE_TRANSITION");
  }

  const now = new Date();
  const userName = req.user?.name || "Unknown";
  const userRole = req.user?.role || "Unknown";
  const reason = req.body.reason || req.body.note || undefined;

  const approvalData = {
    status: "REJECTED",
    decidedBy: userName,
    decidedAt: now,
    decision: "REJECTED",
    note: reason,
    recommendationVersion: incident.approval?.recommendationVersion || 1
  };

  const timelineEvent = {
    timestamp: now,
    actor: userName,
    actorRole: userRole,
    action: "REJECT_INCIDENT",
    description: `Incident recommendation rejected by ${userName}. ${reason ? `Reason: ${reason}` : ''}`
  };

  const updatePayload = {
    status: "REJECTED",
    approval: approvalData,
    timeline: [...(incident.timeline || []), timelineEvent],
    lastUpdatedAt: now
  };

  const item = await update("Incident", Incident, req.params.id, updatePayload);
  res.json({ success: true, data: item });
}));

router.post("/incidents/:id/analyze", authenticate, authorize("RESPONDER", "ADMIN"), validate(idSchema, "params"), asyncHandler(async (req, res) => {
  const incident = await findById("Incident", Incident, req.params.id);
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  
  const evidenceResult = await list("Evidence", Evidence, { incident: req.params.id }, 1, 100);
  const evidenceItems = evidenceResult.data as any[];
  
  const reportIds = evidenceItems.filter(e => e.type === "CITIZEN_REPORT" && e.report).map(e => e.report);
  const reports = [];
  for (const rid of reportIds) {
    const report = await findById("CitizenReport", CitizenReport, rid);
    if (report) reports.push(report);
  }
  
  const images = evidenceItems.filter(e => e.type === "PHOTO");
  
  let currentGisImpact = incident.gisImpact;
  if (incident.latitude != null && incident.longitude != null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const gisUrl = process.env.GIS_SERVICE_URL || "http://localhost:8001";
      const gisResponse = await fetch(`${gisUrl}/api/impact/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: Number(incident.latitude),
          longitude: Number(incident.longitude),
          hazardType: incident.type || "unknown",
          radiusMeters: 500
        }),
        signal: controller.signal
      });
      if (!gisResponse.ok) {
        console.warn(`GIS service returned HTTP ${gisResponse.status}`);
        currentGisImpact = null;
      } else {
        const gisData = await gisResponse.json();
        if (gisData && typeof gisData === 'object' && 'impactArea' in gisData) {
          currentGisImpact = gisData;
        } else {
          console.warn("GIS service returned structurally invalid data");
          currentGisImpact = null;
        }
      }
    } catch (gisError) {
      console.warn("GIS service unavailable or timed out:", gisError);
      currentGisImpact = null;
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    console.warn("Incident missing coordinates, skipping GIS analysis");
    currentGisImpact = null;
  }

  const payload = mapBackendToIntelligenceRequest(incident, reports, images, currentGisImpact);

  let updatePayload: any;
  let fallbackError: Error | null = null;

  try {
    const aiResponse = await executeIntelligenceAnalysis(payload);
    updatePayload = mapIntelligenceToBackendSnapshot(aiResponse);
    updatePayload.status = "AWAITING_APPROVAL";
    updatePayload.lastUpdatedAt = new Date();
    updatePayload.gisImpact = currentGisImpact;
  } catch (error) {
    console.warn("Intelligence analysis failed, falling back to legacy engines:", error);
    fallbackError = error as Error;
    
    const riskResult = calculateRisk(incident);
    const evidenceResultCalc = calculateEvidence({ 
      sources: evidenceItems, 
      independentSources: evidenceResult.total, 
      photo: images.length > 0, 
      fresh: true 
    });
    const priorityResult = calculatePriority({ 
      ...incident, 
      riskScore: riskResult.score, 
      evidenceScore: evidenceResultCalc.score 
    });
    
    updatePayload = {
      status: "AWAITING_APPROVAL", // Added to allow integration testing flow
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      evidenceScore: evidenceResultCalc.score,
      evidenceLevel: evidenceResultCalc.level,
      priorityScore: priorityResult.score,
      priorityLevel: priorityResult.level,
      lastUpdatedAt: new Date(),
      gisImpact: currentGisImpact
    };
  }

  // Database persistence is strictly outside the AI failure catch boundary.
  // If MongoDB fails here, the error propagates up to the standard asyncHandler (HTTP 500).
  const saved = await update("Incident", Incident, req.params.id, updatePayload);
  
  if (fallbackError) {
    res.json({ success: true, data: saved, fallback: true, error: fallbackError.message });
  } else {
    res.json({ success: true, data: saved });
  }
}));

router.post("/reports", authenticate, upload.single("image"), validate(reportSchema), asyncHandler(async (req, res) => {
  const file = req.file; const item = await create("CitizenReport", CitizenReport, { ...req.body, reporter: req.user?.id, image: file?.path, metadata: { aiAnalysis: await imageClassifier.analyzeIncidentImage() }, location: { type: "Point", coordinates: [req.body.longitude, req.body.latitude] } });
  await create("Evidence", Evidence, { report: item._id, type: file ? "PHOTO" : "CITIZEN_REPORT", source: "CITIZEN", path: file?.path, confidence: file ? 50 : 25, createdBy: req.user?.id });
  res.status(201).json({ success: true, data: item });
}));
router.get("/reports", authenticate, asyncHandler(async (req, res) => { const { page, limit } = pageParams(req); const result = await list("CitizenReport", CitizenReport, req.query as any, page, limit); res.json(paginated(result.data, result.total, page, limit)); }));
router.get("/reports/:id", authenticate, asyncHandler(async (req, res) => { const item = await findById("CitizenReport", CitizenReport, req.params.id); if (!item) throw new AppError("Report not found", 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
router.patch("/reports/:id", authenticate, authorize("RESPONDER", "ADMIN"), validate(reportUpdateSchema), asyncHandler(async (req, res) => { const item = await update("CitizenReport", CitizenReport, req.params.id, req.body); if (!item) throw new AppError("Report not found", 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
router.post("/reports/:id/verify", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (req, res) => { const item = await update("CitizenReport", CitizenReport, req.params.id, { status: "VERIFIED", verificationStatus: "VERIFIED", confidence: 90 }); if (!item) throw new AppError("Report not found", 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
router.post("/reports/:id/reject", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (req, res) => { const item = await update("CitizenReport", CitizenReport, req.params.id, { status: "REJECTED", verificationStatus: "REJECTED" }); if (!item) throw new AppError("Report not found", 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));

const adminCrud = (route: string, name: string, model: any, schema: z.ZodObject<any, any>) => {
  router.get(`/${route}`, authenticate, asyncHandler(async (req, res) => { const { page, limit } = pageParams(req); const result = await list(name, model, req.query as any, page, limit); res.json(paginated(result.data, result.total, page, limit)); }));
  router.get(`/${route}/:id`, authenticate, asyncHandler(async (req, res) => { const item = await findById(name, model, req.params.id); if (!item) throw new AppError(`${name} not found`, 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
  router.post(`/${route}`, authenticate, authorize("RESPONDER", "ADMIN"), validate(schema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await create(name, model, req.body) })));
  router.patch(`/${route}/:id`, authenticate, authorize("RESPONDER", "ADMIN"), validate(schema.partial()), asyncHandler(async (req, res) => { const item = await update(name, model, req.params.id, req.body); if (!item) throw new AppError(`${name} not found`, 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
  router.delete(`/${route}/:id`, authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => { if (!(await remove(name, model, req.params.id))) throw new AppError(`${name} not found`, 404, "NOT_FOUND"); res.json({ success: true, data: { deleted: true } }); }));
};
router.get("/alerts/active", authenticate, asyncHandler(async (_req, res) => { const result = await list("Alert", Alert, { active: true }, 1, 100); res.json({ success: true, data: result.data }); }));
router.get("/weather/nearby", authenticate, asyncHandler(async (req, res) => { const coords = coordinateSchema.parse(req.query); const result = await list("WeatherData", WeatherData, {}, 1, 1000); res.json({ success: true, data: (result.data as any[]).filter((item) => distanceMeters(coords, item) <= 50000) }); }));
router.get("/weather/:location", authenticate, asyncHandler(async (req, res) => { const result = await list("WeatherData", WeatherData, { location: req.params.location }, 1, 100); res.json({ success: true, data: result.data }); }));
router.get("/rivers/nearby", authenticate, asyncHandler(async (req, res) => { const coords = coordinateSchema.parse(req.query); const result = await list("RiverData", RiverData, {}, 1, 1000); res.json({ success: true, data: (result.data as any[]).filter((item) => distanceMeters(coords, item) <= 50000) }); }));
adminCrud("alerts", "Alert", Alert, z.object({ title: z.string(), message: z.string(), type: z.string(), severity: z.string(), source: z.string().optional(), sourceId: z.string().optional(), affectedArea: z.string().optional(), latitude: z.coerce.number().optional(), longitude: z.coerce.number().optional(), issuedAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional(), active: z.boolean().optional(), metadata: z.record(z.string(), z.unknown()).optional() }));
router.get("/alerts/active", authenticate, asyncHandler(async (_req, res) => { const result = await list("Alert", Alert, { active: true }, 1, 100); res.json({ success: true, data: result.data }); }));
adminCrud("weather", "WeatherData", WeatherData, z.object({ source: z.string(), location: z.string().optional(), latitude: z.coerce.number(), longitude: z.coerce.number(), rainfall: z.coerce.number().optional(), rainfall24h: z.coerce.number().optional(), rainfall3h: z.coerce.number().optional(), observedAt: z.coerce.date().optional(), rawMetadata: z.record(z.string(), z.unknown()).optional() }));
adminCrud("rivers", "RiverData", RiverData, z.object({ source: z.string(), stationId: z.string(), stationName: z.string().optional(), riverName: z.string().optional(), latitude: z.coerce.number(), longitude: z.coerce.number(), waterLevel: z.coerce.number().optional(), dangerLevel: z.coerce.number().optional(), warningLevel: z.coerce.number().optional(), observedAt: z.coerce.date().optional() }));

// Explicit CRUD for resources to protect availabilityStatus
router.get("/resources", authenticate, asyncHandler(async (req, res) => { const page = Number(req.query.page ?? 1); const limit = Number(req.query.limit ?? 20); res.json(await list("Resource", Resource, req.query, page, limit)); }));
router.get("/resources/:id", authenticate, asyncHandler(async (req, res) => { const item = await findById("Resource", Resource, req.params.id); if (!item) throw new AppError("Resource not found", 404, "NOT_FOUND"); res.json({ success: true, data: item }); }));
router.post("/resources", authenticate, authorize("RESPONDER", "ADMIN"), validate(resourceSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await create("Resource", Resource, req.body) })));
router.patch("/resources/:id", authenticate, authorize("RESPONDER", "ADMIN"), validate(resourceSchema.partial()), asyncHandler(async (req, res) => {
  const allowedUpdates = { ...req.body };
  delete allowedUpdates.availabilityStatus;
  const item = await update("Resource", Resource, req.params.id, allowedUpdates);
  if (!item) throw new AppError("Resource not found", 404, "NOT_FOUND");
  res.json({ success: true, data: item });
}));
router.delete("/resources/:id", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => { if (!(await remove("Resource", Resource, req.params.id))) throw new AppError("Resource not found", 404, "NOT_FOUND"); res.json({ success: true, data: { deleted: true } }); }));

router.get("/alerts/active", authenticate, asyncHandler(async (_req, res) => res.json({ success: true, data: (await list("Alert", Alert, { active: true }, 1, 100)).data })));

router.post("/weather/sync", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (_req, res) => { const source = sourceManager.sources.IMD; const data = await source.fetchWeather(); if (!data) throw new AppError("IMD source is unavailable or not configured", 503, "SOURCE_UNAVAILABLE"); res.json({ success: true, sourceStatus: source.getStatus(), data }); }));
router.get("/weather/:location", authenticate, asyncHandler(async (req, res) => { const result = await list("WeatherData", WeatherData, { location: req.params.location }, 1, 100); res.json({ success: true, data: result.data }); }));
router.get("/weather/nearby", authenticate, asyncHandler(async (req, res) => { const coords = coordinateSchema.parse(req.query); const result = await list("WeatherData", WeatherData, {}, 1, 1000); res.json({ success: true, data: (result.data as any[]).filter((item) => distanceMeters(coords, item) <= 50000) }); }));
router.post("/rivers/sync", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (_req, res) => { const source = sourceManager.sources.CWC; const data = await source.fetchRiverData(); if (!data) return res.status(503).json({ success: false, sourceStatus: "unavailable", errorCode: "SOURCE_UNAVAILABLE" }); return res.json({ success: true, sourceStatus: source.getStatus(), data }); }));
router.get("/rivers/nearby", authenticate, asyncHandler(async (req, res) => { const coords = coordinateSchema.parse(req.query); const result = await list("RiverData", RiverData, {}, 1, 1000); res.json({ success: true, data: (result.data as any[]).filter((item) => distanceMeters(coords, item) <= 50000) }); }));

router.get("/risk/:incidentId", authenticate, asyncHandler(async (req, res) => { const item = await findById("Incident", Incident, req.params.incidentId); if (!item) throw new AppError("Incident not found", 404, "NOT_FOUND"); res.json({ success: true, data: calculateRisk(item) }); }));
router.post("/risk/calculate/:incidentId", authenticate, authorize("RESPONDER", "ADMIN"), validate(riskCalcSchema), asyncHandler(async (req, res) => { const item = await findById("Incident", Incident, req.params.incidentId); if (!item) throw new AppError("Incident not found", 404, "NOT_FOUND"); const result = calculateRisk({ ...item, ...req.body }); const saved = await update("Incident", Incident, req.params.incidentId, { riskScore: result.score, riskLevel: result.level }); res.json({ success: true, data: { ...result, incident: saved } }); }));
router.get("/evidence/:incidentId", authenticate, asyncHandler(async (req, res) => { const result = await list("Evidence", Evidence, { incident: req.params.incidentId }, 1, 100); res.json({ success: true, data: calculateEvidence({ sources: result.data, independentSources: result.total, photo: (result.data as any[]).some((x) => x.type === "PHOTO"), fresh: true }) }); }));
router.post("/evidence/calculate/:incidentId", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (req, res) => { const result = calculateEvidence(req.body); res.json({ success: true, data: result }); }));
router.get("/priority", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (_req, res) => { const result = await list("Incident", Incident, {}, 1, 1000); res.json({ success: true, data: (result.data as any[]).sort((a, b) => b.priorityScore - a.priorityScore) }); }));
router.get("/priority/:incidentId", authenticate, asyncHandler(async (req, res) => { const item = await findById("Incident", Incident, req.params.incidentId); if (!item) throw new AppError("Incident not found", 404, "NOT_FOUND"); res.json({ success: true, data: calculatePriority(item) }); }));
router.post("/priority/calculate/:incidentId", authenticate, authorize("RESPONDER", "ADMIN"), validate(priorityCalcSchema), asyncHandler(async (req, res) => { const item = await findById("Incident", Incident, req.params.incidentId); if (!item) throw new AppError("Incident not found", 404, "NOT_FOUND"); const result = calculatePriority({ ...item, ...req.body }); const saved = await update("Incident", Incident, req.params.incidentId, { priorityScore: result.score, priorityLevel: result.level }); res.json({ success: true, data: { ...result, incident: saved } }); }));

router.post("/resources/:id/assign", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (req, res) => {
  const { incidentId } = req.body;
  if (!incidentId) throw new AppError("incidentId is required", 400, "BAD_REQUEST");
  
  const incident = await findById("Incident", Incident, incidentId);
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  if (incident.status !== "APPROVED") throw new AppError("Incident must be APPROVED before assigning resources", 403, "FORBIDDEN");
  
  let resource;
  if (env.isMock) {
    const collection = all("Resource");
    const item = collection.find(r => (r._id === req.params.id || r.id === req.params.id) && r.availabilityStatus === "AVAILABLE");
    if (item) {
      item.availabilityStatus = "UNAVAILABLE";
      resource = item;
    }
  } else {
    resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, availabilityStatus: "AVAILABLE" },
      { $set: { availabilityStatus: "UNAVAILABLE" } },
      { new: true }
    );
  }
  if (!resource) throw new AppError("Resource is not available or not found", 409, "CONFLICT");
  
  const assignment = {
    resourceId: resource._id || resource.id,
    status: "ASSIGNED",
    assignedAt: new Date()
  };
  
  try {
    let updatedIncident;
    if (env.isMock) {
      const incColl = all("Incident");
      const incItem = incColl.find(i => i._id === incidentId || i.id === incidentId);
      if (!incItem) throw new Error("Incident update failed");
      if (!incItem.resources) incItem.resources = [];
      const newId = crypto.randomBytes(12).toString("hex");
      const asg = { ...assignment, _id: newId, assignmentId: newId, id: newId };
      incItem.resources.push(asg);
      updatedIncident = incItem;
    } else {
      updatedIncident = await Incident.findByIdAndUpdate(
        incidentId,
        { $push: { resources: assignment } },
        { new: true }
      );
      if (!updatedIncident) throw new Error("Incident update failed");
    }
    res.json({ success: true, data: { resource, incident: updatedIncident } });
  } catch (err) {
    if (env.isMock) {
      resource.availabilityStatus = "AVAILABLE";
    } else {
      await Resource.updateOne({ _id: req.params.id }, { $set: { availabilityStatus: "AVAILABLE" } });
    }
    throw new AppError("Failed to assign resource", 500, "INTERNAL_ERROR");
  }
}));

router.post("/responders/:id/status", authenticate, authorize("RESPONDER", "ADMIN"), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["ASSIGNED", "EN_ROUTE", "ON_SCENE", "ASSISTING", "COMPLETED"].includes(status)) {
    throw new AppError("Invalid status", 400, "BAD_REQUEST");
  }

  const assignmentId = req.params.id;
  
  if (env.isMock) {
    const incidents = all("Incident");
    let foundAssignment = null;
    let foundIncident = null;
    for (const inc of incidents) {
      if (inc.resources) {
        const asg = (inc.resources as Record<string, any>[]).find((a) => a._id?.toString() === assignmentId || a.assignmentId === assignmentId || a.id === assignmentId);
        if (asg) {
          foundAssignment = asg;
          foundIncident = inc;
          break;
        }
      }
    }
    if (!foundAssignment) throw new AppError("Assignment not found", 404, "NOT_FOUND");
    
    foundAssignment.status = status;
    if (status === "COMPLETED") {
      const resources = all("Resource");
      const resItem = resources.find(r => r._id?.toString() === foundAssignment.resourceId?.toString() || r.id === foundAssignment.resourceId?.toString());
      if (resItem) resItem.availabilityStatus = "AVAILABLE";
    }
    res.json({ success: true, data: foundIncident });
  } else {
    const incident = await Incident.findOne({ "resources._id": assignmentId });
    if (!incident) throw new AppError("Assignment not found", 404, "NOT_FOUND");
    
    const assignment = incident.resources.id(assignmentId);
    if (!assignment) throw new AppError("Assignment not found", 404, "NOT_FOUND");
    
    assignment.status = status;
    await incident.save();
    
    if (status === "COMPLETED") {
      await Resource.updateOne({ _id: assignment.resourceId }, { $set: { availabilityStatus: "AVAILABLE" } });
    }
    res.json({ success: true, data: incident });
  }
}));


router.get("/dashboard/source-status", authenticate, (_req, res) => res.json({ success: true, data: [...sourceManager.sourceStatuses(), { name: "Citizen Reports", configured: true, connected: true, dataMode: env.isMock ? "MOCK" : "LIVE" }] }));
router.get("/dashboard/national-risk", authenticate, asyncHandler(async (_req, res) => { const incidents = (await list("Incident", Incident, {}, 1, 1000)).data as any[]; const active = incidents.filter((item) => !["RESOLVED", "REJECTED"].includes(item.status)); const score = Math.min(100, active.reduce((sum, item) => sum + Number(item.riskScore ?? 0), 0) / Math.max(1, active.length) + Math.min(30, active.length * 2)); const level = score >= 76 ? "CRITICAL" : score >= 51 ? "HIGH" : score >= 26 ? "MODERATE" : "LOW"; res.json({ success: true, data: { level, score: Math.round(score), activeRegions: [...new Set(active.map((item) => item.state).filter(Boolean))], majorFactors: active.slice(0, 5).map((item) => item.title) } }); }));
router.get("/dashboard/overview", authenticate, asyncHandler(async (_req, res) => { const [incidents, alerts, reports, resources] = await Promise.all([list("Incident", Incident, {}, 1, 1000), list("Alert", Alert, { active: true }, 1, 1000), list("CitizenReport", CitizenReport, {}, 1, 1000), list("Resource", Resource, {}, 1, 1000)]); const items = incidents.data as any[]; res.json({ success: true, data: { totalActiveIncidents: items.filter((x) => !["RESOLVED", "REJECTED"].includes(x.status)).length, criticalIncidents: items.filter((x) => x.severity === "CRITICAL").length, highRiskIncidents: items.filter((x) => ["HIGH", "CRITICAL"].includes(x.riskLevel)).length, activeAlerts: alerts.total, citizenReports: reports.total, availableResources: (resources.data as any[]).filter((x) => x.availabilityStatus === "AVAILABLE").length, recentIncidents: items.slice(-10).reverse(), priorityIncidents: items.filter((x) => ["HIGH", "URGENT"].includes(x.priorityLevel)).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 10), sourceStatus: sourceManager.sourceStatuses() } }); }));

router.get("/geo/nearby", authenticate, asyncHandler(async (req, res) => { const coords = coordinateSchema.parse(req.query); const type = String(req.query.type ?? "hospital"); const source = sourceManager.sources.OSM; if (!source.getStatus().configured) throw new AppError("OSM source is not configured", 503, "SOURCE_UNAVAILABLE"); res.json({ success: true, data: [], sourceStatus: source.getStatus(), query: { ...coords, type, radius: Number(req.query.radius ?? 5000) } }); }));
router.post("/routing/route", authenticate, asyncHandler(async (_req, res) => { const source = sourceManager.sources.OSRM; if (!source.getStatus().configured) throw new AppError("OSRM source is not configured", 503, "SOURCE_UNAVAILABLE"); res.json({ success: false, message: "OSRM route normalization is not configured for this endpoint", errorCode: "SOURCE_UNAVAILABLE" }); }));

export default router;