import type { ErrorRequestHandler, RequestHandler } from "express";

export class AppError extends Error {
  status: number;
  code: string;
  details: unknown[];

  constructor(message: string, status = 500, code = "INTERNAL_ERROR", details: unknown[] = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", errorCode: "NOT_FOUND" });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const status = error instanceof AppError ? error.status : 500;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  const details = error instanceof AppError ? error.details : [];
  req.log?.error({ err: error, code }, "Request failed");
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
    errorCode: code,
    details,
  });
};