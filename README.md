# GOD’S EYE // RADAR
### SPECIAL ACTIVITIES DIVISION // LEVEL 9 CLEARANCE // OMEGA PROTOCOL
**Omniscient Orbital Surveillance. Zero Blind Spots.**  
*Watching Every Vector from Low Earth Orbit to Deep Space.*

> **OPERATIVE / ARCHITECT ATTRIBUTION**: **CREATED BY MR SINGH // SPECIAL ACTIVITIES DIVISION**

---

## 🛰 Overview

**GOD’S EYE // RADAR** is an ultra-HD tactical cyber command system and real-time orbital intelligence platform. Inspired by covert mission control dossiers, it fuses physics-grade SGP4 astrodynamics with WebGL/Three.js 3D earth rendering, autonomous telemetry ingestion bots, and a cryptographically audited differential backend.

---

## ⚡ Core Capabilities

### 1. 3D Tactical Command Globe & HUD (`index.html`)
- **Solid High-Contrast Earth**: 100% vector-sharp landmasses, bathymetric shelf glow, and international borders.
- **SGP4 Real-Time Orbit Engine**: Propagates live orbital tracks for LEO, MEO, GEO, SSO, Molniya, Lunar, and Deep Space trajectories.
- **Dynamic Comms & Radar Cones**: Ground station acquisition cones (5° elevation limit) and real-time Line-of-Sight (LOS/AOS) laser telemetry beams.
- **Solar Day/Night Terminator**: Dynamic real-time calculation of the solar dividing terminator and atmospheric rim glow.
- **Interactive 4-Tab Command Center**:
  - `01. FLEET`: Hierarchical constellation tree, target lock, and instant telemetry dossier.
  - `02. BOTS`: 13 dedicated autonomous worldwide telemetry feeds with real-time indicators, `[⚡ EXECUTE]` controls, and `[🛰 AUTO-DISCOVER MISSING SATS]`.
  - `03. AUDIT`: Master differential audit trail, categorized live filters (`ALL`, `SATELLITES`, `INTEL`, `SECURITY`), and live stream terminal.
  - `04. INFO`: Astrodynamics constants, keyboard shortcuts, directive manual, JSON/CSV exports, and mission purge sequence.

### 2. Autonomous Missing Satellite Discovery Bot
- **Auto-Discovery Engine (`AutoSatelliteDiscoveryBot`)**: Continuously monitors the master fleet database against global space registries (NASA, ISRO, ESA, SpaceX, CelesTrak, Space-Track).
- **Zero-Latency Ingestion**: Detects missing satellites (e.g., NISAR, XPoSat, INSAT-3DS, PACE, Euclid, Cartosat-3, Starlink Direct-to-Cell), calculates initial orbital states, injects them directly into persistent storage, and renders them instantly onto the 3D globe.
- **Master Audit Trail**: Broadcasts every injection event (`[SATELLITE_INJECTED]`) into the cryptographic master audit log (`/api/audit`) and live terminal stream.

### 3. Master Space Fleet Catalog Terminal (`catalog.html`)
- Ultra-HD master inventory table with real-time sorting, search, pagination, and multi-parameter filtering (Agency, Regime, Status).
- Quick actions: `[🛰 AUTO-DISCOVER MISSING SATS]`, `[📥 EXPORT CSV]`, `[💾 EXPORT JSON]`.
- Detailed satellite dossier modal with one-click 3D tracking link.

### 4. 13 Worldwide Autonomous Bot Feeds (`run-intel-bots.ps1`)
1. **AutoSatelliteDiscoveryBot**: Autonomous Missing Satellite Ingestion.
2. **CelestrakEphemerisBot**: CelesTrak NORAD GP ephemeris feeds.
3. **NasaHorizonsDeepSpaceBot**: NASA/JPL Horizons interplanetary trajectories.
4. **EsaCopernicusTrackerBot**: ESA Copernicus & DISCOS telemetry.
5. **IsroIstracNetraBot**: ISRO Project NETRA SSA & ISTRAC telemetry.
6. **SpaceTrackConjunctionBot**: Space-Track & 18th SDS orbital safety.
7. **NoaaSpaceWeatherBot**: NOAA SWPC space weather (Kp/F10.7 indices).
8. **SatNOGSGroundTelemetryBot**: SatNOGS global open RF passes.
9. **N2yoOrbitalPassBot**: N2YO real-time pass predictors.
10. **AmsatRadioTelemetryBot**: AMSAT amateur satellite operations.
11. **JaxaMichibikiBot**: JAXA Michibiki (QZSS) & Hayabusa telemetry.
12. **NasaEarthScienceBot**: NASA Earth Observing System (EOSDIS).
13. **DecayWatchBot**: Thermospheric re-entry & orbital decay watch.

