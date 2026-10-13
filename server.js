import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { sentinel } from './sentinel-bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Parse silent JSON beacons
app.use(express.json({ type: ['application/json', 'text/plain'] }));

// Strict Referrer Policy for YouTube Embeds & APIs
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Silent Telemetry Endpoint (Only called via navigator.sendBeacon)
app.post('/api/sentinel/telemetry', async (req, res) => {
  if (req.body) {
    await sentinel.processIncident(req.body);
  }
  res.status(204).end(); // Returns 204 No Content silently
});

// Private Developer Diagnostics Endpoint (For when you check server health)
// Accessible at: https://your-app.onrender.com/api/sentinel/diagnostics?key=YOUR_SECRET_KEY
app.get('/api/sentinel/diagnostics', (req, res) => {
  const secret = process.env.DEV_SECRET || 'dev_master_key';
  if (req.query.key !== secret) {
    return res.status(404).send('Not found'); // Disguised as 404 for normal visitors
  }
  res.json(sentinel.getDiagnosticSummary());
});

// Serve frontend static files
app.use(express.static(__dirname));

// Single Page Application Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SYS] Server online on port ${PORT}`);
});
