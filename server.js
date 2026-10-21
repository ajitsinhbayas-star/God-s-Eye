import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { sentinel } from './sentinel-bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Cap incoming JSON/beacon payloads to 32kb
app.use(express.json({ type: ['application/json', 'text/plain'], limit: '32kb' }));

// 2. Security & Referrer Policy headers
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// 3. Block public HTTP access to server code, configs, and the JSON database
const BLOCKED_PATHS = new Set([
  '/server.js',
  '/sentinel-bot.js',
  '/package.json',
  '/package-lock.json',
  '/diagnostics-db.json',
  '/.env',
  '/.gitignore'
]);

app.use((req, res, next) => {
  if (BLOCKED_PATHS.has(req.path.toLowerCase())) {
    return res.status(404).send('Not found');
  }
  next();
});

// 4. Silent Telemetry Endpoint (Receives navigator.sendBeacon reports)
app.post('/api/sentinel/telemetry', async (req, res) => {
  if (req.body && typeof req.body === 'object') {
    await sentinel.processIncident(req.body);
  }
  res.status(204).end();
});

// 5. Protected Developer Diagnostics Endpoint
app.get('/api/sentinel/diagnostics', async (req, res) => {
  const configuredSecret = process.env.DEV_SECRET;
  const providedKey = typeof req.query.key === 'string' ? req.query.key : '';

  if (!configuredSecret || configuredSecret.trim() === '') {
    return res.status(404).send('Not found');
  }

  // Constant-time comparison to prevent timing side-channel leaks
  const secretBuf = Buffer.from(configuredSecret);
  const keyBuf = Buffer.from(providedKey);
  if (secretBuf.length !== keyBuf.length || !crypto.timingSafeEqual(secretBuf, keyBuf)) {
    return res.status(404).send('Not found');
  }

  try {
    const summary = await sentinel.getDiagnosticSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read diagnostic logs' });
  }
});

// 6. OrbitAlert page: serve the new page under a clean URL on the same website.
app.get(['/orbitalert', '/orbitalert/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'orbitalert.html'));
});

// 7. Serve static frontend assets (deny hidden dotfiles like .env)
app.use(express.static(__dirname, { index: 'index.html', dotfiles: 'deny' }));

// 8. Single Page Application Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SYS] Server online on port ${PORT}`);
});