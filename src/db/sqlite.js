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

    db.run(`CREATE TABLE IF NOT EXISTS system_incidents (
      id TEXT PRIMARY KEY,
      provider_id TEXT,
      worker_id TEXT,
      severity TEXT,
      first_seen DATETIME,
      last_seen DATETIME,
      occurrence_count INTEGER DEFAULT 1,
      description TEXT,
      details TEXT,
      status TEXT DEFAULT 'active'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dataset_snapshots (
      dataset_key TEXT PRIMARY KEY,
      payload TEXT,
      version INTEGER DEFAULT 1,
      updated_at DATETIME
    )`);

    // Sync provider definitions without fabricating test counts
    providerRegistry.getAllProviders().forEach((p) => {
      db.run(
        `INSERT OR IGNORE INTO source_health 
        (source_id, name, status, data_class, last_success, last_error, latency_ms, attribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.status, p.category, null, null, 0, p.attribution]
      );
    });
  });
}
