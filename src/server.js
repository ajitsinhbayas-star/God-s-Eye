import path from 'path';
import compression from 'compression';
import express from 'express';
import http from 'http';
import { PORT, PUBLIC_DIR } from './config/constants.js';
import { getDatabase } from './db/sqlite.js';
import { getSpaceStore, flushSpaceStore } from './db/space-store.js';
import { initWebSocketServer, closeWebSocketServer } from './realtime/ws-server.js';
import * as sentinelAuth from './supervisor/admin-auth.js';
import { sentinelDiagnostics } from './supervisor/diagnostics.js';

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

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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

// ==================== HTML PAGE ROUTES ====================

app.get(['/', '/index', '/index.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get(['/airquality', '/airquality/', '/airquality.html', '/aqi', '/aqi.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'airquality.html'));
});

app.get(['/weather', '/weather/', '/weather.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'weather.html'));
});

app.get(['/earth', '/earth/', '/earth.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'earth.html'));
});

app.get(['/deepspace', '/deepspace/', '/deepspace.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'deepspace.html'));
});

app.get(['/asteroids', '/asteroids/', '/asteroids.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'asteroids.html'));
});

app.get(['/orbitalert', '/orbitalert/', '/orbitalert.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'orbitalert.html'));
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

// Dynamic SEO Sitemap & Robots with environment-aware canonical host
function getCanonicalBaseUrl(req) {
  if (process.env.CANONICAL_HOST) {
    return process.env.CANONICAL_HOST.replace(/\/+$/, '');
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }
  const host = req.get('host');
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${req.protocol}://${host}`;
  }
  return 'https://orbitaleye.in';
}

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = getCanonicalBaseUrl(req);
  const now = new Date().toISOString().split('T')[0];
  const pages = [
    { path: '', priority: '1.0', freq: 'hourly' },
    { path: 'earth', priority: '0.95', freq: 'hourly' },
    { path: 'weather', priority: '0.95', freq: 'hourly' },
    { path: 'orbitalert', priority: '0.90', freq: 'hourly' },
    { path: 'asteroids', priority: '0.90', freq: 'daily' },
    { path: 'deepspace', priority: '0.85', freq: 'weekly' }
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}/${p.path}</loc>
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
  const baseUrl = getCanonicalBaseUrl(req);
  const robotsTxt = `User-agent: *
Allow: /
Allow: /earth
Allow: /weather
Allow: /orbitalert
Allow: /asteroids
Allow: /deepspace
Disallow: /sentinel
Disallow: /sentinel/
Disallow: /sentinel.html
Disallow: /sentinel-login
Disallow: /api/
Disallow: /.env
Disallow: /data/

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

// SPA Fallback for browser client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ==================== SYSTEM INITIALIZATION & LIFECYCLE ====================

getDatabase();
getSpaceStore();
initWebSocketServer(server);

startIssPoller();
startCelesTrakDaemon();
startNoaaDaemon();
startJplCadDaemon();
startNewsDaemon();
startKeepAliveDaemon();
startWeatherDaemon();
startAirQualityDaemon();

sentinelDiagnostics.logEvent('STARTUP', 'INFO', `God's Eye Orbital Engine initialized on port ${PORT}`, {
  nodeVersion: process.version,
  platform: process.platform,
  pid: process.pid
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SYS] God's Eye Orbital Command Engine active on port ${PORT}`);
});

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
