import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { logger } from "../lib/logger";

let io: Server | undefined;
export function attachSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });
  io.on("connection", (socket) => { logger.info({ socketId: socket.id }, "Socket.IO client connected"); socket.on("disconnect", () => logger.info({ socketId: socket.id }, "Socket.IO client disconnected")); });
  return io;
}
export function emitEvent(event: string, payload: unknown) { io?.emit(event, payload); }