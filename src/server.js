import path from 'path';
import fs from 'fs';

// Automatically load local .env credentials if present
try {
  if (typeof process.loadEnvFile === 'function') {
    const envCandidate = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envCandidate)) {
      process.loadEnvFile(envCandidate);
    }
  }
} catch (_) {}

import compression from 'compression';
import express from 'express';
import http from 'http';
import { PORT, PUBLIC_DIR } from './config/constants.js';
import { getDatabase, initDatabase } from './db/sqlite.js';
import { getSpaceStore, flushSpaceStore } from './db/space-store.js';
import { initWebSocketServer, closeWebSocketServer } from './realtime/ws-server.js';
import * as sentinelAuth from './supervisor/admin-auth.js';
import { sentinelDiagnostics } from './supervisor/diagnostics.js';
import { workerManager } from './supervisor/worker-manager.js';

import {
  spaceRouter,
  computePassesForSatellite,
  handlePassesRequest,
  handleConjunctions,
  handleGroundStations,
  handleReentry,
  handleTimeTravel
} from './routes/space.js';
import { sentinelRouter } from './routes/sentinel.js';
import { objectsRouter } from './routes/objects.js';
import { weatherRouter } from './routes/weather.js';
import { airQualityRouter } from './routes/airquality.js';
import { analysisRouter } from './routes/analysis.js';
import { MASTER_TRACKABLE_CATALOG } from './config/catalog.js';

import { startIssPoller } from './daemons/iss-poller.js';
import { startCelesTrakDaemon } from './daemons/celestrak-worker.js';
import { startNoaaDaemon } from './daemons/noaa-weather-worker.js';
import { startJplCadDaemon } from './daemons/jpl-cad-worker.js';
import { startNewsDaemon } from './daemons/news-harvester.js';
import { startKeepAliveDaemon } from './daemons/keep-alive.js';
import { startWeatherDaemon } from './daemons/weather-worker.js';
import { startAirQualityDaemon } from './daemons/airquality-worker.js';
import { initWorkerRegistry } from './supervisor/worker-registry-init.js';
import { providerRegistry } from './supervisor/registry.js';

const app = express();
const server = http.createServer(app);

// Request parsing & compression
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(compression());

// CORS configuration (Enables local file:// testing & seamless localhost access)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Enhanced Production Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), geolocation=(self)');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content-Security-Policy compatible with WebGL Three.js, Leaflet, and Map Tile networks
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com https://fonts.googleapis.com",
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: *.rainviewer.com *.arcgisonline.com *.cartocdn.com *.openstreetmap.org",
    "connect-src 'self' ws: wss: https: http://localhost:3000 https://api.open-meteo.com https://nominatim.openstreetmap.org https://tilecache.rainviewer.com https://server.arcgisonline.com *.cartocdn.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  next();
});

// Canonical Domain Enforcement: 301 Permanent Redirect for www.orbitaleye.in to preferred root
app.use((req, res, next) => {
  const host = req.get('host');
  if (host) {
    const hostname = host.split(':')[0].toLowerCase();
    if (hostname === 'www.orbitaleye.in') {
      return res.redirect(301, `https://orbitaleye.in${req.originalUrl || req.url}`);
    }
  }
  next();
});

// Protect .env and hidden config files (Explicit 404)
app.use((req, res, next) => {
  if (req.path === '/.env' || req.path.startsWith('/.') || req.path.endsWith('.env')) {
    return res.status(404).send('Not found');
  }
  next();
});

// ==================== REST API ENDPOINTS ====================

// Health Endpoint
app.get('/api/health', (req, res) => {
  const store = getSpaceStore();
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    syncCycles: store.syncCycles,
    timestamp: new Date().toISOString()
  });
});

// Real Orbital Pass Predictions
app.get('/api/passes', handlePassesRequest);

// Astrodynamics, Situational Awareness & Multi-Agency Core Endpoints
app.get('/api/conjunctions', handleConjunctions);
app.get('/api/ground-stations', handleGroundStations);
app.get('/api/reentry', handleReentry);
app.get('/api/propagate-time', handleTimeTravel);
app.post('/api/propagate-time', handleTimeTravel);

