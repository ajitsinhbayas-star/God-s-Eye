# Orbital Command + OrbitAlert Integration

## What changed

* Kept the original 3D Solar System/HUD page as `index.html`.
* Added `orbitalert.html` as a second page on the same Express site.
* Added an **OrbitAlert** link to desktop navigation and a bell shortcut on mobile. Navigation uses `orbitalert.html` so it also works on static hosting and local previews.
* Added Express routes for `/orbitalert` and `/orbitalert/`.
* Connected OrbitAlert's **Open 3D Map** actions to a project-relative `index.html#/earth` URL, so it also works when the project is hosted in a subfolder.
* Added `/orbitalert` to `sitemap.xml`.
* Preserved the original `server.js`, `sentinel-bot.js`, package dependencies, and ambient MP3 assets except for the OrbitAlert route addition.

## Install into your project

1. Make a backup or commit your current project to Git before replacing files.
2. Extract this ZIP into a temporary folder and review the changed files.
3. Copy the included project files into your existing project root, allowing replacement of `index.html`, `server.js`, and `sitemap.xml`; add `orbitalert.html`.
4. Keep your existing `.env`, Git history, `node\\\_modules`, and any private configuration. Do not replace or upload secrets.
5. Install dependencies if needed with `npm install`, then start with `npm start`.
6. Test the main map at `/` and OrbitAlert at `/orbitalert`.

## \## Automated SpaceDB \& API Architecture

## 

## `server.js` runs an automated background ingestion and J2 orbital propagation daemon (`space-db.json`) that synchronizes both `index.html` and `orbitalert.html`:

## \- \*\*`GET /api/space/bootstrap`\*\*: Returns the enriched satellite/probe catalog, automated LEO conjunction screenings, observer-specific overhead pass predictions, re-entry windows, and pipeline health metrics.

## \- \*\*`GET /api/space/missions`\*\*: Filters trackable satellites and deep-space missions by query and agency.## Automated SpaceDB \& API Architecture

## 

## `server.js` runs an automated background ingestion and J2 orbital propagation daemon (`space-db.json`) that synchronizes both `index.html` and `orbitalert.html`:

## 

## \- \*\*`GET /api/space/bootstrap`\*\*: Returns the enriched satellite/probe catalog, automated LEO conjunction screenings, observer-specific overhead pass predictions, re-entry windows, and pipeline health metrics.

## \- \*\*`GET /api/space/missions`\*\*: Filters trackable satellites and deep-space missions by query and agency.

## \- \*\*`POST /api/space/sync`\*\*: Triggers an immediate sync with WhereTheISS, CelesTrak NORAD GP elements, and recalculates passes for custom observer GPS coordinates.

## \- \*\*`POST /api/space/watchlist` \& `POST /api/space/preferences`\*\*: Persists user watchlists and alert rules to `space-db.json`.

## 

## \## Deployment note

## \- \*\*`POST /api/space/sync`\*\*: Triggers an immediate sync with WhereTheISS, CelesTrak NORAD GP elements, and recalculates passes for custom observer GPS coordinates.

## \- \*\*`POST /api/space/watchlist` \& `POST /api/space/preferences`\*\*: Persists user watchlists and alert rules to `space-db.json`.Deployment note

The sitemap still uses `https://your-domain.com` placeholders from the supplied project. Replace those URLs with the actual production domain before release.



## Navigation compatibility fix

The main-page links now open `orbitalert.html` directly instead of depending exclusively on the Express-only `/orbitalert` route. The Express route is retained. The map links calculate the project base path and return to `index.html#/earth`.

