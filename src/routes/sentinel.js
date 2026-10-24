import express from 'express';
import { getDatabase } from '../db/sqlite.js';
import { sentinelDiagnostics } from '../supervisor/diagnostics.js';

export const sentinelRouter = express.Router();

sentinelRouter.get('/workers', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM worker_states', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, count: rows.length, workers: rows });
  });
});

sentinelRouter.post('/workers/control', (req, res) => {
  const { worker_id, action } = req.body;
  if (!worker_id || !action) return res.status(400).json({ success: false, error: 'Missing parameters' });
  const db = getDatabase();
  const newState = action === 'pause' ? 'paused' : 'running';
  db.run('UPDATE worker_states SET state = ?, last_run = ? WHERE worker_id = ?', [newState, new Date().toISOString(), worker_id], (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: `Worker ${worker_id} set to ${newState}` });
  });
});

sentinelRouter.get('/sources', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM source_health', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, sources: rows });
  });
});

sentinelRouter.get('/logs', (req, res) => {
  const db = getDatabase();
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
  db.all('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, logs: rows });
  });
});

sentinelRouter.get('/satellites', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM normalized_objects ORDER BY alt_km ASC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, count: rows.length, satellites: rows });
  });
});

sentinelRouter.post('/telemetry', async (req, res) => {
  if (req.body && typeof req.body === 'object') {
    await sentinelDiagnostics.processIncident(req.body);
  }
  res.status(204).end();
});
