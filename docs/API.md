# GOD'S EYE — SPACE OBSERVATORY REST API SPECIFICATION
## Version 3.0 // Astrodynamics, Situational Awareness & Multi-Agency Telemetry

This document details the public and administrative HTTP endpoints, query schemas, units, error formats, and upstream data provenance for God's Eye.

---

### Conventions & Standards

- **Coordinate System**: Geocentric Equatorial ECI (TEME / J2000), Topocentric Horizontal ($Az, El, \rho$).
- **Units**:
  - Distance / Radius / Altitude: kilometers ($\text{km}$)
  - Velocity: kilometers per second ($\text{km/s}$) and kilometers per hour ($\text{km/h}$)
  - Angles: degrees ($^\circ$) in $[0, 360)$ for azimuth and $[-90, 90]$ for elevation and latitude.
  - Timestamps: ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) or epoch milliseconds.
- **Error Response**:
  ```json
  {
    "ok": false,
    "error": "Human-readable error explanation."
  }
  ```
  HTTP Status Codes: `400` (Bad Request), `401` (Unauthorized), `404` (Not Found), `422` (Unprocessable Entity), `429` (Rate Limited), `503` (Service Unavailable).

---

### 1. Multi-Agency Data Sources & Health

#### `GET /api/sources`
Returns the status, attribution, licensing, and freshness of all integrated multi-agency data providers.

- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "data": [ ... ],
    "providers": [
      {
        "id": "celestrak",
        "name": "CelesTrak General Perturbations (GP)",
        "agency": "Center for Space Standards & Innovation / Dr. T.S. Kelso",
        "category": "ORBITAL_ELEMENTS",
        "attribution": "Data courtesy of CelesTrak (celestrak.org)...",
        "status": "ACTIVE",
        "requiresAuth": false,
        "isCommercial": false,
        "latencyMs": 85,
        "successCount": 42
      },
      {
        "id": "space_track",
        "name": "Space-Track.org Satellite Catalog & TIP Re-entry",
        "agency": "U.S. Space Force / 18th Space Defense Squadron",
        "status": "ACTIVE",
        "requiresAuth": true
      },
      {
        "id": "esa_discos",
        "name": "ESA Database and Information System Characterising Objects in Space (DISCOS)",
        "agency": "European Space Agency (ESA) Space Debris Office",
        "status": "NEEDS_CREDENTIALS"
      },
      {
        "id": "leolabs",
        "name": "LeoLabs Commercial Radar LEO Tracking Service",
        "agency": "LeoLabs Inc.",
        "status": "NOT_CONFIGURED",
        "isCommercial": true
      }
    ]
  }
  ```

---

### 2. Universal Catalogue Search & Facets

#### `GET /api/catalog/search`
Searches and filters across operational spacecraft, space stations, deep space probes, rocket bodies, and orbital debris.

- **Parameters**:
  - `q` (*optional string*): Keyword search against name, NORAD ID, COSPAR designator, aliases, and role.
  - `category` (*optional string*): `satellite` | `station` | `probe` | `debris`
  - `regime` (*optional string*): `LEO` | `MEO` | `GEO` | `HEO` | `L1_HALO` | `L2_HALO` | `LUNAR`
  - `objectType` (*optional string*): `operational_spacecraft` | `crewed_station` | `space_observatory` | `deep_space_probe` | `rocket_body` | `debris_fragment` | `inactive_spacecraft`
  - `status` (*optional string*): `OPERATIONAL` | `DECAY MONITORING` | `PLANNED_MISSION` | `CREWED / LIVE` | `INACTIVE`
  - `agency` (*optional string*): `ISRO` | `NASA` | `ESA` | `CNSA` | `NOAA` | `Roscosmos`
  - `page` (*optional integer*, default `1`): Page number.
  - `limit` (*optional integer*, default `20`, max `100`): Results per page.
  - `sortBy` (*optional string*, default `name`): `name` | `altKm` | `norad` | `incDeg`
  - `order` (*optional string*, default `asc`): `asc` | `desc`

#### `GET /api/catalog/facets`
Returns all distinct filter dimensions and item counts across the active catalogue.

---

### 3. Astrodynamics & Orbital Calculations

#### `GET /api/passes` / `GET /api/space/passes`
Calculates topocentric passes over an observer's horizon ($El \ge 10.0^\circ$) within a specified prediction window.

- **Parameters**:
  - `lat` (*number*, required if not using default): Observer latitude in $[-90, 90]$.
  - `lon` (*number*, required if not using default): Observer longitude in $[-180, 180]$.
  - `hours` (*number*, default `48`, range `6-72`): Observation window.
  - `minElevation` (*number*, default `10.0`): Minimum peak elevation threshold in degrees.
  - `satId` or `norad` (*string/number*, default `iss`): Target satellite.
- **Validation**:
  - Returns `HTTP 400` if latitude or longitude is out of range.
  - Returns `HTTP 404` if target satellite is not in the catalog.
  - Returns `HTTP 422` if target is not in Earth orbit (e.g. Aditya-L1 at L1, JWST at L2).
  - Returns `HTTP 422` if target is a planned mission awaiting launch (e.g. NISAR).

#### `GET /api/space/propagate-time` / `POST /api/space/propagate-time`
Time-travel propagation computing satellite positions at any arbitrary UTC date.

- **Parameters**:
  - `time` (*ISO string or ms timestamp*, required): The target UTC simulation time.
  - `satId` (*optional string*): Optional single satellite ID.
- **Envelope Validation**:
  - Validates nominal SGP4 validity window ($\pm 30$ days from TLE epoch).
  - If target time is $> 30$ days from epoch, sets `isNominalSgp4Window: false` with explicit mathematical limitation notes.

---

### 4. Situational Awareness & Safety of Flight

#### `GET /api/conjunctions` / `GET /api/space/conjunctions`
Screens catalog pairs for unperturbed geometric close encounters ($\Delta \le 100\text{ km}$) over a 24-hour horizon.

- **Disclaimer**: Educational and informational geometric screening only; does not calculate covariance-based collision probabilities ($P_c$).

#### `GET /api/reentry` / `GET /api/space/reentry`
Reports catalogued rocket bodies, inactive satellites, and debris fragments in decaying orbits.

- **Disclaimer**: No deterministic impact coordinates; atmospheric break-up cannot be accurately pinpointed days in advance.

#### `GET /api/ground-stations` / `GET /api/space/ground-stations`
Provides coordinates and active geometric line-of-sight analysis ($El > 5.0^\circ$) for NASA DSN, ISRO ISTRAC, ESA ESTRACK, and SatNOGS stations.

---

### 5. Watchlist & User Preferences

- `GET /api/watchlist`: Returns saved target IDs.
- `POST /api/watchlist`: Replaces entire watchlist array (constrained to 100 items).
- `POST /api/watchlist/add`: Appends a valid target ID (`{ "id": "CARTOSAT3" }`).
- `POST /api/watchlist/remove`: Removes target ID (`{ "id": "CARTOSAT3" }`).
- `GET /api/alert-settings`: Returns observer preferences and alert thresholds.
- `POST /api/alert-settings`: Updates observer elevation and space weather alert triggers.

---

### 6. Administrative Sentinel Console

- `POST /api/sentinel/login`: Administrator authentication via constant-time SHA-256 validation.
- `POST /api/sentinel/logout`: Destroys admin session and clears session cookie.
- `GET /api/sentinel/sources`: Real-time multi-agency provider status matrix.
- `GET /api/sentinel/workers`: Daemon execution telemetry, success counters, and latency.
- `POST /api/sentinel/auto-correct`: Initiates Sentinel Bot automated system health sweep.

---

### 7. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default `3000`) | Server HTTP port |
| `NODE_ENV` | No (default `development`) | Environment (`development` or `production`) |
| `SENTINEL_ADMIN_USERNAME` | Yes (for admin) | Sentinel console administrator username |
| `SENTINEL_ADMIN_PASSWORD` | Yes (for admin) | Sentinel console administrator password (min 8 chars) |
| `SENTINEL_SESSION_SECRET` | Yes (for admin) | High-entropy crypto string for session signing |
| `SPACE_TRACK_USER` | Optional | Space-Track.org login email |
| `SPACE_TRACK_PASSWORD` | Optional | Space-Track.org account password |
| `SATNOGS_API_TOKEN` | Optional | Personal SatNOGS network token |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for J.A.R.V.I.S. generative AI |
| `FIRMS_MAP_KEY` | Optional | NASA FIRMS active fire API key |
