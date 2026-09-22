import { env } from "../../config/env";
import { SourceService } from "./base";
export class ImdService extends SourceService {
  constructor() { super("IMD", Boolean(env.sources.imd.url)); }
  async fetch() { if (!env.sources.imd.url) return null; return this.request(env.sources.imd.url, env.sources.imd.key ? { Authorization: `Bearer ${env.sources.imd.key}` } : {}); }
  normalize(value: any) { return Array.isArray(value) ? value : value ? [value] : []; }
  fetchWeather() { return this.fetch(); }
  fetchWarnings() { return this.fetch(); }
  normalizeWeather(value: unknown) { return this.normalize(value); }
  normalizeWarning(value: unknown) { return this.normalize(value); }
}