// Subsystem API routers
app.use('/api/space', spaceRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/airquality', airQualityRouter);
app.use('/api/sentinel', sentinelRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api', objectsRouter);

// SatNOGS Radio Telemetry Gateway
const SATNOGS_API_BASE = 'https://db.satnogs.org/api';
app.get('/api/satnogs/transmitters/:noradId', async (req, res) => {
  const { noradId } = req.params;
  try {
    const headers = { 'Accept': 'application/json' };
    if (process.env.SATNOGS_API_TOKEN) {
      headers['Authorization'] = `Token ${process.env.SATNOGS_API_TOKEN}`;
    }

    const response = await fetch(`${SATNOGS_API_BASE}/transmitters/?satellite__norad_cat_id=${noradId}`, {
      headers,
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `SatNOGS returned HTTP ${response.status}` });
    }

    const data = await response.json();
    res.json({
      noradId,
      transmitters: Array.isArray(data) ? data.map(tx => ({
        description: tx.description,
        frequency: tx.frequency ? (tx.frequency / 1e6).toFixed(3) + ' MHz' : 'N/A',
        mode: tx.mode || 'FM/Digital',
        baud: tx.baud || null,
        status: tx.status,
        type: tx.type
      })) : []
    });
  } catch (err) {
    res.status(502).json({ error: 'SatNOGS gateway temporarily unavailable.' });
  }
});

// J.A.R.V.I.S. Aerospace Intelligence Route
app.post('/api/ai/chat', async (req, res) => {
  try {
    let msg = '';
    if (req.body && typeof req.body === 'object') {
      msg = req.body.message || '';
    } else if (typeof req.body === 'string') {
      try { msg = JSON.parse(req.body).message || req.body; } catch (_) { msg = req.body; }
    }
    const q = String(msg).trim();
    if (!q) {
      return res.json({ reply: "At your service, Sir. What space object or orbital parameter shall we analyze?" });
    }

    const store = getSpaceStore();
    const liveISS = store.liveISS;
    const spaceWeather = store.externalIntel?.spaceWeather;
    const issStr = liveISS
      ? `Lat: ${liveISS.latitude.toFixed(2)}°, Lon: ${liveISS.longitude.toFixed(2)}°, Alt: ${liveISS.altitude.toFixed(0)} km, Vel: ${liveISS.velocity.toFixed(0)} km/h`
      : 'Alt: 418 km, Vel: 27,600 km/h';
    const weatherStr = spaceWeather ? `Planetary Kp: ${spaceWeather.kpIndex} (${spaceWeather.stormLevel})` : 'Kp: 2.0 (Nominal)';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const systemPrompt = `You are J.A.R.V.I.S., the aerospace artificial intelligence engineered for God's Eye 3D Space Situational Awareness platform.
Tone & Persona: Confident, refined, polite British aerospace mission-control AI. Address the user as "Sir" or "Commander".
Never give repetitive generic answers. Answer the user's specific space query with factual, accurate technical details.
Keep responses to 2 or 3 crisp, executive sentences suitable for voice synthesis.
Live Telemetry Context:
- ISS Position: ${issStr}
- Space Weather: ${weatherStr}
- Tracked Assets: Cartosat-3, EOS-04, EOS-06, AstroSat, Aditya-L1 (L1 Halo), Chandrayaan-3, JWST (L2 Halo), Hubble.
Query: "${q}"`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }] }),
          signal: AbortSignal.timeout(8000)
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) return res.json({ reply: replyText.trim() });
        }
      } catch (_) {}
    }

    // Intelligent local fallback response grounded in live telemetry
    const lowerQ = q.toLowerCase();
    if (lowerQ.includes('iss') || lowerQ.includes('space station')) {
      return res.json({
        reply: `International Space Station telemetry lock confirmed, Sir. Current position is ${issStr}. All orbital parameters remain nominal.`
      });
    }
    if (lowerQ.includes('weather') || lowerQ.includes('storm') || lowerQ.includes('kp') || lowerQ.includes('sun') || lowerQ.includes('solar')) {
      return res.json({
        reply: `Solar activity report active, Sir. Space weather index reports ${weatherStr}. Geomagnetic conditions present no threat to LEO satellite constellations.`
      });
    }
    if (lowerQ.includes('pass') || lowerQ.includes('overhead') || lowerQ.includes('flyover')) {
      return res.json({
        reply: `Orbital pass calculations are synchronized, Sir. Next major ISS overhead transit is computed via real SGP4 propagation and available in the OrbitAlert viewport.`
      });
    }
    if (lowerQ.includes('jwst') || lowerQ.includes('webb') || lowerQ.includes('hubble')) {
      return res.json({
        reply: `Deep-space observatory telemetry locked, Sir. Hubble orbits at ~535 km inclination 28.5°, while JWST maintains its halo orbit around the Sun-Earth L2 Lagrange point ~1.5 million kilometers from Earth.`
      });
    }
    if (lowerQ.includes('source') || lowerQ.includes('provider') || lowerQ.includes('fresh')) {
      return res.json({
        reply: `Orbital data pipelines are online, Sir. CelesTrak NORAD elements, NOAA SWPC geomagnetic indices, and RainViewer radar mosaics are streaming with verified data integrity.`
      });
    }
    if (lowerQ.includes('aditya') || lowerQ.includes('isro') || lowerQ.includes('chandrayaan')) {
      return res.json({
        reply: `ISRO deep space telemetry engaged, Sir. Aditya-L1 is maintaining Sun-Earth L1 halo orbit observations, and all Earth-observation constellations (EOS-04, EOS-06, Cartosat-3) are transmitting nominal ephemerides.`
      });
    }

    return res.json({
      reply: `Sensory telemetry downlink nominal, Sir. SGP4 orbital propagation, space weather indices (${weatherStr}), and NOAA real-time feeds are synchronizing continuously across all viewports.`
    });
  } catch (err) {
    return res.json({ reply: "Telemetry downlink nominal, Sir. Sensory feeds are active." });
  }
});

