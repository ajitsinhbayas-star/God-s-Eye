export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type CrawlerType = 'RSS' | 'HTML' | 'REST_API';
export type IntelCategory =
  | 'ORBITAL_EPHEMERIS'
  | 'SPACE_SAFETY'
  | 'DEEP_SPACE'
  | 'RF_GROUND_TELEMETRY'
  | 'SPACE_WEATHER'
  | 'OPERATION';

export type RecordStatus = 'ACTIVE' | 'PURGED';
export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';
export type AuditEventType =
  | 'INTEL_INJECTED'
  | 'INTEL_UPDATED'
  | 'INTEL_PURGED'
  | 'INTEL_HEARTBEAT'
  | 'CIRCUIT_TRIPPED';

export interface IntelSource {
  sourceId: string;
  name: string;
  targetUrl: string;
  crawlerType: CrawlerType;
  category: IntelCategory;
  pollIntervalSec: number;
  rateLimitMs: number;
  circuitState: CircuitState;
  consecutiveFailures: number;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastErrorMessage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RawScrapedItem {
  canonicalUrl: string;
  title: string;
  body: string;
  category?: IntelCategory;
  author?: string;
  tags?: string[];
  mediaUrls?: string[];
}

export interface IntelRecord {
  id: string; // SHA-256 of canonicalUrl
  sourceId?: string;
  sourceUrl: string;
  title: string;
  body: string;
  category: IntelCategory;
  contentHash: string; // SHA-256 of (title + '::' + body)
  status: RecordStatus;
  author?: string;
  tags?: string[];
  mediaUrls?: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
  purgedAt?: string | null;
}

export interface DiffReport {
  added: IntelRecord[];
  updated: IntelRecord[];
  deleted: IntelRecord[];
  durationMs?: number;
}

export interface IntelAuditEvent {
  eventId: string;
  eventType: AuditEventType;
  recordId?: string;
  sourceId?: string;
  severity: AuditSeverity;
  message: string;
  contentHash?: string;
  payloadJson?: string;
  createdAt: string;
}

export interface WebSocketPacket {
  type: AuditEventType;
  timestamp: string;
  message: string;
  record?: Partial<IntelRecord>;
}
