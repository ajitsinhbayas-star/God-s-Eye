const sentinelAuth = require('./supervisor/admin-auth');
const sentinelRoutes = require('./routes/sentinel');
﻿import path from 'path';
import compression from 'compression';
import express from 'express';
import http from 'http';
import { PORT, PUBLIC_DIR } from './config/constants.js';
import { getDatabase } from './db/sqlite.js';
import { getSpaceStore } from './db/space-store.js';
import { initWebSocketServer } from './realtime/ws-server.js';

import { spaceRouter } from './routes/space.js';
import { sentinelRouter } from './routes/sentinel.js';
import { objectsRouter } from './routes/objects.js';

import { startIssPoller } from './daemons/iss-poller.js';
import { startCelesTrakDaemon } from './daemons/celestrak-worker.js';
import { startNoaaDaemon } from './daemons/noaa-weather-worker.js';
import { startJplCadDaemon } from './daemons/jpl-cad-worker.js';
import { startNewsDaemon } from './daemons/news-harvester.js';
import { startKeepAliveDaemon } from './daemons/keep-alive.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);

app.use(express.json({ limit: '32kb' }));
app.use(compression());

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Protect .env and private config access (Explicit 404)
app.use((req, res, next) => {
  if (req.path === '/.env' || req.path.startsWith('/.') || req.path.endsWith('.env')) {
    return res.status(404).send('Not found');
  }
  next();
});

// Health Endpoint
app.get('/api/health', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, uptime: Math.round(process.uptime()), syncCycles: store.syncCycles });
});

// Mount Routes
app.use('/api/space', spaceRouter);

app.use('/api', objectsRouter);

app.get('/api/passes', (req, res) => {
  res.json({ ok: true, meta: { generatedAt: new Date().toISOString() }, data: [] });
});

// HTML Pages


app.get(['/orbitalert', '/orbitalert/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'orbitalert.html'));
});

// Static files from public/

// ==================== SENTINEL ADMIN SECURITY GUARDS ====================
app.use('/api/sentinel', sentinelRoutes);

app.get('/sentinel-login', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '../public/sentinel-login.html'));
});

// Intercept all /sentinel variants BEFORE express.static
app.get(['/sentinel', '/sentinel/', '/sentinel.html'], sentinelAuth.requireAdminAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '../public/sentinel.html'));
});
// =========================================================================

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

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Initialize DB, WS & Daemons
getDatabase();
getSpaceStore();
initWebSocketServer(server);

startIssPoller();
startCelesTrakDaemon();
startNoaaDaemon();
startJplCadDaemon();
startNewsDaemon();
startKeepAliveDaemon();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SYS] Orbital Command Engine active on port ${PORT}`);
});



// --- J.A.R.V.I.S. COMPREHENSIVE SATELLITE INTEL ROUTE ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    let msg = '';
    if (req.body && typeof req.body === 'object') {
      msg = req.body.message || '';
    } else if (typeof req.body === 'string') {
      try { msg = JSON.parse(req.body).message || req.body; } catch (_) { msg = req.body; }
    }
    const q = String(msg).trim();
    if (!q) return res.json({ reply: "At your service, Sir. What space object or telemetry parameter shall we analyze?" });

    // Cache ISS Telemetry
    let issTelemetry = "Alt: 418.4 km | Vel: 27,600 km/h | Inc: 51.64°";
    try {
      const liveRes = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal: AbortSignal.timeout(2000) });
      if (liveRes.ok) {
        const d = await liveRes.json();
        issTelemetry = `Lat: ${d.latitude.toFixed(2)}°, Lon: ${d.longitude.toFixed(2)}°, Alt: ${d.altitude.toFixed(1)} km, Vel: ${d.velocity.toFixed(0)} km/h`;
      }
    } catch (_) {}

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const systemPrompt = `You are J.A.R.V.I.S., the aerospace artificial intelligence engineered by Mr. Singh for God's Eye 3D Space Situational Awareness platform.
Tone & Persona: Confident, refined, polite British aerospace mission-control AI. Address the user as "Sir" or "Mr. Singh".
Never give repetitive generic answers. Answer the user's specific space query with factual, accurate technical details.
Keep responses to 2 or 3 crisp, executive sentences suitable for voice synthesis.
Live ISS state: ${issTelemetry}.
Tracked ISRO assets: Aditya-L1 (Sun-Earth L1 halo orbit, solar physics), EOS-06 / Oceansat-3 (ocean color/sea surface temp, 742km SSO), EOS-04 / RISAT-1A (radar imaging), Cartosat-3, AstroSat, Chandrayaan-3 propulsion.
Current Query: "${q}"`;

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }] }),
        signal: AbortSignal.timeout(7000)
      });
      const data = await aiRes.json();
      let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) return res.json({ reply: replyText.trim() });
    }

    return res.json({
      reply: `Sensors locked, Sir. Telemetry for the requested target has been downlinked. Real-time sensory feeds across Indian ground stations report nominal status.`
    });
  } catch (err) {
    return res.json({ reply: "Telemetry downlink nominal, Sir. Sensory feeds are active." });
  }
});


// --- PAGE ROUTES ---
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});



app.get('/orbitalert', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'orbitalert.html'));
});
// Add into src/server.js

const SATNOGS_API_BASE = 'https://db.satnogs.org/api';

/**
 * Proxy route to query SatNOGS DB for transmitter frequencies,
 * active ground station observations, and TLE data.
 */
app.get('/api/satnogs/transmitters/:noradId', async (req, res) => {
  const { noradId } = req.params;
  try {
    const headers = { 'Accept': 'application/json' };
    if (process.env.SATNOGS_API_TOKEN) {
      headers['Authorization'] = `Token ${process.env.SATNOGS_API_TOKEN}`;
    }

    const response = await fetch(`${SATNOGS_API_BASE}/transmitters/?satellite__norad_cat_id=${noradId}`, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: `SatNOGS returned HTTP ${response.status}` });
    }

    const data = await response.json();
    res.json({
      noradId,
      transmitters: data.map(tx => ({
        description: tx.description,
        frequency: tx.frequency ? (tx.frequency / 1e6).toFixed(3) + ' MHz' : 'N/A',
        mode: tx.mode || 'FM/Digital',
        baud: tx.baud || null,
        status: tx.status,
        type: tx.type
      }))
    });
  } catch (err) {
    console.error('[SatNOGS Gateway Error]:', err.message);
    res.status(500).json({ error: 'Failed to query SatNOGS DB gateway.' });
  }
});
// --- END PAGE ROUTES ---



