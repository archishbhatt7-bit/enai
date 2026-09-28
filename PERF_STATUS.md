# Performance Optimization Status

Last updated: 2026-09-28

## What was done (code changes — all committed and pushed to main, commit ef5b9d2)

### 1. Pool timeout (lib/db/src/index.ts)
- Added `connectionTimeoutMillis: 5_000`, `max: 5`, `idleTimeoutMillis: 20_000`
- Purpose: prevent the server from hanging forever when DB is unreachable
- Before this, any network issue caused requests to hang until Vercel's 10s function timeout killed them

### 2. Vercel function region (artifacts/api-server/vercel.json)
- Added `"regions": ["bom1"]` (Mumbai) to co-locate with Supabase ap-south-1
- Previously no region was set — Vercel defaults to iad1 (US East)

### 3. Query optimizations (shops.ts, bookings.ts, payments.ts)
- **Parallelized** independent DB queries with `Promise.all` in:
  - GET /shops/:slug (services + owner)
  - GET /shops/:slug/slots (shop + service lookups)
  - POST /shops/:slug/bookings (shop + service lookups, body validation moved before DB calls)
  - GET /shops/:slug/bookings (bookings + services)
  - GET /shops/:slug/timeline (bookings + services)
  - GET /shops/:slug/activity (bookings + services)
  - GET /customer/bookings, /customer/bookings/all (shops + services)
  - POST /payments/create-order, /payments/verify (shop + service)
- **Narrowed SELECT columns** — all owner-auth endpoints now select only `id, ownerId` (+ `portfolioPhotos` where needed) instead of SELECT *
- **Dashboard SQL filter** — GET /shops/:slug/dashboard now fetches last 7 days (`WHERE slot_date >= weekAgoStr`) instead of all bookings ever, then filters in JS

### 4. Timing instrumentation (shops.ts)
- GET /shops handler now logs `performance.now()` timing for: setup, shops query, services query, serialization, total
- Logs via pino as `"GET /shops timing"` — visible in Vercel function logs
- **Has not been checked yet.** Nobody has looked at the Vercel logs to see what the actual query times are.

