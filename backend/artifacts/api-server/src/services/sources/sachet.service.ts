import Parser from "rss-parser";
import { env } from "../../config/env";
import { SourceService } from "./base";
export class SachetService extends SourceService {
  private parser = new Parser();
  constructor() { super("SACHET", Boolean(env.sources.sachet.url)); }
  async fetch() { if (!env.sources.sachet.url) return null; this.state.lastFetched = new Date().toISOString(); try { const feed = await this.parser.parseURL(env.sources.sachet.url); this.state.connected = true; this.state.lastSuccess = new Date().toISOString(); this.state.recordsReceived = feed.items.length; return feed.items; } catch (error) { this.state.lastError = error instanceof Error ? error.message : "RSS request failed"; throw error; } }
  normalize(value: any) { return (Array.isArray(value) ? value : []).map((item) => ({ source: "SACHET", sourceType: "OFFICIAL", sourceId: item.guid ?? item.link ?? item.title, title: item.title, message: item.contentSnippet ?? item.content, issuedAt: item.isoDate ?? item.pubDate, rawMetadata: item })); }
  parseRSS(value: unknown) { return this.normalize(value); }
  normalizeAlert(value: unknown) { return this.normalize(value); }
  deduplicateAlerts(value: any[]) { return [...new Map(value.map((item) => [item.sourceId, item])).values()]; }
}