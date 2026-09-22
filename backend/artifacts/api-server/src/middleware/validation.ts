import type { RequestHandler } from "express";
import { z, type ZodType } from "zod";
import { AppError } from "../lib/errors";

export const coordinateSchema = z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });
export const validate = (schema: ZodType, source: "body" | "query" | "params" = "body"): RequestHandler => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(new AppError("Request validation failed", 400, "VALIDATION_ERROR", result.error.issues));
  req[source] = result.data; next();
};