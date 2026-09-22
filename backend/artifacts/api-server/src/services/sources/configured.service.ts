import { env } from "../../config/env";
import { SourceService } from "./base";
class ConfiguredService extends SourceService {
  private url: string; private key: string;
  constructor(name: string, url: string, key = "") { super(name, Boolean(url)); this.url = url; this.key = key; }
  async fetch() { if (!this.url) return null; return this.request(this.url, this.key ? { Authorization: `Bearer ${this.key}` } : {}); }
  normalize(value: any) { return Array.isArray(value) ? value : value ? [value] : []; }
}
export class BhuvanService extends ConfiguredService { constructor() { super("Bhuvan", env.sources.bhuvan.url, env.sources.bhuvan.key); } }
export class DataGovService extends ConfiguredService { constructor() { super("data.gov.in", env.sources.dataGov.url, env.sources.dataGov.key); } }
export class OsmService extends ConfiguredService { constructor() { super("OSM", env.sources.osm); } }
export class OsrmService extends ConfiguredService { constructor() { super("OSRM", env.sources.osrm); } }