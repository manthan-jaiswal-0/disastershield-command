import axios from "axios";
import { env } from "../../config/env";

export type SourceState = {
  name: string; configured: boolean; connected: boolean; lastFetched: string | null; lastSuccess: string | null; lastError: string | null; recordsReceived: number; dataMode: "LIVE" | "MOCK" | "UNAVAILABLE" | "NOT_CONFIGURED";
};

export abstract class SourceService {
  protected state: SourceState;
  constructor(name: string, configured: boolean) {
    this.state = { name, configured, connected: false, lastFetched: null, lastSuccess: null, lastError: null, recordsReceived: 0, dataMode: env.isMock ? "MOCK" : configured ? "UNAVAILABLE" : "NOT_CONFIGURED" };
  }
  getStatus() { return { ...this.state }; }
  protected async request(url: string, headers: Record<string, string> = {}) {
    this.state.lastFetched = new Date().toISOString();
    try { const response = await axios.get(url, { headers, timeout: 10000 }); this.state.connected = true; this.state.lastSuccess = new Date().toISOString(); this.state.lastError = null; return response.data; }
    catch (error) { this.state.connected = false; this.state.lastError = error instanceof Error ? error.message : "Source request failed"; throw error; }
  }
  abstract fetch(): Promise<unknown>;
  abstract normalize(value: unknown): unknown[];
  validate(value: unknown) { return value !== null && value !== undefined; }
}