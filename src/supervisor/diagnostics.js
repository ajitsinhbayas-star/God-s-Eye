import fs from 'fs';
import path from 'path';
import { DIAGNOSTICS_FILE, DATA_DIR } from '../config/constants.js';

const SENSITIVE_PATTERNS = [
  /password["':\s=]+([^"\s,&]+)/gi,
  /secret["':\s=]+([^"\s,&]+)/gi,
  /token["':\s=]+([^"\s,&]+)/gi,
  /key["':\s=]+([^"\s,&]+)/gi,
  /authorization["':\s=]+Bearer\s+([^"\s,&]+)/gi
];

function sanitizeDetails(data) {
  if (!data) return data;
  let str = typeof data === 'object' ? JSON.stringify(data) : String(data);
  for (const pattern of SENSITIVE_PATTERNS) {
    str = str.replace(pattern, (match, val) => {
      return match.replace(val, '[REDACTED]');
    });
  }
  try {
    return JSON.parse(str);
  } catch (_) {
    return str;
  }
}

export class SentinelDiagnosticsManager {
  constructor() {
    this.incidents = [];
    this.operationalMetrics = {
      startTime: Date.now(),
      requestsTotal: 0,
      requestsFailed: 0,
      workerRuns: 0,
      workerFailures: 0,
      wsConnections: 0,
      lastIngestionTime: null
    };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DIAGNOSTICS_FILE)) {
        this.incidents = JSON.parse(fs.readFileSync(DIAGNOSTICS_FILE, 'utf-8'));
      }
    } catch {
      this.incidents = [];
    }
  }

  logEvent(category, level, message, details = null) {
    const entry = {
      id: 'diag_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      category, // 'STARTUP' | 'SHUTDOWN' | 'PROVIDER' | 'WORKER' | 'DATABASE' | 'WEBSOCKET' | 'SECURITY'
      level,    // 'INFO' | 'WARN' | 'ERROR'
      message,
      details: sanitizeDetails(details)
    };

    this.incidents.unshift(entry);
    if (this.incidents.length > 300) {
      this.incidents.pop();
    }

    // Persist asynchronously
    this.persistAsync();
    return entry;
  }

  recordWorkerRun(workerName, durationMs, success = true, recordCount = 0) {
    this.operationalMetrics.workerRuns++;
    if (!success) this.operationalMetrics.workerFailures++;
    this.operationalMetrics.lastIngestionTime = new Date().toISOString();

    this.logEvent('WORKER', success ? 'INFO' : 'WARN', `Worker ${workerName} cycle finished (${durationMs}ms)`, {
      durationMs,
      success,
      recordCount
    });
  }

  recordProviderCall(providerId, status, latencyMs, details = null) {
    this.operationalMetrics.requestsTotal++;
    if (status !== 'ACTIVE' && status !== 'OK') {
      this.operationalMetrics.requestsFailed++;
    }
    this.logEvent('PROVIDER', status === 'ACTIVE' || status === 'OK' ? 'INFO' : 'WARN', `Provider ${providerId} accessed: ${status}`, {
      latencyMs,
      details
    });
  }

  recordWsConnection(action) {
    if (action === 'CONNECT') this.operationalMetrics.wsConnections++;
    if (action === 'DISCONNECT') this.operationalMetrics.wsConnections = Math.max(0, this.operationalMetrics.wsConnections - 1);
    this.logEvent('WEBSOCKET', 'INFO', `WebSocket client ${action.toLowerCase()}ed`, {
      activeClients: this.operationalMetrics.wsConnections
    });
  }

  async persistAsync() {
    try {
      await fs.promises.writeFile(DIAGNOSTICS_FILE, JSON.stringify(this.incidents.slice(0, 150), null, 2), 'utf-8');
    } catch (_) {}
  }

  getAdminReport() {
    const uptimeSec = Math.round((Date.now() - this.operationalMetrics.startTime) / 1000);
    return {
      metrics: {
        uptimeSeconds: uptimeSec,
        uptimeHuman: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
        requestsTotal: this.operationalMetrics.requestsTotal,
        requestsFailed: this.operationalMetrics.requestsFailed,
        workerRuns: this.operationalMetrics.workerRuns,
        workerFailures: this.operationalMetrics.workerFailures,
        activeWsClients: this.operationalMetrics.wsConnections,
        lastIngestionTime: this.operationalMetrics.lastIngestionTime
      },
      recentEvents: this.incidents.slice(0, 50)
    };
  }

  async processIncident(incident) {
    if (!incident) return;
    this.logEvent(incident.category || 'INCIDENT', incident.level || 'WARN', incident.message || 'Diagnostic alert', incident.details || incident);
  }
}

export const sentinelDiagnostics = new SentinelDiagnosticsManager();
