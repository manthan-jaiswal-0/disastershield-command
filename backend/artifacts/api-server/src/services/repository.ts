import type { Model } from "mongoose";
import { env } from "../config/env";
import { isDatabaseConnected } from "../db/connection";
import { AppError } from "../lib/errors";

type Doc = Record<string, any>;
const memory = new Map<string, Doc[]>();
const collection = (name: string) => {
  if (!memory.has(name)) {
     memory.set(name, []);
     if (name === "User" && env.isMock) {
        memory.get(name)!.push({
           _id: "mock-admin",
           id: "mock-admin",
           name: "Mock Admin",
           email: "admin@ds.local",
           role: "ADMIN",
           isActive: true,
           password: "$2b$12$WLzLymKYn2r6CV6i14Y5i.9lzrWDe.qhJlMHAULu.S2uwLcJ9Vpvu" // password: "password"
        });
     }
  }
  return memory.get(name)!;
};
const id = () => `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const serialise = (value: any): any => value?.toObject ? value.toObject() : value;
const matches = (doc: Doc, query: Record<string, unknown>) => Object.entries(query).every(([key, value]) => {
  if (value === undefined || value === "") return true;
  if (["page", "limit", "radius", "from", "to"].includes(key)) return true;
  if (key === "q") return [doc.title, doc.description, doc.address, doc.district, doc.state].some((x) => String(x ?? "").toLowerCase().includes(String(value).toLowerCase()));
  return Array.isArray(value) ? value.includes(doc[key]) : doc[key] === value;
});
function ensureAvailable() { if (!env.isMock && !isDatabaseConnected()) throw new AppError("MongoDB is not connected. Configure MONGO_URI or use DATA_MODE=mock.", 503, "DATABASE_UNAVAILABLE"); }

export async function create<T extends Doc>(name: string, model: Model<T>, data: Doc): Promise<T> {
  if (env.isMock) { const item = { ...data, _id: id(), id: undefined, createdAt: new Date(), updatedAt: new Date() }; collection(name).push(item); return item as unknown as T; }
  ensureAvailable(); return serialise(await model.create(data as unknown as T)) as unknown as T;
}
export async function findById<T extends Doc>(name: string, model: Model<T>, value: string | string[]): Promise<T | null> {
  const idStr = String(value);
  if (env.isMock) return (collection(name).find((item) => item._id === idStr || item.id === idStr) as T) ?? null;
  ensureAvailable(); return serialise(await model.findById(idStr)) as T | null;
}
export async function list<T extends Doc>(name: string, model: Model<T>, query: Record<string, unknown>, page = 1, limit = 20): Promise<{ data: T[]; total: number }> {
  if (env.isMock) { const all = collection(name).filter((item) => matches(item, query)); return { data: all.slice((page - 1) * limit, page * limit) as T[], total: all.length }; }
  ensureAvailable(); const mongoQuery: Record<string, unknown> = {}; for (const [key, value] of Object.entries(query)) if (!["q", "from", "to", "page", "limit"].includes(key) && value !== undefined && value !== "" && !key.startsWith("$") && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value))) mongoQuery[key] = value;
  const filter = model.find(mongoQuery).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit); const [data, total] = await Promise.all([filter, model.countDocuments(mongoQuery)]); return { data: data.map(serialise) as T[], total };
}
export async function update<T extends Doc>(name: string, model: Model<T>, value: string | string[], data: Doc): Promise<T | null> {
  const idStr = String(value);
  if (env.isMock) { const item = collection(name).find((entry) => entry._id === idStr || entry.id === idStr); if (!item) return null; Object.assign(item, data, { updatedAt: new Date() }); return item as T; }
  ensureAvailable(); return serialise(await model.findByIdAndUpdate(idStr, data, { new: true, runValidators: true })) as T | null;
}
export async function remove(name: string, model: Model<Doc>, value: string | string[]): Promise<boolean> {
  const idStr = String(value);
  if (env.isMock) { const items = collection(name); const index = items.findIndex((entry) => entry._id === idStr || entry.id === idStr); if (index < 0) return false; items.splice(index, 1); return true; }
  ensureAvailable(); return Boolean(await model.findByIdAndDelete(idStr));
}
export function seed(name: string, items: Doc[]) { if (env.isMock && collection(name).length === 0) collection(name).push(...items); }
export function all(name: string) { return collection(name); }