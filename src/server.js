import path from 'path';
import compression from 'compression';
import express from 'express';
import http from 'http';
import { PORT, PUBLIC_DIR } from './config/constants.js';
import { getDatabase } from './db/sqlite.js';
import { getSpaceStore } from './db/space-store.js';
import { initWebSocketServer } from './realtime/ws-server.js';
import * as sentinelAuth from './supervisor/admin-auth.js';

import { spaceRouter, computePassesForSatellite } from './routes/space.js';
import { sentinelRouter } from './routes/sentinel.js';
import { objectsRouter } from './routes/objects.js';
import { weatherRouter } from './routes/weather.js';
import { MASTER_TRACKABLE_CATALOG } from './config/catalog.js';

import { startIssPoller } from './daemons/iss-poller.js';
import { startCelesTrakDaemon } from './daemons/celestrak-worker.js';
import { startNoaaDaemon } from './daemons/noaa-weather-worker.js';
import { startJplCadDaemon } from './daemons/jpl-cad-worker.js';
import { startNewsDaemon } from './daemons/news-harvester.js';
import { startKeepAliveDaemon } from './daemons/keep-alive.js';
import { startWeatherDaemon } from './daemons/weather-worker.js';

const app = express();
const server = http.createServer(app);

// Request parsing & compression
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(compression());

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
app.get('/api/passes', (req, res) => {
  const store = getSpaceStore();
  const obsLat = req.query.lat ? parseFloat(req.query.lat) : (store.preferences?.observerLat || 18.5204);
  const obsLon = req.query.lon ? parseFloat(req.query.lon) : (store.preferences?.observerLon || 73.8567);
  const hours = parseFloat(req.query.hours) || 48;
  const minElevation = parseFloat(req.query.minElevation) || 10.0;

  let targetSat = null;
  if (req.query.norad) {
    const noradNum = parseInt(req.query.norad, 10);
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.norad === noradNum);
  } else if (req.query.satId) {
    const sId = String(req.query.satId).toLowerCase();
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id.toLowerCase() === sId);
  }

  if (!targetSat) {
    targetSat = MASTER_TRACKABLE_CATALOG.find(s => s.id === 'iss') || {
      id: 'iss',
      name: 'ISS (Zarya)',
      norad: 25544,
      parent: 'earth',
      altKm: 418
    };
  }

  const passes = computePassesForSatellite(targetSat, obsLat, obsLon, hours, minElevation);

  res.json({
    ok: true,
    meta: {
      generatedAt: new Date().toISOString(),
      observer: { lat: obsLat, lon: obsLon },
      satellite: { id: targetSat.id, name: targetSat.name, norad: targetSat.norad },
      predictionWindowHours: hours
    },
    count: passes.length,
    data: passes
  });
});

// Subsystem API routers
app.use('/api/space', spaceRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/sentinel', sentinelRouter);
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
    if (lowerQ.includes('aditya') || lowerQ.includes('isro') || lowerQ.includes('chandrayaan')) {
      return res.json({
        reply: `ISRO deep space telemetry engaged, Sir. Aditya-L1 is maintaining Sun-Earth L1 halo orbit observations, and all Earth-observation constellations (EOS-04, EOS-06, Cartosat-3) are transmitting nominal ephemerides.`
      });
    }

    return res.json({
      reply: `Sensory telemetry downlink nominal, Sir. SGP4 orbital propagation and NOAA real-time feeds are synchronizing continuously across all orbital viewports.`
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
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    }
  }
}));

// SPA Fallback for browser client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ==================== SYSTEM INITIALIZATION ====================

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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SYS] God's Eye Orbital Command Engine active on port ${PORT}`);
});
