import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { User } from "../models";
import { findById } from "../services/repository";
import type { Role } from "../types/domain";

export interface AuthUser { id: string; name: string; email: string; role: Role; }
declare global { namespace Express { interface Request { user?: AuthUser } } }

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const signToken = (user: AuthUser, expiresIn = env.jwtExpiresIn) => jwt.sign(user, env.jwtSecret, { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
export const safeUser = (user: any): AuthUser => ({ id: String(user._id ?? user.id), name: user.name, email: user.email, role: user.role });

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as JwtPayload & AuthUser;
    const user = await findById("User", User, payload.id);
    if (!user || user.isActive === false) throw new AppError("Invalid token", 401, "INVALID_TOKEN");
    req.user = safeUser(user); next();
  } catch (error) { next(error instanceof AppError ? error : new AppError("Invalid token", 401, "INVALID_TOKEN")); }
};
export const authorize = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  if (!roles.includes(req.user.role)) return next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
  next();
};