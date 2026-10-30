/**
 * ORBITAL EYE — SQLITE INITIALIZATION RACE & CRASH REGRESSION TEST SUITE
 * Validates asynchronous schema initialization, startup ordering, error handling,
 * and confirms zero unhandled Statement errors across fresh and existing databases.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase, isDatabaseReady, getDatabase } from '../src/db/sqlite.js';
import { incidentManager } from '../src/supervisor/incident-manager.js';
import { workerManager } from '../src/supervisor/worker-manager.js';

const TEST_DIR = path.resolve(process.cwd(), 'data/test-scratch');

async function cleanup() {
  await closeDatabase();
  if (fs.existsSync(TEST_DIR)) {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (_) {}
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('ORBITAL EYE — SQLITE DATABASE INITIALIZATION & RACE SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    passed++;
    console.log(`[PASS] ${testName}`);
  }

  function recordFail(testName, err) {
    failed++;
    console.error(`[FAIL] ${testName}: ${err.message}`);
  }

  try {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // -------------------------------------------------------------
    // Test 1: Starting with a completely fresh SQLite database
    // -------------------------------------------------------------
    const freshDbPath = path.join(TEST_DIR, `fresh-${Date.now()}.db`);
    await closeDatabase();
    assert.strictEqual(isDatabaseReady(), false, 'Database must not be ready before initialization');

    const db1 = await initDatabase(freshDbPath);
    assert.ok(db1, 'initDatabase must resolve with active db instance');
    assert.strictEqual(isDatabaseReady(), true, 'isDatabaseReady() must be true after init');
    recordPass('Starting with a completely fresh SQLite database');

    // -------------------------------------------------------------
    // Test 2: Confirming system_incidents and all required tables exist
    // -------------------------------------------------------------
    const requiredTables = [
      'system_logs',
      'source_health',
      'worker_states',
      'normalized_objects',
      'system_incidents',
      'dataset_snapshots'
    ];

    const tables = await new Promise((resolve, reject) => {
      db1.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(r => r.name));
      });
    });

    for (const t of requiredTables) {
      assert.ok(tables.includes(t), `Table '${t}' must exist in SQLite schema`);
    }
    assert.ok(tables.includes('system_incidents'), 'system_incidents table must exist');
    recordPass("Confirming 'system_incidents' and all 6 required tables exist");

    // -------------------------------------------------------------
    // Test 3: Multiple concurrent initialization calls safely share one Promise
    // -------------------------------------------------------------
    const concurrentP = [
      initDatabase(freshDbPath),
      initDatabase(freshDbPath),
      initDatabase(freshDbPath),
      initDatabase(freshDbPath)
    ];
    const results = await Promise.all(concurrentP);
    results.forEach(res => {
      assert.strictEqual(res, db1, 'All concurrent initDatabase calls must resolve to the identical instance');
    });
    recordPass('Running multiple concurrent initialization calls safely');

    // -------------------------------------------------------------
    // Test 4: Preserving existing database records across restarts
    // -------------------------------------------------------------
    // Insert a known record into system_incidents
    const testIncidentId = 'inc_test_preservation_99';
    await new Promise((resolve, reject) => {
      db1.run(
        `INSERT INTO system_incidents (id, provider_id, worker_id, severity, description, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testIncidentId, 'nasa_firms', 'weather_worker', 'WARN', 'Test incident preservation', 'active'],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Close and simulate server restart with existing database
    await closeDatabase();
    assert.strictEqual(isDatabaseReady(), false);

    const db2 = await initDatabase(freshDbPath);
    const preservedRow = await new Promise((resolve, reject) => {
      db2.get("SELECT * FROM system_incidents WHERE id = ?", [testIncidentId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    assert.ok(preservedRow, 'Existing record must be preserved across database restarts');
    assert.strictEqual(preservedRow.description, 'Test incident preservation');
    recordPass('Starting with an existing database containing records (data preservation)');

    // -------------------------------------------------------------
    // Test 5: Simulating database initialization failure (invalid directory)
    // -------------------------------------------------------------
    await closeDatabase();
    // Use an illegal file path (e.g., path with invalid null byte or system reserved file)
    let failedCleanly = false;
    try {
      // In Windows, a path containing an illegal character like ? or invalid directory
      await initDatabase('Z:\\invalid_unmounted_drive\\nested_dir\\cannot_exist.db');
    } catch (err) {
      failedCleanly = true;
      assert.ok(err.message, 'Error message must be descriptive');
    }
    assert.strictEqual(failedCleanly, true, 'initDatabase must reject with useful error on failure');
    recordPass('Simulating database initialization failure rejects cleanly');

    // -------------------------------------------------------------
    // Test 6: Confirming workers and incident manager write without Statement errors
    // -------------------------------------------------------------
    await closeDatabase();
    const db3 = await initDatabase(freshDbPath);

    // Test incidentManager.recordIncident & resolveIncident
    const inc = incidentManager.recordIncident('celestrak', 'tle_worker', 'ERROR', 'Test TLE sync timeout', { latency: 5000 });
    assert.ok(inc && inc.id, 'Incident record must be returned');

    incidentManager.resolveIncident(inc.id);

    // Test workerManager.persistWorkerState
    const dummyWorker = {
      id: 'test_worker_1',
      name: 'Test Orbital Worker',
      state: 'idle',
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 60000).toISOString(),
      durationMs: 42,
      successCount: 1,
      failureCount: 0
    };
    workerManager.persistWorkerState(dummyWorker);

    // Allow statements to settle and verify they exist in SQLite
    await new Promise(r => setTimeout(r, 200));

    const incRow = await new Promise((resolve, reject) => {
      db3.get("SELECT * FROM system_incidents WHERE id = ?", [inc.id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    assert.ok(incRow, 'Recorded incident must be persisted in SQLite');
    assert.strictEqual(incRow.status, 'resolved', 'Incident status must be resolved');

    const workerRow = await new Promise((resolve, reject) => {
      db3.get("SELECT * FROM worker_states WHERE worker_id = ?", [dummyWorker.id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    assert.ok(workerRow, 'Worker state must be persisted in SQLite');
    assert.strictEqual(workerRow.duration_ms, 42);
    recordPass('Confirming zero unhandled SQLite Statement errors on incident and worker writes');

  } catch (err) {
    recordFail('Regression Test Suite Exception', err);
  } finally {
    await cleanup();
  }

  console.log('\n===============================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
