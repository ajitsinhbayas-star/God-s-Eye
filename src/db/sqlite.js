import fs from 'fs';
import path from 'path';
import sqlite3Pkg from 'sqlite3';
import { SQLITE_DB_FILE, DATA_DIR } from '../config/constants.js';
import { providerRegistry } from '../supervisor/registry.js';

const sqlite3 = sqlite3Pkg.verbose();

let dbInstance = null;
let initPromise = null;
let isReady = false;

const REQUIRED_TABLES = [
  'system_logs',
  'source_health',
  'worker_states',
  'normalized_objects',
  'system_incidents',
  'dataset_snapshots'
];

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT,
  service TEXT,
  message TEXT,
  details TEXT
);

CREATE TABLE IF NOT EXISTS source_health (
  source_id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  data_class TEXT,
  last_success DATETIME,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  attribution TEXT
);

CREATE TABLE IF NOT EXISTS worker_states (
  worker_id TEXT PRIMARY KEY,
  name TEXT,
  state TEXT,
  last_run DATETIME,
  next_run DATETIME,
  duration_ms INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS normalized_objects (
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
);

CREATE TABLE IF NOT EXISTS system_incidents (
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
);

CREATE TABLE IF NOT EXISTS dataset_snapshots (
  dataset_key TEXT PRIMARY KEY,
  payload TEXT,
  version INTEGER DEFAULT 1,
  updated_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON system_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_provider ON system_incidents(provider_id);
CREATE INDEX IF NOT EXISTS idx_incidents_worker ON system_incidents(worker_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_norm_objects_class ON normalized_objects(data_class);
`;

/**
 * Returns true if SQLite is open and schema migrations have verified.
 */
export function isDatabaseReady() {
  return isReady;
}

/**
 * Synchronous accessor for existing database connection.
 * If accessed before initDatabase() completes, lazily opens the database
 * and triggers schema initialization in the background with a warning.
 */
export function getDatabase() {
  if (dbInstance) return dbInstance;

  const targetDir = path.dirname(SQLITE_DB_FILE);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  dbInstance = new sqlite3.Database(SQLITE_DB_FILE, (err) => {
    if (err) {
      console.error('[Sentinel DB] Lazy connection error:', err.message);
    } else {
      initDatabase().catch((initErr) => {
        console.error('[Sentinel DB] Lazy initialization error:', initErr.message);
      });
    }
  });

  return dbInstance;
}

/**
 * Initializes SQLite database connection, applies complete schema and migrations,
 * and verifies all required tables exist before resolving.
 * Returns a shared Promise so concurrent callers await the same operation.
 *
 * @param {string|null} customDbFile Optional custom file path for isolated tests
 * @returns {Promise<sqlite3.Database>} Resolves with ready Database instance
 */
export function initDatabase(customDbFile = null) {
  if (isReady && dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (initPromise) {
    return initPromise;
  }

  const dbPath = customDbFile || SQLITE_DB_FILE;
  const targetDir = path.dirname(dbPath);

  initPromise = new Promise((resolve, reject) => {
    try {
      if (dbPath !== ':memory:' && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch (dirErr) {
      initPromise = null;
      return reject(new Error(`Failed to create database directory '${targetDir}': ${dirErr.message}`));
    }

    const db = new sqlite3.Database(dbPath, (connErr) => {
      if (connErr) {
        initPromise = null;
        console.error('[Sentinel DB] Connection failure:', connErr.message);
        return reject(new Error(`SQLite connection failed for '${dbPath}': ${connErr.message}`));
      }

      console.log('[Sentinel DB] Connected to SQLite database:', path.basename(dbPath));

      // Execute schema batch atomically and verify
      db.exec(SCHEMA_SQL, (execErr) => {
        if (execErr) {
          initPromise = null;
          console.error('[Sentinel DB] Schema creation failure:', execErr.message);
          return reject(new Error(`SQLite schema execution failed: ${execErr.message}`));
        }

        // Verify all required tables exist
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (tableErr, rows) => {
          if (tableErr) {
            initPromise = null;
            return reject(new Error(`Failed to verify tables: ${tableErr.message}`));
          }

          const existingTables = new Set((rows || []).map(r => r.name));
          const missing = REQUIRED_TABLES.filter(t => !existingTables.has(t));

          if (missing.length > 0) {
            initPromise = null;
            const msg = `Database verification failed: missing tables [${missing.join(', ')}]`;
            console.error('[Sentinel DB] ' + msg);
            return reject(new Error(msg));
          }

          // Populate initial provider source health definitions safely
          try {
            const providers = providerRegistry.getAllProviders();
            const stmt = db.prepare(
              `INSERT OR IGNORE INTO source_health 
              (source_id, name, status, data_class, last_success, last_error, latency_ms, attribution)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            );

            for (const p of providers) {
              stmt.run([p.id, p.name, p.status, p.category, null, null, 0, p.attribution], (runErr) => {
                if (runErr) {
                  console.warn(`[Sentinel DB] Seed warning for provider '${p.id}':`, runErr.message);
                }
              });
            }

            stmt.finalize((finalizeErr) => {
              if (finalizeErr) {
                console.warn('[Sentinel DB] Statement finalization warning:', finalizeErr.message);
              }
              dbInstance = db;
              isReady = true;
              console.log(`[Sentinel DB] SQLite schema verified & ready (${REQUIRED_TABLES.length} tables active).`);
              resolve(db);
            });
          } catch (seedErr) {
            console.warn('[Sentinel DB] Non-fatal seed error:', seedErr.message);
            dbInstance = db;
            isReady = true;
            resolve(db);
          }
        });
      });
    });
  });

  return initPromise;
}

/**
 * Closes the active database connection and resets initialization state.
 * Useful for tearing down between isolated test runs.
 */
export function closeDatabase() {
  return new Promise((resolve) => {
    if (dbInstance) {
      dbInstance.close((err) => {
        if (err) console.warn('[Sentinel DB] Close notice:', err.message);
        dbInstance = null;
        initPromise = null;
        isReady = false;
        resolve();
      });
    } else {
      initPromise = null;
      isReady = false;
      resolve();
    }
  });
}