---

## 🛠 System Architecture & Stack

- **Frontend**: Pure HTML5 / Canvas / WebGL (Three.js r128, OrbitControls, Satellite.js SGP4). Zero heavyweight framework dependencies.
- **Backend**: PowerShell HTTP REST Server (`server.ps1`) with in-memory TTL ephemeris caching, thread-safe ArrayList stores, and JSON disk persistence (`fleet-catalog.json`, `audit-log.json`, `intel-store.json`).
- **Telemetry Ingestion**: Autonomous PowerShell crawler/reconciliation orchestrator (`run-intel-bots.ps1`) using cryptographic SHA-256 state hashing.
- **Differential Schema**: Full SQL DDL (`schema.sql`) and TypeScript differential sync pipeline (`DifferentialSyncEngine.ts`).

---

## 🚀 Quick Start Guide

### 1. Launch HTTP Backend Server
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```

### 2. Launch 13 Autonomous Data Ingestion Bots
```powershell
powershell -ExecutionPolicy Bypass -File .\run-intel-bots.ps1 -PollIntervalSec 30
```

### 3. Access Interfaces
- **3D Tactical Command Viewport**: Open `http://localhost:8080/` in your browser.
- **Dedicated Fleet Catalog Terminal**: Open `http://localhost:8080/catalog.html`.

### 4. Modern Web Tooling & Cloud Deployment (Vite / Vercel / Netlify)
- **Vite Dev Server (Port 3000)**:
  ```bash
  npm install
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm run preview
  ```
- **Vercel Cloud Deployment**:
  Deploy with one click or via `vercel deploy`. Configured with zero-CORS reverse-proxy rewrites for CelesTrak ephemeris (`/api/celestrak/(.*)`), static catalog fallback (`/api/catalog`), and hardened HTTP security headers in `vercel.json`.
- **Netlify Cloud Deployment**:
  Deploy via Netlify CLI (`netlify deploy`) or Git integration. Fully pre-configured in `netlify.toml` with edge reverse-proxying (`/api/celestrak/*` -> `https://celestrak.org/:splat`), static catalog routing (`/api/catalog` -> `/fleet-catalog.json`), zero-cache index header, and security policies.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | GET | System uptime, memory, source registry health |
| `/api/catalog` | GET | Master fleet database with search & pagination |
| `/api/satellites/discover` | GET/POST | Auto-discover & inject missing satellites into fleet database |
| `/api/sources` | GET | Registry of all 13 autonomous worldwide feeds |
| `/api/audit` | GET/POST | Master differential audit log (latest entries) |
| `/api/audit/clear` | POST | Authorized flush of master audit log |
| `/api/bots/run` | POST | Trigger individual or all (`{"bot":"all"}`) telemetry bots |
| `/api/intel/ingest` | POST | Differential report ingestion with cryptographic SHA-256 hash |
| `/api/sources/decay` | GET | Thermospheric high-risk re-entry telemetry (<200 km) |
| `/api/sources/nasa-earth` | GET | NASA EOS constellation ephemeris |

---

## 🛡 Security & Audit Compliance
- **Differential Sync**: Sensor nodes use SHA-256 hashing to eliminate redundant writes.
- **Audit Logging**: Every mutation, satellite discovery, bot dispatch, or orbital injection is permanently logged with ISO-8601 timestamps and severity levels.
- **Omega Purge**: Integrated 5-second emergency self-destruct sequence to expunge in-memory telemetry and flush caches.

---

**GOD’S EYE // RADAR** &bull; **CREATED BY MR SINGH // SPECIAL ACTIVITIES DIVISION**
