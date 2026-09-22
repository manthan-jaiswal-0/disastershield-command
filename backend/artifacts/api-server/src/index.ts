import app from "./app";
import { logger } from "./lib/logger";
import http from "node:http";
import { connectDatabase } from "./db/connection";
import { attachSocket } from "./sockets";
import { startJobs } from "./services/jobs";
import { env } from "./config/env";

const rawPort = process.env["PORT"] ?? String(env.port);

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
attachSocket(server);
connectDatabase().finally(() => {
  server.listen(port, () => { startJobs(); logger.info({ port, dataMode: env.dataMode }, "DisasterShield API listening"); });
});
