# God's Eye Operations & Disaster Recovery Guide

## Overview

God's Eye is a real-time 3D Space Situational Awareness (SSA) and orbital observation platform. This manual establishes practical, non-destructive recovery procedures for operators and administrators.

---

## 1. Missing or Invalid Environment Variables

### Observed Symptom
- Server exits during startup with an error log or Sentinel administration routes reject logins with HTTP 500/401.
- J.A.R.V.I.S. falls back to deterministic local aerospace intelligence instead of Gemini generative output.

### Verification Method
Run the configuration verification script or inspect process environment:
```powershell
node -e "console.log({ adminUser: process.env.SENTINEL_ADMIN_USERNAME ? 'Set' : 'Missing', secret: process.env.SENTINEL_SESSION_SECRET ? 'Set' : 'Missing' })"
```

### Safe Recovery Action
1. Copy `.env.example` to `.env` if `.env` was lost:
   ```bash
   cp .env.example .env
   ```
2. Verify minimum required variables:
   - `PORT=3000`
   - `SENTINEL_ADMIN_USERNAME`
   - `SENTINEL_ADMIN_PASSWORD` (minimum 8 characters)
   - `SENTINEL_SESSION_SECRET` (minimum 32-character high-entropy string)
3. Never hardcode production secrets in tracked source files.
4. Restart the Node process (`npm start`).

### Confirmation
Query `/api/health`. An HTTP 200 with `{ "ok": true }` confirms resolution.

---

## 2. Upstream Provider Outage (CelesTrak, NOAA, RainViewer, Space-Track)

### Observed Symptom
- Status indicators display `STALE` or `DEGRADED`.
- Ingestion worker logs indicate network timeouts or HTTP 502/503 from upstream endpoints.

### Verification Method
Check provider health status via the public endpoint:
```bash
curl http://localhost:3000/api/sources
```
Inspect the `status` field (`ACTIVE`, `DEGRADED`, or `UNAVAILABLE`) and `lastError`.

### Safe Recovery Action
1. **Never delete local caches or replace real data with fabricated coordinates.**
2. God's Eye automatically retains the last verified SGP4 orbital elements in `data/space-db.json` and propagates forward using analytical equations.
3. If an upstream domain changed or rate-limited:
   - For CelesTrak: Workers automatically fall back to cached OMM vectors.
   - For Space-Track: Confirm credentials in `.env` if rate limits were exceeded.
   - For NOAA SWPC: The system retains the last known planetary Kp index and marks age.
4. Trigger an immediate manual daemon sync via Sentinel Operations:
   - POST to `/api/sentinel/workers/control` with `{ "worker_id": "worker_sgp4_celestrak", "action": "sync" }`.

### Confirmation
Verify `lastFetch` updates and `latencyMs` is positive in `/api/sources`.

---

## 3. Data Store or SQLite Corruption

### Observed Symptom
- `[SpaceDB]` logs error: `SyntaxError: Unexpected token in JSON at position...`
- SQLite errors reporting `SQLITE_CORRUPT`.

### Verification Method
Inspect file integrity in the `data/` directory:
```powershell
node -e "try { JSON.parse(require('fs').readFileSync('data/space-db.json')); console.log('JSON OK'); } catch(e) { console.error('Corrupted:', e.message); }"
```

### Safe Recovery Action
1. **Automatic Backup Restoration**: `src/db/space-store.js` automatically maintains `data/space-db.json.bak` on every atomic write.
2. If `space-db.json` is corrupted, the server automatically reads `space-db.json.bak` and restores the primary store.
3. Manual restoration if needed:
   ```bash
   cp data/space-db.json.bak data/space-db.json
   ```
4. If SQLite `sentinel_command.db` has structural corruption:
   - SQLite tables are designed with `CREATE TABLE IF NOT EXISTS`.
   - Backup the corrupt DB file:
     ```bash
     mv data/sentinel_command.db data/sentinel_command.db.corrupt.$(date +%s)
     ```
   - Restart the server. SQLite will cleanly reconstruct the schema without losing static satellite catalogue entries.

### Confirmation
Verify clean startup logs without `[SpaceDB]` errors.

---

## 4. Stale Satellite Orbital Elements (TLE Epoch > 14 Days)

### Observed Symptom
- Satellite markers display `Epoch: Stale (> 14 days)`.
- OrbitAlert pass prediction flags `accuracy: degraded`.

### Verification Method
Check catalogue epoch ages:
```bash
curl http://localhost:3000/api/space/bootstrap
```
Inspect `meta.catalog[].epochAgeDays`.

### Safe Recovery Action
1. Force an immediate CelesTrak ingestion cycle:
   ```bash
   curl -X POST http://localhost:3000/api/sentinel/workers/control \
     -H "Content-Type: application/json" \
     -d '{"worker_id":"worker_sgp4_celestrak","action":"sync"}'
   ```
2. Check network egress to `celestrak.org` (port 443).
3. If CelesTrak is undergoing maintenance, SGP4 propagation remains mathematically valid within $\pm 30$ days of epoch.

---

## 5. Service Worker Update & Offline Cache Issues

### Observed Symptom
- Browser displays older UI assets despite code updates on the server.
- Console warns of service worker cache mismatches.

### Verification Method
Inspect service worker registration in browser developer tools (Application > Service Workers) or query:
```bash
curl -I http://localhost:3000/sw.js
```
Confirm `Cache-Control: no-cache, no-store, must-revalidate`.

### Safe Recovery Action
1. Click the in-app **"Update Now"** toast notification when prompted.
2. If forced client cache bypass is needed:
   - Perform a hard refresh: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (macOS).
   - Or run in the browser console:
     ```javascript
     navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
     caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
     window.location.reload();
     ```
3. The server ensures `sw.js` is never cached by reverse proxies or CDNs.

---

## 6. WebSocket Disconnection & Heartbeat Loss

### Observed Symptom
- Sentinel admin dashboard reports WebSocket state `DISCONNECTED`.

### Verification Method
Inspect server log for:
`[SYS] WebSocket client disconnected`

### Safe Recovery Action
1. The client-side WebSocket manager initiates reconnect with exponential backoff (1s, 2s, 4s, 8s).
2. The server runs a ping/pong sweep every 30 seconds to terminate zombie connections.
3. If a reverse proxy (e.g. Nginx, Cloudflare) is buffering WebSockets, ensure the proxy configuration includes:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_read_timeout 86400s;
   ```

---

## 7. Clean Shutdown & Data Preservation

### Shutdown Procedure
Always stop the server process using standard termination signals (`SIGINT` / `Ctrl+C` or `SIGTERM`).
The server intercepts these signals and executes:
1. Complete all queued disk writes (`flushSpaceStore`).
2. Close all WebSocket client sessions gracefully.
3. Close the SQLite connection pool cleanly.
4. Close HTTP listener and exit with code 0.
