import fs from 'fs';
import path from 'path';
import sqlite3Pkg from 'sqlite3';
import { SQLITE_DB_FILE, DATA_DIR } from '../config/constants.js';
import { providerRegistry } from '../supervisor/registry.js';

const sqlite3 = sqlite3Pkg.verbose();
let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  dbInstance = new sqlite3.Database(SQLITE_DB_FILE, (err) => {
    if (err) {
      console.error('[Sentinel DB] Connection error:', err.message);
    } else {
      console.log('[Sentinel DB] Connected to SQLite database:', path.basename(SQLITE_DB_FILE));
      initSchema(dbInstance);
    }
  });

  return dbInstance;
}

function initSchema(db) {
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
      data_class TEXT,
      last_success DATETIME,
      last_error TEXT,
      error_count INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      attribution TEXT
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

    db.run(`CREATE TABLE IF NOT EXISTS normalized_objects (
      id TEXT PRIMARY KEY,
      name TEXT,
      norad_id TEXT,
      intl_desig TEXT,
      data_class TEXT,
      source_provider TEXT,
      source_record_id TEXT,
      agency TEXT,
      lat REAL,
      lng REAL,
      alt_km REAL,
      velocity_kms REAL,
      reference_frame TEXT,
      quality_status TEXT,
      epoch DATETIME,
      updated_at DATETIME
    )`);

    providerRegistry.getAllProviders().forEach((p) => {
      db.run(
        `INSERT OR REPLACE INTO source_health 
        (source_id, name, status, data_class, last_success, last_error, latency_ms, attribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.status, p.category, new Date().toISOString(), null, 120, p.attribution]
      );
    });

    const initialWorkers = [
      ['worker_tle_sync', 'CelesTrak OMM/GP Ingestion Worker', 'running', new Date().toISOString(), new Date(Date.now() + 10000).toISOString(), 310, 142, 0],
      ['worker_live_iss', 'Real-Time ISS Downlink Worker', 'running', new Date().toISOString(), new Date(Date.now() + 3000).toISOString(), 85, 310, 0],
      ['worker_horizons', 'NASA/JPL Horizons Ephemeris Daemon', 'running', new Date().toISOString(), new Date(Date.now() + 15000).toISOString(), 420, 89, 0],
      ['worker_space_weather', 'NOAA SWPC Geomagnetic Monitor', 'running', new Date().toISOString(), new Date(Date.now() + 20000).toISOString(), 140, 240, 0],
      ['worker_conjunction', 'LEO Proximity Screening Daemon', 'running', new Date().toISOString(), new Date(Date.now() + 8000).toISOString(), 95, 620, 0]
    ];

    initialWorkers.forEach((w) => {
      db.run(
        `INSERT OR REPLACE INTO worker_states (worker_id, name, state, last_run, next_run, duration_ms, success_count, failure_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        w
      );
    });
  });
}
