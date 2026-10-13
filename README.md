# GOD’S EYE // RADAR
### SPECIAL ACTIVITIES DIVISION // LEVEL 9 CLEARANCE // OMEGA PROTOCOL
**Omniscient Orbital Surveillance. Zero Blind Spots.**  
*Watching Every Vector from Low Earth Orbit to Deep Space.*

> **OPERATIVE / ARCHITECT ATTRIBUTION**: **CREATED BY MR SINGH // SPECIAL ACTIVITIES DIVISION**

---

# Orbital Command & Real-Time Astronomical Tracking HUD

A real-time 3D space situational awareness dashboard built with Three.js, Tailwind CSS, and Keplerian orbital mechanics. 

Simulates real heliocentric planetary positions, Earth's sidereal rotation (GMST), subsolar lighting terminators, and an autonomous multi-bot swarm that harvests and renders live satellite orbits.

---

## 🌟 Key Architecture & Capabilities

### 1. Astronomical & Planetary Physics
* **Heliocentric Solar System on Launch:** Opens with a wide-angle overview of the Sun and all 9 planetary bodies in real heliocentric Keplerian positions ($d = \text{JD} - 2451545.0$).
* **Deep-Space Visibility Rings (Beacons):** Luminous beacon rings around Earth and all planets allowing instant recognition and 1-click raycast locking across interplanetary space.
* **Sidereal Earth Rotation:** Earth rotates according to Greenwich Mean Sidereal Time (GMST) and subsolar longitude ($\lambda_{\odot} = (12 - \text{UTC}_\text{hours}) \times 15^\circ$), ensuring that solar noon matches real-world illumination over target continents.
* **Axial Obliquity:** 23.44° true axial tilt applied to Earth, its atmospheric cloud layer, and orbiting satellites.

### 2. Audio Controller & Cinematic Drift Sequencer
* **Atmospheric Audio Engine:** Multi-soundtrack system with entry ambient sound (`intro-ambient.mp3`) and cinematic drift tour score (`cinematic-drift.mp3`), plus a Web Audio synthesizer fallback.
* **Initial Launch Modal:** First-time user overlay that complies with browser autoplay policies, providing 1-click audio initialization, muted mode, and custom local audio upload.
* **Cinematic Drift Sequencer:** Multi-stage orbital tour sweeping from the outer Solar System heliocentric plane and smoothly descending into a locked Low Earth Orbit, with automated audio crossfading and UI fade.

### 3. Autonomous Telemetry & Bot Swarm
* **`BOT-CELES-01` (Visual Fleet):** Queries live CelesTrak NORAD GP JSON streams to spawn interactive 3D satellite beacons and Keplerian orbital paths.
* **`BOT-CELES-02` (Stations & Constellations):** Ingests crewed space stations (ISS, Tiangong) and communications clusters.
* **`BOT-WEATHER-03` (Earth Observation):** Ingests Sun-synchronous weather and cartographic satellites (NOAA, METEOR, Cartosat).
* **`BOT-N2YO-04` (Real-Time Telemetry Sentinel):** Streams live geodetic coordinates, nadir lasers, and optical ground footprints.
* **`BOT-DEEP-05` (Deep Space Scout):** Models hyperbolic escape trajectories and light-time delay for Voyager 1, Voyager 2, and New Horizons.
* **13 Worldwide Autonomous Bot Feeds (`run-intel-bots.ps1`):** Ingestion pipelines covering CelesTrak, NASA Horizons, ESA Copernicus, ISRO NETRA, Space-Track 18th SDS, NOAA Space Weather, SatNOGS, N2YO, AMSAT, JAXA Michibiki, NASA EOSDIS, Decay Watch, and Auto-Satellite Discovery.

### 4. User Controls & Tactile HUD
* **1-Click 3D Raycasting:** Click any satellite, planet, or probe directly in the 3D viewport to lock tracking, update telemetry cards, and auto-minimize HUD drawers.
* **Context-Sensitive Dual-Mode Telemetry:** Dynamically switches between Keplerian planetary orbital metrics and satellite geodetic coordinates.
* **Time Warp Engine:** Toggle between `1x` (real-time 1s per 1s), `10x`, `100x`, and `1000x` orbital speeds.
* **Keyboard Shortcuts:**
  - <kbd>M</kbd> — Toggle HUD drawers and side panels on and off.
  - <kbd>Space</kbd> — Pause / resume real-time propagation.
  - <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> / <kbd>4</kbd> — Switch speed warp (1x, 10x, 100x, 1000x).
  - <kbd>C</kbd> — Toggle Cinematic Drift Tour sequence.
  - <kbd>Shift</kbd>+<kbd>C</kbd> — Open Master Space Fleet Catalog radar.
  - <kbd>R</kbd> — Reset orbital camera view to Solar System overview.
  - <kbd>V</kbd> — Toggle ISS multi-feed live stream modal.
  - <kbd>A</kbd> — Toggle master ambient audio soundtrack.

---

## 🚀 Getting Started

### Option A: Direct Open (Static)
Double-click `index.html` to open it in any modern WebGL-compatible browser.

### Option B: Local Development Server (Recommended)
Running via a local server ensures CORS proxies work properly:

```bash
# 1. Install dev tools
npm install

# 2. Launch Vite dev server (Port 3000)
npm run dev
```

### Option C: PowerShell Native Backend & Intel Swarm
```powershell
# 1. Launch HTTP Backend REST Server (Port 8080)
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080

# 2. Launch 13 Autonomous Data Ingestion Bots
powershell -ExecutionPolicy Bypass -File .\run-intel-bots.ps1 -PollIntervalSec 30
```

### Option D: Cloud Deployment (Vercel / Netlify)
- **Vercel**: Deploy with one click or via `vercel deploy`. Pre-configured in `vercel.json` with zero-CORS rewrites for `/api/celestrak/(.*)`, static catalog fallback (`/api/catalog`), and security headers.
- **Netlify**: Deploy via Netlify CLI (`netlify deploy`) or Git link. Pre-configured in `netlify.toml` with edge reverse-proxying (`/api/celestrak/*`), cache headers, and security rules.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | GET | System uptime, memory, source registry health |
| `/api/catalog` | GET | Master fleet database with search & pagination (`?q=`, `?norad=`, `?agency=`) |
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
