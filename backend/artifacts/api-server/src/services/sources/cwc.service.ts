import { env } from "../../config/env";
import { SourceService } from "./base";
export class CwcService extends SourceService {
  constructor() { super("CWC", Boolean(env.sources.cwc.url)); }
  async fetch() { if (!env.sources.cwc.url) return null; return this.request(env.sources.cwc.url, env.sources.cwc.key ? { Authorization: `Bearer ${env.sources.cwc.key}` } : {}); }
  fetchRiverData() { return this.fetch(); }
  normalize(value: any) { return Array.isArray(value) ? value : value ? [value] : []; }
  normalizeRiverData(value: unknown) { return this.normalize(value); }
  detectDangerLevel(waterLevel: number, warningLevel?: number, dangerLevel?: number) { return dangerLevel !== undefined && waterLevel >= dangerLevel ? "DANGER" : warningLevel !== undefined && waterLevel >= warningLevel ? "WARNING" : "NORMAL"; }
}