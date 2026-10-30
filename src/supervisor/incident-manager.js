/**
 * ORBITAL EYE — CENTRAL INCIDENT & ERROR SUPERVISOR
 * Deduplicates failure events, sanitizes sensitive tokens,
 * and maintains audit records of subsystem degradations.
 */
import { getDatabase } from '../db/sqlite.js';

const SENSITIVE_PATTERNS = [
  /password["':\s=]+([^"\s,&]+)/gi,
  /secret["':\s=]+([^"\s,&]+)/gi,
  /token["':\s=]+([^"\s,&]+)/gi,
  /key["':\s=]+([^"\s,&]+)/gi,
  /authorization["':\s=]+Bearer\s+([^"\s,&]+)/gi,
  /api[_-]?key["':\s=]+([^"\s,&]+)/gi
];

export function sanitizeErrorDetails(data) {
  if (!data) return '';
  let str = typeof data === 'object' ? JSON.stringify(data) : String(data);
  for (const pattern of SENSITIVE_PATTERNS) {
    str = str.replace(pattern, (match, val) => match.replace(val, '[REDACTED]'));
  }
  return str;
}

export class IncidentManager {
  constructor() {
    this.memoryIncidents = new Map();
  }

  /**
   * Records a subsystem incident. Deduplicates identical active incidents
   * for the same provider/worker by incrementing occurrenceCount.
   */
  recordIncident(providerId, workerId, severity = 'WARN', description = '', rawDetails = null) {
    const db = getDatabase();
    const cleanDesc = String(description).slice(0, 300);
    const sanitizedDetails = sanitizeErrorDetails(rawDetails);
    const dedupeKey = `${providerId || 'system'}_${workerId || 'global'}_${cleanDesc.slice(0, 50)}`;
    const now = new Date().toISOString();

    const existing = this.memoryIncidents.get(dedupeKey);
    if (existing && existing.status === 'active') {
      existing.occurrenceCount += 1;
      existing.lastSeen = now;
      existing.details = sanitizedDetails;

      if (db) {
        db.run(
          `UPDATE system_incidents 
           SET last_seen = ?, occurrence_count = ?, details = ?
           WHERE id = ?`,
          [now, existing.occurrenceCount, sanitizedDetails, existing.id],
          (err) => {
            if (err) {
              console.error(`[IncidentManager] Failed to update incident '${existing.id}' in SQLite:`, err.message);
            }
          }
        );
      }

      return existing;
    }

    const incidentId = 'inc_' + Math.random().toString(36).substring(2, 9);
    const newIncident = {
      id: incidentId,
      providerId: providerId || 'system',
      workerId: workerId || 'general',
      severity, // 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
      firstSeen: now,
      lastSeen: now,
      occurrenceCount: 1,
      description: cleanDesc,
      details: sanitizedDetails,
      status: 'active'
    };

    this.memoryIncidents.set(dedupeKey, newIncident);

    if (db) {
      db.run(
        `INSERT INTO system_incidents 
        (id, provider_id, worker_id, severity, first_seen, last_seen, occurrence_count, description, details, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newIncident.id,
          newIncident.providerId,
          newIncident.workerId,
          newIncident.severity,
          newIncident.firstSeen,
          newIncident.lastSeen,
          newIncident.occurrenceCount,
          newIncident.description,
          newIncident.details,
          newIncident.status
        ],
        (err) => {
          if (err) {
            console.error(`[IncidentManager] Failed to insert incident '${newIncident.id}' in SQLite:`, err.message);
          }
        }
      );
    }

    return newIncident;
  }

  /**
   * Resolves an incident when recovery is detected.
   */
  resolveIncident(incidentId) {
    const db = getDatabase();
    for (const [key, inc] of this.memoryIncidents.entries()) {
      if (inc.id === incidentId || inc.providerId === incidentId || inc.workerId === incidentId) {
        inc.status = 'resolved';
      }
    }

    if (db) {
      db.run(
        `UPDATE system_incidents SET status = 'resolved' WHERE id = ? OR provider_id = ? OR worker_id = ?`,
        [incidentId, incidentId, incidentId],
        (err) => {
          if (err) {
            console.error(`[IncidentManager] Failed to resolve incident '${incidentId}' in SQLite:`, err.message);
          }
        }
      );
    }
  }

  getActiveIncidents() {
    return Array.from(this.memoryIncidents.values()).filter(i => i.status === 'active');
  }

  getAllIncidents(limit = 50) {
    return Array.from(this.memoryIncidents.values()).slice(-limit);
  }
}

export const incidentManager = new IncidentManager();
