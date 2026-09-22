import cron, { type ScheduledTask } from "node-cron";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { sourceManager } from "./sources";
let jobs: ScheduledTask[] = [];
export const startJobs = () => {
  if (jobs.length || env.isMock) return;
  const schedule = (expression: string, name: string, task: () => Promise<void>) => jobs.push(cron.schedule(expression, () => task().catch((error) => logger.error({ err: error, job: name }, "Scheduled job failed"))));
  schedule(env.schedules.weather, "weather-sync", async () => { await sourceManager.sources.IMD.fetchWeather(); });
  schedule(env.schedules.sachet, "sachet-sync", async () => { await sourceManager.sources.SACHET.fetch(); });
  schedule(env.schedules.cwc, "cwc-sync", async () => { await sourceManager.sources.CWC.fetchRiverData(); });
  schedule(env.schedules.health, "source-health", async () => { sourceManager.sourceStatuses(); });
  logger.info({ count: jobs.length }, "Scheduled jobs started");
};
export const stopJobs = () => { jobs.forEach((job) => job.stop()); jobs = []; };