# Orbital Command + OrbitAlert Integration

## What changed

- Kept the original 3D Solar System/HUD page as `index.html`.
- Added `orbitalert.html` as a second page on the same Express site.
- Added an **OrbitAlert** link to desktop navigation and a bell shortcut on mobile. Navigation uses `orbitalert.html` so it also works on static hosting and local previews.
- Added Express routes for `/orbitalert` and `/orbitalert/`.
- Connected OrbitAlert's **Open 3D Map** actions to a project-relative `index.html#/earth` URL, so it also works when the project is hosted in a subfolder.
- Added `/orbitalert` to `sitemap.xml`.
- Preserved the original `server.js`, `sentinel-bot.js`, package dependencies, and ambient MP3 assets except for the OrbitAlert route addition.

## Install into your project

1. Make a backup or commit your current project to Git before replacing files.
2. Extract this ZIP into a temporary folder and review the changed files.
3. Copy the included project files into your existing project root, allowing replacement of `index.html`, `server.js`, and `sitemap.xml`; add `orbitalert.html`.
4. Keep your existing `.env`, Git history, `node_modules`, and any private configuration. Do not replace or upload secrets.
5. Install dependencies if needed with `npm install`, then start with `npm start`.
6. Test the main map at `/` and OrbitAlert at `/orbitalert`.

## Current limitations

OrbitAlert is currently a functional frontend prototype with demonstration event records. Its search, filters, detail drawer, CSV export, browser-local preferences and watchlist work locally. It does **not** yet load real conjunction events, calculate satellite passes, determine re-entry windows, perform live source health checks, or send email/Telegram/push messages.

The existing `server.js` has a Sentinel diagnostics endpoint but does not yet expose an OrbitAlert event API. The integration deliberately does not invent live events or pretend the diagnostics database is a validated space-event database. To make alert records real, implement and validate source ingestion / orbital calculations and then expose a dedicated API for OrbitAlert.

## Deployment note

The sitemap still uses `https://your-domain.com` placeholders from the supplied project. Replace those URLs with the actual production domain before release.


## Navigation compatibility fix

The main-page links now open `orbitalert.html` directly instead of depending exclusively on the Express-only `/orbitalert` route. The Express route is retained. The map links calculate the project base path and return to `index.html#/earth`.
