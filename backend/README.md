# DisasterShield

DisasterShield is an AI-ready disaster decision-support backend for India. It supports the operational flow **DETECT → VERIFY → ASSESS → PRIORITIZE → RESPOND** for flood, extreme rainfall, waterlogging, river risk, official warnings, citizen reports, evidence, and responder resources.

## Run locally

```bash
pnpm install
cp artifacts/api-server/.env.example artifacts/api-server/.env
pnpm --filter @workspace/api-server run dev
```

The API listens on `PORT` (5000 outside the managed preview; 8080 in the managed workflow). Set `DATA_MODE=mock` for deterministic in-memory development. Set `DATA_MODE=live` and `MONGO_URI` to use MongoDB; live mode never silently falls back to fabricated source data.

## Main endpoints

- `GET /api` and `GET /api/health`
- `/api/auth` — register, login, current user, refresh, logout
- `/api/incidents` — incident CRUD, nearby search, assignment, verification, resolution
- `/api/reports` — citizen reports with safe image upload and verification
- `/api/alerts`, `/api/weather`, `/api/rivers`, `/api/resources`
- `/api/risk`, `/api/evidence`, `/api/priority`
- `/api/dashboard`, `/api/geo/nearby`, `/api/routing/route`

Protected endpoints use `Authorization: Bearer <token>`. Responder and admin operations are role protected; public registration always creates a `CITIZEN` account.

## Data sources

IMD, SACHET, CWC, Bhuvan, data.gov.in, OSM, and OSRM are modular adapters. Their credentials and endpoint URLs are environment variables. Missing or unavailable official sources return an explicit unavailable status; no official data is fabricated. Mock data is labelled through `dataMode: "mock"` and source status.

## Verification

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run test
```

See [API_INTEGRATION.md](API_INTEGRATION.md) for request/response details and [PROJECT_HANDOVER.md](PROJECT_HANDOVER.md) for continuation notes.