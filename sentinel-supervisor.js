import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3Pkg from 'sqlite3';
import { WebSocketServer, WebSocket } from 'ws';

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initSentinelSupervisor(app, server) {
  const DB_FILE = path.join(__dirname, 'sentinel_command.db');
  const wss = new WebSocketServer({ server });

  const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
      console.error('[Sentinel DB] Connection error:', err.message);
    } else {
      console.log('[Sentinel DB] Connected to SQLite database: sentinel_command.db');
      initDatabase();
    }
  });

  function initDatabase() {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT,
        service TEXT,
        message TEXT,
        details TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS source_health (
        source_id TEXT PRIMARY KEY,
        name TEXT,
        status TEXT,
        last_success DATETIME,
        last_error TEXT,
        error_count INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        consecutive_failures INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS worker_states (
        worker_id TEXT PRIMARY KEY,
        name TEXT,
        state TEXT,
        last_run DATETIME,
        next_run DATETIME,
        duration_ms INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS satellite_catalog (
        norad_id TEXT PRIMARY KEY,
        name TEXT,
        source TEXT,
        lat REAL,
        lng REAL,
        alt_km REAL,
        velocity_kms REAL,
        status TEXT,
        last_updated DATETIME,
        orbital_elements TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS conjunction_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        primary_object TEXT,
        secondary_object TEXT,
        miss_distance_km REAL,
        collision_probability REAL,
        status TEXT
      )`);

      const initialSources = [
        ['spacetrack', 'Space-Track', 'healthy', new Date().toISOString(), null, 0, 142, 0],
        ['celestrak', 'CelesTrak', 'healthy', new Date().toISOString(), null, 0, 98, 0],
        ['esa_estrack', 'ESA ESTRACK', 'healthy', new Date().toISOString(), null, 0, 210, 0],
        ['isro_istrac', 'ISRO ISTRAC', 'healthy', new Date().toISOString(), null, 0, 185, 0],
        ['nasa_horizons', 'NASA / JPL Horizons', 'healthy', new Date().toISOString(), null, 0, 115, 0],
        ['satnogs', 'SatNOGS Network', 'healthy', new Date().toISOString(), null, 0, 76, 0],
        ['leolabs', 'LeoLabs Radar', 'degraded', new Date().toISOString(), 'Rate limit threshold approaching', 2, 450, 1],
        ['slingshot', 'Slingshot Aerospace', 'healthy', new Date().toISOString(), null, 0, 230, 0]
      ];

      initialSources.forEach(src => {
        db.run(`INSERT OR IGNORE INTO source_health (source_id, name, status, last_success, last_error, error_count, latency_ms, consecutive_failures) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, src);
      });

      const initialWorkers = [
        ['data_collection', 'Space Data Collection Worker', 'running', new Date().toISOString(), new Date(Date.now() + 15000).toISOString(), 450, 128, 2],
        ['data_validation', 'Data Validation & Sync Worker', 'running', new Date().toISOString(), new Date(Date.now() + 10000).toISOString(), 120, 128, 0],
        ['orbital_monitor', 'Orbital Monitoring & Conjunction Worker', 'running', new Date().toISOString(), new Date(Date.now() + 20000).toISOString(), 310, 95, 0],
        ['website_health', 'Website Health & Error Detection', 'running', new Date().toISOString(), new Date(Date.now() + 5000).toISOString(), 45, 340, 0],
        ['auto_recovery', 'Automatic Recovery & Circuit Breaker', 'running', new Date().toISOString(), new Date(Date.now() + 30000).toISOString(), 85, 42, 0],
        ['diagnostics', 'Data Health & Diagnostics Worker', 'running', new Date().toISOString(), new Date(Date.now() + 15000).toISOString(), 60, 210, 0]
      ];

      initialWorkers.forEach(w => {
        db.run(`INSERT OR IGNORE INTO worker_states (worker_id, name, state, last_run, next_run, duration_ms, success_count, failure_count) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, w);
      });

      db.get("SELECT COUNT(*) as count FROM satellite_catalog", (err, row) => {
        if (row && row.count === 0) {
          const sampleSats = [
            ['25544', 'ISS (ZARYA)', 'CelesTrak', 28.5, -45.2, 420.5, 7.66, 'active', new Date().toISOString(), 'TLE Data Valid'],
            ['43013', 'STARLINK-1007', 'Space-Track', 53.0, 12.4, 550.1, 7.56, 'active', new Date().toISOString(), 'TLE Data Valid'],
            ['20580', 'HST (HUBBLE)', 'NASA / JPL', 28.4, -75.1, 535.8, 7.59, 'active', new Date().toISOString(), 'Ephemeris Valid'],
            ['48274', 'TIANGONG SPACE STATION', 'JAXA/ISRO Feed', 41.5, 110.2, 385.4, 7.68, 'active', new Date().toISOString(), 'State Vector Valid'],
            ['37820', 'METOP-B', 'ESA ESTRACK', 82.1, 5.2, 817.3, 7.42, 'active', new Date().toISOString(), 'TLE Data Valid'],
            ['40901', 'SENTINEL-6A', 'EU SST', 66.0, -20.5, 1336.0, 6.75, 'active', new Date().toISOString(), 'Precision Orbit Valid']
          ];
          sampleSats.forEach(sat => {
            db.run(`INSERT OR REPLACE INTO satellite_catalog (norad_id, name, source, lat, lng, alt_km, velocity_kms, status, last_updated, orbital_elements) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, sat);
          });
        }
      });
    });
  }

  function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to SENTINEL Autonomous Intelligence Telemetry Stream' }));
  });

  // REST API Endpoints
  app.get('/api/sentinel/workers', (req, res) => {
    db.all("SELECT * FROM worker_states", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, workers: rows });
    });
  });

  app.post('/api/sentinel/workers/control', (req, res) => {
    const { worker_id, action } = req.body;
    if (!worker_id || !action) {
      return res.status(400).json({ success: false, error: 'Missing worker_id or action' });
    }

    let newState = 'running';
    if (action === 'pause') newState = 'paused';
    if (action === 'resume' || action === 'restart' || action === 'sync') newState = 'running';

    db.run("UPDATE worker_states SET state = ?, last_run = ? WHERE worker_id = ?", [newState, new Date().toISOString(), worker_id], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      db.run("INSERT INTO system_logs (level, service, message, details) VALUES (?, ?, ?, ?)",
        ['INFO', `Worker:${worker_id}`, `Manual action '${action}' executed successfully.`, `New state: ${newState}`]);

      broadcast({ type: 'WORKER_UPDATE', worker_id, state: newState });
      res.json({ success: true, message: `Worker ${worker_id} updated to ${newState}` });
    });
  });

  app.get('/api/sentinel/sources', (req, res) => {
    db.all("SELECT * FROM source_health", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, sources: rows });
    });
  });

  app.post('/api/sentinel/sources/configure', (req, res) => {
    const { source_id, status } = req.body;
    if (!source_id || !status) return res.status(400).json({ success: false, error: 'Missing parameters' });

    db.run("UPDATE source_health SET status = ? WHERE source_id = ?", [status, source_id], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      db.run("INSERT INTO system_logs (level, service, message, details) VALUES (?, ?, ?, ?)",
        ['WARN', `Source:${source_id}`, `Source status changed to ${status}`, 'Administrative override']);
      broadcast({ type: 'SOURCE_UPDATE', source_id, status });
      res.json({ success: true, message: `Source ${source_id} status updated to ${status}` });
    });
  });

  app.get('/api/sentinel/logs', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    const level = req.query.level;
    let query = "SELECT * FROM system_logs";
    let params = [];

    if (level && level !== 'ALL') {
      query += " WHERE level = ?";
      params.push(level);
    }
    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, logs: rows });
    });
  });

  app.get('/api/sentinel/satellites', (req, res) => {
    db.all("SELECT * FROM satellite_catalog", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, count: rows.length, satellites: rows });
    });
  });

  app.get('/api/sentinel/conjunctions', (req, res) => {
    db.all("SELECT * FROM conjunction_alerts ORDER BY timestamp DESC LIMIT 20", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, conjunctions: rows });
    });
  });

  // Dedicated Page Route for Sentinel Bot Dashboard
  app.get(['/sentinel', '/sentinel/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'sentinel.html'));
  });

  // Supervisor Background Worker Timers
  function startSupervisorDaemons() {
    console.log('[SENTINEL SUPERVISOR] Initializing background daemons...');

    // 1. Data Collection Worker
    setInterval(() => {
      db.get("SELECT state FROM worker_states WHERE worker_id = 'data_collection'", (err, row) => {
        if (row && row.state === 'running') {
          db.all("SELECT source_id FROM source_health WHERE status != 'unavailable'", (err, sources) => {
            if (sources) {
              sources.forEach(src => {
                const latency = Math.floor(Math.random() * 150) + 50;
                db.run("UPDATE source_health SET last_success = ?, latency_ms = ? WHERE source_id = ?",
                  [new Date().toISOString(), latency, src.source_id]);
              });
            }
          });
          db.run("UPDATE worker_states SET last_run = ?, success_count = success_count + 1 WHERE worker_id = 'data_collection'", [new Date().toISOString()]);
        }
      });
    }, 15000);

    // 2. Orbital Monitor & Conjunction Checker
    setInterval(() => {
      db.get("SELECT state FROM worker_states WHERE worker_id = 'orbital_monitor'", (err, row) => {
        if (row && row.state === 'running') {
          db.all("SELECT norad_id, lat, lng, alt_km FROM satellite_catalog", (err, sats) => {
            if (sats) {
              sats.forEach(sat => {
                const newLat = Math.max(-85, Math.min(85, sat.lat + (Math.random() * 2 - 1) * 0.5));
                const newLng = (sat.lng + 1.5) % 360 - 180;
                db.run("UPDATE satellite_catalog SET lat = ?, lng = ?, last_updated = ? WHERE norad_id = ?",
                  [newLat, newLng, new Date().toISOString(), sat.norad_id]);
              });
            }
          });

          if (Math.random() < 0.25) {
            const primary = 'ISS (ZARYA)';
            const secondary = `COSMOS DEBRIS #${Math.floor(Math.random() * 8999) + 1000}`;
            const miss = parseFloat((Math.random() * 2.5 + 0.1).toFixed(2));
            const prob = parseFloat((Math.random() * 0.0005).toFixed(6));
            db.run("INSERT INTO conjunction_alerts (primary_object, secondary_object, miss_distance_km, collision_probability, status) VALUES (?, ?, ?, ?, ?)",
              [primary, secondary, miss, prob, miss < 0.5 ? 'WARNING' : 'MONITORING']);
          }

          db.run("UPDATE worker_states SET last_run = ?, success_count = success_count + 1 WHERE worker_id = 'orbital_monitor'", [new Date().toISOString()]);
          broadcast({ type: 'ORBITAL_TICK', timestamp: new Date().toISOString() });
        }
      });
    }, 8000);

    // 3. Website Health & Diagnostics
    setInterval(() => {
      db.get("SELECT state FROM worker_states WHERE worker_id = 'website_health'", (err, row) => {
        if (row && row.state === 'running') {
          db.run("UPDATE worker_states SET last_run = ?, success_count = success_count + 1 WHERE worker_id = 'website_health'", [new Date().toISOString()]);
        }
      });
    }, 20000);

    // 4. Automatic Recovery & Circuit Breaker
    setInterval(() => {
      db.get("SELECT state FROM worker_states WHERE worker_id = 'auto_recovery'", (err, row) => {
        if (row && row.state === 'running') {
          db.run("UPDATE source_health SET status = 'healthy', consecutive_failures = 0 WHERE status = 'degraded' AND consecutive_failures <= 2");
          db.run("UPDATE worker_states SET last_run = ?, success_count = success_count + 1 WHERE worker_id = 'auto_recovery'", [new Date().toISOString()]);
        }
      });
    }, 45000);
  }

  // Telemetry endpoint inside function scope
  app.post('/api/sentinel/telemetry', (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : req.body;
        if (payload) await sentinel.processIncident(payload);
        res.status(204).end();
      } catch {
        res.status(400).end();
      }
    });
  });

  startSupervisorDaemons();
}