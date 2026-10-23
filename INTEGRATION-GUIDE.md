# \# Orbital Command + OrbitAlert Integration

# 

# \## What Changed

# 

# \* Kept the original 3D Solar System/HUD page as `index.html`.

# \* Added `orbitalert.html` as a second page on the same Express site.

# \* Added an \*\*OrbitAlert\*\* link to desktop navigation and a bell shortcut on mobile. Navigation uses `orbitalert.html` so it also works on static hosting and local previews.

# \* Added Express routes for `/orbitalert` and `/orbitalert/`.

# \* Connected OrbitAlert's \*\*Open 3D HUD\*\* actions to a project-relative `index.html#/earth` URL, so it also works when the project is hosted in a subfolder.

# \* Added `/orbitalert` to `sitemap.xml`.

# 

# \## Install \& Setup

# 

# 1\. Make a backup or commit your current project to Git before replacing files.

# 2\. Install runtime dependencies:

# &#x20;  ```bash

# &#x20;  npm install

# \## Automated SpaceDB \& API Architecture

# 

# `server.js` runs an automated background ingestion and J2 orbital propagation daemon (`space-db.json`) that synchronizes both `index.html` and `orbitalert.html`:

# 

# \* \*\*`GET /api/space/bootstrap`\*\*: Returns the enriched satellite/probe catalog, automated LEO conjunction screenings, observer-specific overhead pass predictions, re-entry windows, and pipeline health metrics.

# \* \*\*`GET /api/space/above-me`\*\*: Computes real-time topocentric look angles (Elevation, Azimuth, 16-point Compass) and twilight naked-eye visibility across 30 Indian cities.

# \* \*\*`GET /api/space/missions`\*\*: Filters trackable satellites and deep-space missions by query and agency.

# \* \*\*`POST /api/space/sync`\*\*: Triggers an immediate sync with WhereTheISS, CelesTrak NORAD GP elements, and recalculates passes for custom observer GPS coordinates.

# \* \*\*`POST /api/space/watchlist` \& `POST /api/space/preferences`\*\*: Persists user watchlists and alert rules to `space-db.json`.

# \* \*\*`GET /api/nasa-live-hub` \& `GET /api/nasa-solar-live`\*\*: Streams real-time NASA Deep Space Network (DSN Now), JPL Horizons 3D state vectors, NeoWs close-approach asteroids, EONET Earth events, and DONKI space weather.

# 

# \## Deployment Note

# 

# Replace `https://your-domain.com` in `index.html`, `robots.txt`, and `sitemap.xml` with your production domain before release.

