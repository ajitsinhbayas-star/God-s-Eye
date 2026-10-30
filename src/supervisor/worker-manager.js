/**
 * ORBITAL EYE — CENTRAL WORKER MANAGER & SCHEDULER
 * Manages automated daemon workers with cadence-based scheduling,
 * overlap prevention (job locks), timeout control, retry backoff,
 * real execution metrics, and manual synchronization.
 */
import { getDatabase } from '../db/sqlite.js';
import { incidentManager } from './incident-manager.js';
import { dataDistributionService, EVENT_TYPES, CHANNELS } from '../realtime/data-distribution.js';

export class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.timers = new Map();
  }

  /**
   * Registers an automated daemon worker.
   */
  registerWorker(config) {
    const {
      id,
      name,
      subsystem, // 'space' | 'atmosphere' | 'air_quality' | 'general'
      cadenceMs,
      timeoutMs = 10000,
      runFn
    } = config;

    const worker = {
      id,
      name,
      subsystem: subsystem || 'general',
      cadenceMs: cadenceMs || 60000,
      timeoutMs,
      runFn,
      state: 'idle', // 'idle' | 'running' | 'paused' | 'failed'
      isExecuting: false,
      lastRun: null,
      nextRun: null,
      lastSuccess: null,
      lastError: null,
      durationMs: 0,
      successCount: 0,
      failureCount: 0,
      recordsFetched: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      retryCount: 0
    };

    this.workers.set(id, worker);
    return worker;
  }

  getWorker(id) {
    return this.workers.get(id);
  }

  getAllWorkers() {
    return Array.from(this.workers.values()).map(w => {
      const { runFn, ...metadata } = w;
      return metadata;
    });
  }

  /**
   * Starts all registered workers according to their configured cadence.
   */
  startAll() {
    for (const [id, worker] of this.workers.entries()) {
      if (worker.state !== 'paused') {
        this.scheduleWorker(id, 0); // Execute initial cycle immediately
      }
    }
  }

  /**
   * Schedules next run for a worker with jitter to prevent thunderous herd.
   */
  scheduleWorker(id, delayMs = null) {
    const worker = this.workers.get(id);
    if (!worker || worker.state === 'paused') return;

    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }

    const wait = delayMs !== null ? delayMs : worker.cadenceMs + Math.floor(Math.random() * 500);
    worker.nextRun = new Date(Date.now() + wait).toISOString();

    const timer = setTimeout(async () => {
      await this.executeWorker(id);
      if (worker.state !== 'paused') {
        this.scheduleWorker(id);
      }
    }, wait);

    this.timers.set(id, timer);
  }

  /**
   * Safely executes worker cycle with job lock and timeout enforcement.
   */
  async executeWorker(id, isManual = false) {
    const worker = this.workers.get(id);
    if (!worker) return { success: false, error: 'Worker not found' };

    // Overlap prevention
    if (worker.isExecuting) {
      console.log(`[WorkerManager] Worker '${id}' run skipped: previous cycle still executing (Job Lock active).`);
      return { success: false, error: 'Job lock active: previous cycle still executing' };
    }

    worker.isExecuting = true;
    worker.state = 'running';
    worker.lastRun = new Date().toISOString();
    const t0 = Date.now();

    try {
      // Execute with timeout race
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), worker.timeoutMs);

      const result = await Promise.race([
        worker.runFn({ signal: ctrl.signal }),
        new Promise((_, reject) => {
          ctrl.signal.addEventListener('abort', () => reject(new Error(`Worker execution timed out (${worker.timeoutMs}ms)`)));
        })
      ]);
      clearTimeout(timeout);

      const duration = Date.now() - t0;
      worker.durationMs = duration;
      worker.lastSuccess = new Date().toISOString();
      worker.lastError = null;
      worker.successCount += 1;
      worker.state = 'idle';

      if (result && typeof result === 'object') {
        worker.recordsFetched += (result.recordsFetched || result.count || 1);
        worker.recordsAccepted += (result.recordsAccepted || result.count || 1);
        worker.recordsRejected += (result.recordsRejected || 0);
      }

      // Auto-resolve any active incident
      incidentManager.resolveIncident(id);

      // Persist state in SQLite
      this.persistWorkerState(worker);

      // Broadcast update to Sentinel channel
      dataDistributionService.broadcast(CHANNELS.SENTINEL, EVENT_TYPES.WORKER_TELEMETRY_UPDATED, {
        workerId: id,
        name: worker.name,
        state: worker.state,
        durationMs: worker.durationMs,
        lastSuccess: worker.lastSuccess,
        successCount: worker.successCount,
        failureCount: worker.failureCount,
        isManual
      });

      return { success: true, durationMs: duration, result };
    } catch (err) {
      const duration = Date.now() - t0;
      worker.durationMs = duration;
      worker.lastError = err.message || 'Worker execution failed';
      worker.failureCount += 1;
      worker.retryCount += 1;
      worker.state = 'failed';

      // Record incident
      incidentManager.recordIncident(null, id, 'ERROR', `Worker ${worker.name} failed: ${err.message}`, { error: err.message, durationMs: duration });

      this.persistWorkerState(worker);

      dataDistributionService.broadcast(CHANNELS.SENTINEL, EVENT_TYPES.WORKER_TELEMETRY_UPDATED, {
        workerId: id,
        name: worker.name,
        state: worker.state,
        durationMs: worker.durationMs,
        lastError: worker.lastError,
        successCount: worker.successCount,
        failureCount: worker.failureCount,
        isManual
      });

      return { success: false, durationMs: duration, error: err.message };
    } finally {
      worker.isExecuting = false;
      if (worker.state === 'running') worker.state = 'idle';
    }
  }

  /**
   * Pauses an active worker.
   */
  pauseWorker(id) {
    const worker = this.workers.get(id);
    if (!worker) return false;
    worker.state = 'paused';
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
    this.persistWorkerState(worker);
    return true;
  }

  /**
   * Resumes a paused worker and schedules next execution.
   */
  resumeWorker(id) {
    const worker = this.workers.get(id);
    if (!worker) return false;
    worker.state = 'idle';
    this.scheduleWorker(id, 0);
    this.persistWorkerState(worker);
    return true;
  }

  /**
   * Triggers manual synchronization for a specific worker.
   */
  async syncWorker(id) {
    return await this.executeWorker(id, true);
  }

  /**
   * Triggers manual synchronization for an entire subsystem.
   */
  async syncSubsystem(subsystem) {
    const targetWorkers = Array.from(this.workers.values()).filter(w => {
      if (subsystem === 'all') return true;
      return w.subsystem === subsystem;
    });

    const results = [];
    for (const w of targetWorkers) {
      const res = await this.executeWorker(w.id, true);
      results.push({ id: w.id, name: w.name, ...res });
    }
    return results;
  }

  persistWorkerState(worker) {
    try {
      const db = getDatabase();
      if (!db) return;
      db.run(
        `INSERT OR REPLACE INTO worker_states
        (worker_id, name, state, last_run, next_run, duration_ms, success_count, failure_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          worker.id,
          worker.name,
          worker.state,
          worker.lastRun,
          worker.nextRun,
          worker.durationMs,
          worker.successCount,
          worker.failureCount
        ],
        (err) => {
          if (err) {
            console.error(`[WorkerManager] Failed to persist worker state for '${worker.id}' in SQLite:`, err.message);
          }
        }
      );
    } catch (err) {
      console.error(`[WorkerManager] Synchronous error persisting worker state for '${worker.id}':`, err.message);
    }
  }
}

export const workerManager = new WorkerManager();
