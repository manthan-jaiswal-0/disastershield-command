# DisasterShield

An AI-ready disaster decision-support API for India covering detection, verification, risk assessment, prioritization, and response coordination.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required for live mode: `MONGO_URI`, `JWT_SECRET`; mock mode runs without external credentials

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB + Mongoose in live mode, explicit in-memory repository in mock mode
- Validation: Zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

 - `artifacts/api-server/src/routes/api.ts` — API surface
 - `artifacts/api-server/src/models/` — Mongoose schemas
 - `artifacts/api-server/src/services/engines.ts` — risk, evidence, priority, and geo logic
 - `artifacts/api-server/src/services/sources/` — official source adapters
 - `API_INTEGRATION.md` — contract and endpoint reference
 - `PROJECT_HANDOVER.md` — continuation state and known limitations

## Architecture decisions

- Official data is never synthesized in live mode; missing integrations return structured unavailable responses.
- `DATA_MODE=mock` is explicit and uses a labelled in-memory repository so local development does not require MongoDB.
- Scoring engines return factors and explanations instead of opaque numbers.

## Product

The API supports citizens reporting incidents, responders verifying and prioritizing them, administrators managing alerts/resources, and frontends consuming transparent source status and national risk summaries.

## User preferences

The user requires a real backend and explicitly forbids fabricated official disaster data or fake AI claims.

## Gotchas

- Configure `MONGO_URI` and official source variables before using `DATA_MODE=live`.
- Run the managed API workflow; it supplies the preview port.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
