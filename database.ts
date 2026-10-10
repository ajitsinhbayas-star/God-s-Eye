import { IntelRecord, IntelSource, DiffReport, IntelAuditEvent } from './types';

export interface IDatabaseDriver {
  getActiveRecords(sourceId?: string): Promise<Map<string, IntelRecord>>;
  insertRecord(record: IntelRecord): Promise<void>;
  updateRecord(record: IntelRecord): Promise<void>;
  touchRecord(id: string, timestamp: string): Promise<void>;
  markPurged(id: string, timestamp: string): Promise<void>;
  insertDiffReport(sourceId: string, report: DiffReport, durationMs: number): Promise<void>;
  insertAuditEvent(event: IntelAuditEvent): Promise<void>;
  getSources(): Promise<IntelSource[]>;
  updateSourceCircuit(sourceId: string, state: string, failures: number, errorMsg?: string | null): Promise<void>;
}

/**
 * Fully functional In-Memory Database matching schema.sql constraints.
 * Can be swapped with pg.Pool or better-sqlite3 instance.
 */
export class InMemoryDatabase implements IDatabaseDriver {
  private records = new Map<string, IntelRecord>();
  private sources = new Map<string, IntelSource>();
  private diffReports: any[] = [];
  private auditEvents: IntelAuditEvent[] = [];

  constructor() {
    this.seedDefaultSources();
  }

  private seedDefaultSources() {
    const defaultSources: IntelSource[] = [
      {
        sourceId: 'celestrak-bulletins',
        name: 'CelesTrak Orbital Status Updates',
        targetUrl: 'https://celestrak.org/columns/rss.xml',
        crawlerType: 'RSS',
        category: 'ORBITAL_EPHEMERIS',
        pollIntervalSec: 900,
        rateLimitMs: 500,
        circuitState: 'CLOSED',
        consecutiveFailures: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        sourceId: 'nasa-orbital-science',
        name: 'NASA Space Science & Orbital Intel',
        targetUrl: 'https://www.nasa.gov/news-release/feed/',
        crawlerType: 'RSS',
        category: 'DEEP_SPACE',
        pollIntervalSec: 600,
        rateLimitMs: 500,
        circuitState: 'CLOSED',
        consecutiveFailures: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const src of defaultSources) {
      this.sources.set(src.sourceId, src);
    }
  }

  async getActiveRecords(sourceId?: string): Promise<Map<string, IntelRecord>> {
    const active = new Map<string, IntelRecord>();
    for (const [id, rec] of this.records.entries()) {
      if (rec.status === 'ACTIVE') {
        if (!sourceId || rec.sourceId === sourceId) {
          active.set(id, { ...rec });
        }
      }
    }
    return active;
  }

  async insertRecord(record: IntelRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async updateRecord(record: IntelRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async touchRecord(id: string, timestamp: string): Promise<void> {
    const rec = this.records.get(id);
    if (rec) {
      rec.lastSeenAt = timestamp;
      rec.updatedAt = timestamp;
    }
  }

  async markPurged(id: string, timestamp: string): Promise<void> {
    const rec = this.records.get(id);
    if (rec) {
      rec.status = 'PURGED';
      rec.purgedAt = timestamp;
      rec.updatedAt = timestamp;
    }
  }

  async insertDiffReport(sourceId: string, report: DiffReport, durationMs: number): Promise<void> {
    this.diffReports.push({
      reportId: Math.random().toString(36).substring(2, 10),
      sourceId,
      itemsAdded: report.added.length,
      itemsUpdated: report.updated.length,
      itemsPurged: report.deleted.length,
      durationMs,
      executedAt: new Date().toISOString()
    });
  }

  async insertAuditEvent(event: IntelAuditEvent): Promise<void> {
    this.auditEvents.unshift(event);
    if (this.auditEvents.length > 500) this.auditEvents.pop();
  }

  async getSources(): Promise<IntelSource[]> {
    return Array.from(this.sources.values()).filter((s) => s.isActive);
  }

  async updateSourceCircuit(sourceId: string, state: string, failures: number, errorMsg?: string | null): Promise<void> {
    const src = this.sources.get(sourceId);
    if (src) {
      src.circuitState = state as any;
      src.consecutiveFailures = failures;
      src.lastErrorMessage = errorMsg;
      src.updatedAt = new Date().toISOString();
      if (failures === 0) src.lastSuccessAt = src.updatedAt;
      else src.lastFailureAt = src.updatedAt;
    }
  }
}

export const db: IDatabaseDriver = new InMemoryDatabase();