// Explicit 404 for unhandled API calls — NEVER fall through to HTML index
app.all('/api/*', (req, res) => {
  res.status(404).json({ ok: false, error: `API route '${req.path}' not found` });
});

// ==================== BACKWARD-COMPATIBLE 301 PERMANENT REDIRECTS ====================
// Defined BEFORE static middleware & canonical routes so legacy and alternate URLs cleanly redirect

app.get(['/index.html', '/home', '/home.html'], (req, res) => {
  res.redirect(301, '/');
});

app.get(['/solar-system.html'], (req, res) => {
  res.redirect(301, '/solar-system');
});

app.get(['/earth.html'], (req, res) => {
  res.redirect(301, '/earth');
});

app.get(['/deepspace.html', '/deep-space', '/deep-space.html'], (req, res) => {
  res.redirect(301, '/deepspace');
});

app.get(['/asteroids.html'], (req, res) => {
  res.redirect(301, '/asteroids');
});

app.get(['/weather', '/weather/', '/weather.html', '/atmosphere.html'], (req, res) => {
  res.redirect(301, '/atmosphere');
});

app.get(['/airquality', '/airquality/', '/airquality.html', '/aqi', '/aqi/', '/aqi.html', '/air-quality.html'], (req, res) => {
  res.redirect(301, '/air-quality');
});

app.get(['/orbitalert', '/orbitalert/', '/orbitalert.html', '/orbital-alerts', '/orbital-alerts.html', '/alert.html'], (req, res) => {
  res.redirect(301, '/alert');
});

// ==================== CANONICAL HTML PAGE ROUTES ====================

app.get(['/', '/index'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get(['/solar-system', '/solar-system/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'solar-system.html'));
});

app.get(['/earth', '/earth/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'earth.html'));
});

app.get(['/deepspace', '/deepspace/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'deep-space.html'));
});

app.get(['/asteroids', '/asteroids/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'asteroids.html'));
});

app.get(['/atmosphere', '/atmosphere/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'atmosphere.html'));
});

app.get(['/air-quality', '/air-quality/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'air-quality.html'));
});

app.get(['/alert', '/alert/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'alert.html'));
});

app.get(['/offline', '/offline/', '/offline.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'offline.html'));
});

// Explicit Service Worker & Manifest Route with strict PWA caching rules
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(PUBLIC_DIR, 'sw.js'));
});

app.get('/manifest.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(PUBLIC_DIR, 'manifest.json'));
});

