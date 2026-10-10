import { IDatabaseDriver } from './database';
import { IntelRecord, RawScrapedItem, DiffReport } from './types';
import { computeHash, cleanText, cleanHtmlBody } from './utils';

export class DifferentialSyncEngine {
  constructor(private db: IDatabaseDriver) {}

  /**
   * Reconciles current scraped items against active database state.
   */
  async reconcile(sourceId: string, scrapedItems: RawScrapedItem[]): Promise<DiffReport> {
    const startTime = Date.now();
    const activeMap = await this.db.getActiveRecords(sourceId);
    const scrapedIdSet = new Set<string>();
    const now = new Date().toISOString();

    const report: DiffReport = {
      added: [],
      updated: [],
      deleted: []
    };

    // 1. Check for Additions and Mutations
    for (const raw of scrapedItems) {
      if (!raw.canonicalUrl || !raw.title) continue;

      const sanitizedTitle = cleanText(raw.title);
      const sanitizedBody = cleanHtmlBody(raw.body || '');
      const recordId = computeHash(raw.canonicalUrl);
      const contentHash = computeHash(`${sanitizedTitle}::${sanitizedBody}`);

      scrapedIdSet.add(recordId);
      const existing = activeMap.get(recordId);

      if (!existing) {
        const newRecord: IntelRecord = {
          id: recordId,
          sourceId,
          sourceUrl: raw.canonicalUrl,
          title: sanitizedTitle,
          body: sanitizedBody,
          category: raw.category || 'OPERATION',
          contentHash,
          status: 'ACTIVE',
          author: raw.author,
          tags: raw.tags,
          mediaUrls: raw.mediaUrls,
          firstSeenAt: now,
          lastSeenAt: now,
          updatedAt: now
        };

        await this.db.insertRecord(newRecord);
        report.added.push(newRecord);
      } else if (existing.contentHash !== contentHash) {
        const updatedRecord: IntelRecord = {
          ...existing,
          title: sanitizedTitle,
          body: sanitizedBody,
          contentHash,
          lastSeenAt: now,
          updatedAt: now
        };

        await this.db.updateRecord(updatedRecord);
        report.updated.push(updatedRecord);
      } else {
        await this.db.touchRecord(recordId, now);
      }
    }

    // 2. Identify Disappeared / Purged Records
    for (const [id, record] of activeMap.entries()) {
      if (!scrapedIdSet.has(id)) {
        await this.db.markPurged(id, now);
        report.deleted.push({
          ...record,
          status: 'PURGED',
          purgedAt: now,
          updatedAt: now
        });
      }
    }

    const duration = Date.now() - startTime;
    await this.db.insertDiffReport(sourceId, report, duration);

    return report;
  }
}
