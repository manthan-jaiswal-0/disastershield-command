import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../lib/logger";

let connected = false;

export const databaseStatus = () => ({
  status: connected ? "connected" : env.isMock ? "mock" : "disconnected",
  configured: Boolean(env.mongoUri),
});

export const isDatabaseConnected = () => connected && mongoose.connection.readyState === 1;

export async function connectDatabase(): Promise<void> {
  if (!env.mongoUri) {
    logger.warn("MONGO_URI is not configured; running with mock in-memory storage");
    return;
  }
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    logger.info("MongoDB connected");
  } catch (error) {
    connected = false;
    logger.error({ err: error }, "MongoDB unavailable; use DATA_MODE=mock for local development");
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isDatabaseConnected()) await mongoose.disconnect();
  connected = false;
}