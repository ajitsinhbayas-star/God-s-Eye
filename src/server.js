import compression from 'compression';
import express from 'express';
import http from 'http';
import path from 'path';
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
app.use('/api/sentinel', sentinelRouter);
app.use('/api', objectsRouter);

app.get('/api/passes', (req, res) => {
  res.json({ ok: true, meta: { generatedAt: new Date().toISOString() }, data: [] });
});

// HTML Pages
app.get(['/sentinel', '/sentinel/', '/sentinel.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'sentinel.html'));
});

app.get(['/orbitalert', '/orbitalert/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'orbitalert.html'));
});

// Static files from public/
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
}
    if (message.includes('SUN') || message.includes('SOLAR')) {
      return res.json({ reply: "The Sun is at the gravitational center of our system, Sir. Current solar radiation flux is nominal." });
    }
    if (message.includes('ISS') || message.includes('SPACE STATION')) {
      return res.json({ reply: "The International Space Station is in Low Earth Orbit at approximately 418 km altitude, moving at 27,600 km/h, Sir." });
    }
    if (message.includes('ISRO')) {
      return res.json({ reply: "Monitoring active ISRO assets including Cartosat-3, EOS-04 radar imaging, and AstroSat, Sir." });
    }

    return res.json({ reply: "Sensors nominal, Sir. Telemetry uplink active and tracking all target sectors." });
  } catch (err) {
    return res.json({ reply: "Telemetry downlink re-established, Sir. All orbital arrays report status nominal." });
  }
});

