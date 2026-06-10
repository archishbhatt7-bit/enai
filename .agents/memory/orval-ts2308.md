---
name: Orval TS2308 collision fix
description: Endpoints with both path and query params cause duplicate identifier errors in Orval codegen
---

**Rule:** In the OpenAPI spec for this project, endpoints with both path params AND query params must have query params moved to path params to avoid Orval collision.

**Why:** Orval generates `*Params` types in both `generated/api.ts` (Zod schemas) and `generated/types/` (TS interfaces), causing TS2308 duplicate identifier errors. Example fix: `/shops/{slug}/slots?date=&serviceId=` → `/shops/{slug}/slots/{date}/{serviceId}`.

**How to apply:** Before adding new endpoints to `lib/api-spec/openapi.yaml` that have both `{pathParam}` and `?queryParam`, consolidate into path params only.
