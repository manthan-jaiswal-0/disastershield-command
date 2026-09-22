import mongoose, { Schema, type Model } from "mongoose";

const geo = { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], default: [0, 0] } };
const timestamps = true;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true, select: false },
  phone: String,
  role: { type: String, enum: ["CITIZEN", "RESPONDER", "ADMIN"], default: "CITIZEN" },
  location: { latitude: Number, longitude: Number, address: String, district: String, state: String },
  isActive: { type: Boolean, default: true },
}, { timestamps });


const resourceAssignmentSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
  status: { type: String, enum: ["ASSIGNED", "EN_ROUTE", "ON_SCENE", "ASSISTING", "COMPLETED"], required: true },
  assignedAt: { type: Date, default: Date.now },
}, { _id: true });

resourceAssignmentSchema.virtual('assignmentId').get(function() {
  return this._id.toHexString();
});
resourceAssignmentSchema.set('toJSON', { virtuals: true });
resourceAssignmentSchema.set('toObject', { virtuals: true });

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  availabilityStatus: { type: String, enum: ["AVAILABLE", "UNAVAILABLE", "OFFLINE"], default: "AVAILABLE" },
  baseLocation: { latitude: Number, longitude: Number },
  organization: String, contact: String, metadata: Schema.Types.Mixed,
}, { timestamps });

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true, enum: ["FLOOD", "WATERLOGGING", "EXTREME_RAINFALL", "RIVER_RISK", "LANDSLIDE", "CYCLONE", "OTHER"] },
  status: { type: String, default: "DETECTED" },
  incidentStatus: { type: String, enum: ["detected", "verifying", "verified", "prioritized", "awaiting_approval", "approved", "resources_assigned", "dispatched", "on_scene", "mitigating", "resolved", "rejected", "closed"] },
  severity: { type: String, default: "MODERATE" },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  location: geo,
  address: String, district: String, state: String, source: { type: String, default: "CITIZEN" }, sourceId: String,
  
  // Canonical fields added for DisasterShield Contract
  ref: String,
  sourceIncidentId: String,
  dataMode: { type: String, enum: ["DEMO", "LIVE"], default: "DEMO" },
  
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  affectedPopulation: { type: Number, default: 0, min: 0 }, affectedInfrastructure: { type: Number, default: 0, min: 0 },
  rainfall: Number, riverLevel: Number, officialWarning: { type: Boolean, default: false },
  
  // Risk (combining legacy fields for fallback with new canonical fields)
  riskScore: { type: Number, default: 0, min: 0, max: 100 }, riskLevel: { type: String, default: "LOW" },
  riskFactors: Schema.Types.Mixed, riskReasons: [String],
  
  // Verification (legacy evidence fields kept for fallback)
  evidenceScore: { type: Number, default: 0, min: 0, max: 100 }, evidenceLevel: { type: String, default: "LOW" },
  verification: {
    status: String, score: Number, level: String, sources: Number, corroboration: Boolean,
    conflicts: [String], reasons: [String], advisories: [String]
  },
  
  // Priority (legacy priority fields kept for fallback)
  priorityScore: { type: Number, default: 0, min: 0, max: 100 }, priorityLevel: { type: String, default: "LOW" },
  priority: String, // P1, P2, P3
  
  // Snapshots
  gisImpact: Schema.Types.Mixed,
  intelligenceResult: Schema.Types.Mixed,
  
  // Workflow
  recommendation: {
    version: Number, createdAt: Date, status: String, headline: String, rationale: String,
    actions: [String], urgency: String, requiredResources: [String], supportingEvidence: [String]
  },
  approval: {
    status: String, decidedBy: String, decidedAt: Date, decision: String, note: String, recommendationVersion: Number
  },
  timeline: [{
    timestamp: { type: Date, default: Date.now }, actor: String, actorRole: String, action: String,
    description: String, metadata: Schema.Types.Mixed
  }],
  resources: [resourceAssignmentSchema],
  resolution: {
    resolvedAt: Date, responseMinutes: Number, reason: String, impactSummary: String,
    responderNotes: String, resourcesUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }]
  },

  firstDetectedAt: { type: Date, default: Date.now }, lastUpdatedAt: { type: Date, default: Date.now }, resolvedAt: Date, metadata: Schema.Types.Mixed,
}, { timestamps });
incidentSchema.index({ location: "2dsphere" }); incidentSchema.index({ status: 1, severity: 1, riskLevel: 1, priorityLevel: 1, createdAt: -1 });

const reportSchema = new mongoose.Schema({
  type: { type: String, required: true }, description: { type: String, required: true },
  latitude: { type: Number, required: true }, longitude: { type: Number, required: true }, location: geo,
  address: String, image: String, video: String, reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, default: "PENDING" }, verificationStatus: { type: String, default: "UNVERIFIED" },
  confidence: { type: Number, default: 0, min: 0, max: 100 }, metadata: Schema.Types.Mixed,
}, { timestamps });
reportSchema.index({ location: "2dsphere" }); reportSchema.index({ status: 1, createdAt: -1 });

const alertSchema = new mongoose.Schema({
  title: String, message: String, type: String, severity: String, source: String, sourceId: { type: String, unique: true, sparse: true },
  affectedArea: String, latitude: Number, longitude: Number, issuedAt: Date, expiresAt: Date, active: { type: Boolean, default: true }, metadata: Schema.Types.Mixed,
}, { timestamps });
alertSchema.index({ active: 1, issuedAt: -1 }); alertSchema.index({ expiresAt: 1 });

const weatherSchema = new mongoose.Schema({
  source: String, sourceId: String, location: String, latitude: Number, longitude: Number, district: String, state: String,
  rainfall: Number, rainfall24h: Number, rainfall3h: Number, temperature: Number, humidity: Number, windSpeed: Number,
  forecast: Schema.Types.Mixed, warning: Schema.Types.Mixed, observedAt: Date, fetchedAt: Date, rawMetadata: Schema.Types.Mixed,
}, { timestamps });
weatherSchema.index({ latitude: 1, longitude: 1, observedAt: -1 });

const riverSchema = new mongoose.Schema({
  source: String, stationId: { type: String, index: true }, stationName: String, riverName: String, state: String, district: String,
  latitude: Number, longitude: Number, waterLevel: Number, dangerLevel: Number, warningLevel: Number, trend: String, observedAt: Date, fetchedAt: Date, metadata: Schema.Types.Mixed,
}, { timestamps });
riverSchema.index({ stationId: 1, observedAt: -1 });

const evidenceSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: "Incident" }, report: { type: mongoose.Schema.Types.ObjectId, ref: "CitizenReport" },
  type: String, source: String, url: String, path: String, description: String, confidence: { type: Number, min: 0, max: 100 },
  verified: { type: Boolean, default: false }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, metadata: Schema.Types.Mixed,
}, { timestamps });





const make = <T extends Record<string, any> = any>(name: string, schema: Schema): Model<T> => mongoose.models[name] as Model<T> ?? mongoose.model<T>(name, schema);
export const User = make("User", userSchema);
export const Incident = make("Incident", incidentSchema);
export const CitizenReport = make("CitizenReport", reportSchema);
export const Alert = make("Alert", alertSchema);
export const WeatherData = make("WeatherData", weatherSchema);
export const RiverData = make("RiverData", riverSchema);
export const Evidence = make("Evidence", evidenceSchema);
export const Resource = make("Resource", resourceSchema);