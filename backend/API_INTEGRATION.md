# DisasterShield API Integration

Base URL in the managed preview: `/api`. Local standalone URL: `http://localhost:5000/api`.

## Response contract

Success responses use `{ "success": true, "data": ... }`. List responses additionally include `{ "pagination": { "page", "limit", "total", "pages" } }`. Errors use `{ "success": false, "message", "errorCode", "details" }`.

## Authentication

1. `POST /auth/register` with `name`, `email`, `password` and optional `phone`, `role`, `location`.
2. `POST /auth/login` with `email`, `password`.
3. Send the returned token as `Authorization: Bearer <token>`.
4. `GET /auth/me`, `POST /auth/refresh`, and `POST /auth/logout`.

Roles are `CITIZEN`, `RESPONDER`, and `ADMIN`. Public registration always creates `CITIZEN`; trusted administration should provision elevated roles through a controlled workflow.

## Endpoint groups

| Group | Routes |
| --- | --- |
| Health | `/`, `/health`, `/healthz` |
| Incidents | `POST/GET /incidents`, `GET/PATCH/DELETE /incidents/:id`, `/incidents/nearby`, `/:id/assign`, `/:id/verify`, `/:id/resolve` |
| Reports | `POST/GET /reports`, `GET/PATCH /reports/:id`, `/:id/verify`, `/:id/reject` |
| Alerts | CRUD `/alerts`, `GET /alerts/active` |
| Weather/Rivers | list/detail/nearby plus `POST /weather/sync` and `POST /rivers/sync` |
| Engines | `GET/POST /risk/:incidentId`, `GET/POST /evidence/:incidentId`, `GET/POST /priority/:incidentId` |
| Resources | CRUD `/resources`, `/:id/assign`, `/:id/release` |
| Dashboard | `/dashboard/overview`, `/dashboard/source-status`, `/dashboard/national-risk` |
| Geo/Routing | `/geo/nearby`, `POST /routing/route` |

## Realtime events

Socket.IO is initialized on the same HTTP server. The event vocabulary is reserved for `incident:new`, `incident:updated`, `incident:verified`, `incident:resolved`, `alert:new`, `alert:updated`, `report:new`, `report:verified`, `risk:updated`, `priority:updated`, `resource:updated`, and `source:status`.

## Environment and source states

Copy `artifacts/api-server/.env.example`. `DATA_MODE=mock` uses clearly labelled in-memory storage. `DATA_MODE=live` requires MongoDB and configured source endpoints. Source status is one of `LIVE`, `MOCK`, `UNAVAILABLE`, or `NOT_CONFIGURED`.

## Security

Helmet, CORS, rate limiting, JWT authentication, bcrypt password hashing, Zod request validation, centralized errors, request logging, and MIME/size-restricted image uploads are enabled. Secrets belong in environment configuration and are never returned to clients.