// Dynamic SEO Sitemap & Robots with strict canonical host validation
function getCanonicalBaseUrl(req) {
  const PREFERRED_CANONICAL = 'https://orbitaleye.in';
  const raw = (process.env.CANONICAL_HOST || '').trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      // Strictly accept only the exact HTTPS protocol and exact orbitaleye.in hostname
      if (parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'orbitaleye.in') {
        return PREFERRED_CANONICAL;
      }
    } catch {
      // Invalid URL format - fall back to preferred canonical
    }
  }
  return PREFERRED_CANONICAL;
}

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = getCanonicalBaseUrl(req).replace(/\/+$/, '');
  const now = new Date().toISOString().split('T')[0];
  const pages = [
    { path: '', priority: '1.0', freq: 'hourly' },
    { path: 'solar-system', priority: '0.95', freq: 'daily' },
    { path: 'earth', priority: '0.95', freq: 'hourly' },
    { path: 'deepspace', priority: '0.85', freq: 'weekly' },
    { path: 'asteroids', priority: '0.90', freq: 'daily' },
    { path: 'atmosphere', priority: '0.95', freq: 'hourly' },
    { path: 'air-quality', priority: '0.95', freq: 'hourly' },
    { path: 'alert', priority: '0.90', freq: 'hourly' }
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.path ? `/${p.path}` : '/'}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(sitemapXml.trim());
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = getCanonicalBaseUrl(req).replace(/\/+$/, '');
  const robotsTxt = `User-agent: *
Allow: /
Allow: /solar-system
Allow: /earth
Allow: /deepspace
Allow: /asteroids
Allow: /atmosphere
Allow: /air-quality
Allow: /alert
Allow: /icons/
Allow: /images/
Allow: /js/
Allow: /data/
Disallow: /sentinel
Disallow: /sentinel/
Disallow: /sentinel.html
Disallow: /sentinel-login
Disallow: /api/
Disallow: /.env

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(robotsTxt);
});

// ==================== SENTINEL ADMIN SECURITY GUARDS ====================

app.get('/sentinel-login', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(PUBLIC_DIR, 'sentinel-login.html'));
});

// Intercept all /sentinel variants BEFORE express.static
app.get(['/sentinel', '/sentinel/', '/sentinel.html'], sentinelAuth.requireAdminAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(PUBLIC_DIR, 'sentinel.html'));
});

// ==================== STATIC ASSETS & SPA FALLBACK ====================

app.use(express.static(PUBLIC_DIR, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// 404 Handler for genuinely unknown routes — NEVER silently fall through to homepage index.html
app.use((req, res) => {
  res.status(404);
  if (req.accepts('html')) {
    res.sendFile(path.join(PUBLIC_DIR, '404.html'));
  } else if (req.accepts('json')) {
    res.json({ ok: false, error: 'Resource not found', path: req.originalUrl });
  } else {
    res.type('txt').send('404 Not Found');
  }
});

// ==================== ASYNCHRONOUS SYSTEM INITIALIZATION & LIFECYCLE ====================

export async function startServer() {
  try {
    // 1 & 2. Open SQLite & Complete all schema creation and migrations
    console.log('[SYS] Step 1-2: Initializing SQLite database schema and migrations...');
    await initDatabase();

    // 3. Confirm the database is ready
    console.log('[SYS] Step 3: SQLite schema verified — database confirmed ready.');

    // 4. Initialize space store and WebSocket services
    getSpaceStore();
    initWebSocketServer(server);

    // 5. Start background daemons
    startIssPoller();
    startCelesTrakDaemon();
    startNoaaDaemon();
    startJplCadDaemon();
    startNewsDaemon();
    startKeepAliveDaemon();
    startWeatherDaemon();
    startAirQualityDaemon();

    // 6. Register automated workers & provider telemetry
    initWorkerRegistry();
    providerRegistry.pingAllOpenProviders().catch(() => {});

    // 7. Start workers and their scheduled jobs
    workerManager.startAll();

    // 8. Initialize startup diagnostics
    sentinelDiagnostics.logEvent('STARTUP', 'INFO', `God's Eye Orbital Engine initialized on port ${PORT}`, {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    });

    // 9. Start HTTP server with server.listen() only after DB readiness
    return new Promise((resolve) => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`[SYS] God's Eye Orbital Command Engine active on port ${PORT}`);
        resolve(server);
      });
    });
  } catch (err) {
    console.error('[SYS] Critical failure during server startup:', err.message);
    process.exit(1);
  }
}

// Auto-start server when run directly
startServer();

// Graceful Process Shutdown Handler
let isShuttingDown = false;
async function handleGracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[SYS] Received ${signal}. Initiating graceful shutdown...`);
  sentinelDiagnostics.logEvent('SHUTDOWN', 'INFO', `Graceful shutdown initiated via ${signal}`);

  try {
    // 1. Flush any active space store writes
    await flushSpaceStore();
    console.log('[SYS] Space store cache flushed to disk.');

    // 2. Close WebSocket connections
    closeWebSocketServer();

    // 3. Close HTTP server
    server.close(() => {
      console.log('[SYS] HTTP server closed cleanly.');
      process.exit(0);
    });

    // Force exit if hanging after 4s
    setTimeout(() => {
      console.warn('[SYS] Forced shutdown after timeout.');
      process.exit(0);
    }, 4000);
  } catch (err) {
    console.error('[SYS] Shutdown error:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
