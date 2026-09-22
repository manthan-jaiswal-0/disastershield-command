import "dotenv/config";

const bool = (value: string | undefined, fallback = false) =>
  value === undefined ? fallback : ["1", "true", "yes"].includes(value.toLowerCase());

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  mongoUri: process.env.MONGO_URI ?? "",
  jwtSecret: process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? ((process.env.NODE_ENV ?? "development") === "production" ? (() => { throw new Error("FATAL: JWT_SECRET must be configured in production"); })() : "development-only-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  dataMode: process.env.DATA_MODE ?? "mock",
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  duplicateRadiusMeters: Number(process.env.DUPLICATE_RADIUS_METERS ?? 1000),
  duplicateTimeMinutes: Number(process.env.DUPLICATE_TIME_MINUTES ?? 60),
  sources: {
    imd: { url: process.env.IMD_API_URL ?? "", key: process.env.IMD_API_KEY ?? "" },
    sachet: { url: process.env.SACHET_RSS_URL ?? "" },
    cwc: { url: process.env.CWC_API_URL ?? "", key: process.env.CWC_API_KEY ?? "" },
    bhuvan: { url: process.env.BHUVAN_API_URL ?? "", key: process.env.BHUVAN_API_KEY ?? "" },
    dataGov: {
      url: process.env.DATA_GOV_API_URL ?? "",
      key: process.env.DATA_GOV_API_KEY ?? "",
      datasetId: process.env.DATA_GOV_DATASET_ID ?? "",
    },
    osm: process.env.OSM_API_URL ?? "https://overpass-api.de/api/interpreter",
    osrm: process.env.OSRM_API_URL ?? "",
  },
  schedules: {
    weather: process.env.WEATHER_SYNC_SCHEDULE ?? "*/10 * * * *",
    sachet: process.env.SACHET_SYNC_SCHEDULE ?? "*/5 * * * *",
    cwc: process.env.CWC_SYNC_SCHEDULE ?? "*/10 * * * *",
    risk: process.env.RISK_RECALCULATION_SCHEDULE ?? "*/10 * * * *",
    health: process.env.SOURCE_HEALTH_SCHEDULE ?? "*/5 * * * *",
  },
  isMock: (process.env.DATA_MODE ?? "mock") === "mock",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
  allowUploads: bool(process.env.ALLOW_UPLOADS, true),
};