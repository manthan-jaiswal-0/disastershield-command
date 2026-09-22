import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { notFound, errorHandler } from "./lib/errors";
import { env } from "./config/env";

const app: Express = express();
app.set("trust proxy", 1);
app.get("/", (_req, res) => res.json({ success: true, message: "DisasterShield API is running" }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
      body.dataMode = env.dataMode === "mock" ? "DEMO" : "LIVE";
    }
    return originalJson.call(this, body);
  };
  next();
});

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

export default app;