### 5. DB indexes (NOT applied yet)
- A migration was drafted with 6 indexes: shops.slug (unique), shops.is_verified (partial), shops.owner_id, services.shop_id (partial), bookings.shop_id+slot_date (composite), bookings.customer_phone
- **These have NOT been run against Supabase.** Need to paste into Supabase SQL Editor manually.
- The SQL:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug ON shops (slug);
CREATE INDEX IF NOT EXISTS idx_shops_is_verified ON shops (is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops (owner_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_active ON services (shop_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_shop_date ON bookings (shop_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings (customer_phone);
```

## What was confirmed

- **The endpoint works.** Browser returns valid JSON from https://enai-api-server.vercel.app/api/shops on normal wifi.
- **Deployment Protection was causing 403s.** It was enabled by default on the Vercel project. User disabled it — autocannon went from 0% success to partial success.
- **There is still a 403 problem.** Even after disabling Deployment Protection, autocannon gets ~85% 403s during a load test. Likely Vercel's automatic bot/DDoS mitigation triggering on burst traffic from one IP. This does not affect single browser requests.
- **Pool is at module scope** in lib/db/src/index.ts — warm Vercel instances reuse connections. Confirmed by reading the code.
- **The connection string** in .env points to the Supabase transaction pooler (port 6543).

## Confirmed findings (verified 2026-09-28 via Vercel dashboard)

### ✅ Region — bom1 confirmed
- Vercel function logs show **"Received in Mumbai, India (bom1)"** on every request.
- Project Settings → Functions shows Function Region as **"Overridden"** (by vercel.json).
- The build log saying "iad1" was just the build machine, as expected. Functions execute in bom1.

### ✅ Timing instrumentation — checked
- Vercel logs show the `"GET /shops timing"` output:
  - `setupMs: 0` | `shopsQueryMs: 3` | `servicesQueryMs: 3` | `serializeMs: 0` | **`totalMs: 6`**
  - `shopCount: 16`
- **DB queries take ~3ms each** — this confirms DB co-location (bom1 ↔ Supabase ap-south-1) is the primary performance win.

### ✅ End-to-end performance (Vercel Observability)
- **Server-side duration: avg 80ms** | P75: 52ms | P95: 100ms (measured by Vercel, does not include client-to-Vercel network)
- Function execution: **12ms** (per individual log entry)
- The gap between 12ms execution and 80ms average is Vercel platform overhead (cold start amortization at 4.5% rate, edge routing, TLS).
- **Error rate: 0%** among requests that reached the function | Timeout: 0% (198 invocations in 12h window).
- **Caveat:** 403s from Vercel's edge security checkpoint are rejected before the function runs and do not appear in this error rate. See "403 source" below.
- Cold start rate: **4.5%** | CPU throttle: 17% | Memory: 216 MB / 2.05 GB.

### ✅ Performance improvement attribution
- The original autocannon p50 of **685ms** was measured client-side (laptop → Vercel → DB → back). The current server-side avg of **80ms** is Vercel's own measurement (function only, no client network). These are **not directly comparable**.
- What IS comparable: the server-side DB query time is now **~3ms per query** thanks to bom1 co-location with Supabase ap-south-1. Before the region change, each DB round trip from iad1 (US East) to ap-south-1 (India) was ~150ms+, and queries were sequential.
- Root cause of original slowness: cross-region network latency (multiple sequential ~150ms round trips).
- The bom1 region change is the dominant factor. Query parallelization (`Promise.all`) and column narrowing provide additional benefit by reducing function execution time.
- To get a valid client-side comparison, run autocannon from a clean IP (see "403 source" below).

### Remaining known issues

#### 403 source — confirmed as Vercel Security Checkpoint
- The 403 response is a full HTML page titled **"Vercel Security Checkpoint"** containing an obfuscated JS challenge. It is NOT from Deployment Protection (which was disabled) and NOT from the application code.
- The challenge requires a real browser to execute JavaScript — `autocannon`, `curl`, and `Invoke-WebRequest` cannot pass it.
- The current dev machine's IP appears to be flagged from earlier burst tests. Even single requests from this IP now return 403.
- **Impact:** autocannon is unusable from this IP until the flag lifts (typically hours to days). Use a different IP (mobile hotspot) or rely on the Vercel dashboard metrics.
- **To investigate further:** check the Vercel Firewall tab in the dashboard for blocked requests and whitelist options.

#### Local network
- Machine blocks outbound TCP to Supabase on ports 5432/6543. Must use mobile hotspot or different network for local dev against production DB.

## What's left to do

### Should do
1. **Run the SQL indexes** against Supabase SQL Editor. No impact at current data size, but essential as data grows.
2. **Remove timing instrumentation** from shops.ts — it has served its purpose.
3. **Re-enable rate limiting** (commented out in expressApp.ts line 54). The current in-memory rate limiter is useless on Vercel (ephemeral functions) — needs Redis-backed solution for production.
4. **Add Cache-Control headers** to GET /shops and GET /shops/:slug for repeat-visit performance.

### Nice to have
5. Vercel cron keepalive to reduce cold starts (currently 4.5%).
6. Consider switching from `node-postgres` to `postgres.js` with `prepare: false` for better transaction pooler compatibility.

## Files changed (all in commit ef5b9d2)
- `lib/db/src/index.ts` — pool config
- `artifacts/api-server/vercel.json` — region
- `artifacts/api-server/src/routes/shops.ts` — query opts + timing
- `artifacts/api-server/src/routes/bookings.ts` — query opts + parallelization
- `artifacts/api-server/src/routes/payments.ts` — parallelization
- `artifacts/api-server/src/expressApp.ts` — general rate limit commented out
- `lib/db/src/schema/services.ts` — (minor, part of earlier work)

## Autocannon results history

| Run | p2.5 | p50 | p97.5 | Max | 2xx | non-2xx | Notes |
|-----|------|-----|-------|-----|-----|---------|-------|
| 1 (pre-optimizations) | 628ms | 685ms | 2793ms | 2815ms | 49 | 0 | Old code, no region set, all succeeded |
| 2 (post deploy, Deployment Protection ON) | 52ms | 143ms | 2415ms | 2644ms | 46 | 55 | 403s from Deployment Protection |
| 3 (Deployment Protection disabled, no UA) | 50ms | 54ms | 82ms | 280ms | 0 | 870 | All 403 — likely bot protection |
| 4 (with User-Agent header) | 50ms | 54ms | 93ms | 995ms | 109 | 654 | Mixed 200/403 |

Latency numbers in runs 2-4 are polluted by fast 403 edge rejections mixed with real 200 responses. The p50 is not a reliable measure of actual successful-request latency.
