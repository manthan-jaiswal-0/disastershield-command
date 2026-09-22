# Project Handover — DisasterShield

## Project

DisasterShield

## Purpose

AI-assisted disaster decision-support platform for India, initially focused on floods, extreme rainfall, urban waterlogging, river risk, warnings, citizen reports, evidence, risk, prioritization, and responder resources.

## Current architecture

The backend is the `@workspace/api-server` Express 5 artifact. It uses Mongoose models for MongoDB in live mode and a clearly labelled in-memory repository in mock mode. Socket.IO shares the HTTP server. External sources are isolated under `src/services/sources`.

## Completed

- [x] Express server, `/api` routing, health and root responses
- [x] MongoDB connection lifecycle with explicit mock/live behavior
- [x] JWT authentication, bcrypt hashing, roles, protected routes
- [x] Incident, citizen report, alert, weather, river, evidence, and resource models
- [x] CRUD and operational endpoints with pagination and validation
- [x] Safe image uploads with metadata evidence records
- [x] Duplicate incident detection using configurable distance/time thresholds
- [x] Modular risk, evidence, and priority engines
- [x] Dashboard overview and national-risk calculations
- [x] Official-source adapter architecture and source status reporting
- [x] Socket.IO initialization and scheduled source-job scaffolding
- [x] API documentation and engine unit tests

## External integrations

IMD, SACHET, CWC, Bhuvan, data.gov.in, OSM, and OSRM are configured by environment variables. They are not claimed live until endpoints and credentials are supplied and a successful fetch is recorded. SACHET is prepared for RSS/XML parsing; IMD and CWC normalize configurable JSON responses.

## Known limitations

- MongoDB and official source credentials are not configured in this environment, so the running service is in mock mode.
- OSM and OSRM request normalization needs the exact deployment endpoint/query contract before it should be enabled in live operations.
- Socket event emission should be connected to controller mutations as the frontend is integrated.
- Public registration is restricted to `CITIZEN`; elevated roles require controlled provisioning.
- The initial typecheck is constrained by the monorepo compiler memory footprint; the server bundle and focused runtime/unit checks are the current verification path.

## Current task

Next recommended work is to connect the DisasterShield frontend to the documented API, then configure MongoDB and one verified official source at a time. Do not fabricate data while doing so.

## Important rules

1. Never fabricate official disaster information.
2. Never expose credentials or commit `.env`.
3. Keep source adapters, scoring engines, and AI interfaces modular.
4. Keep mock data visibly labelled.
5. Update this handover after major backend changes.