import { WebSocketServer, WebSocket } from 'ws';
import { db } from './database';
import { DifferentialSyncEngine } from './DifferentialSyncEngine';
import { RawScrapedItem, WebSocketPacket } from './types';
import { delay, calculateBackoff, cleanText } from './utils';

export class IntelInfiltrationWorker {
  private engine: DifferentialSyncEngine;
  private wss: WebSocketServer | null = null;
  private isRunning = false;

  constructor(private port = 8080) {
    this.engine = new DifferentialSyncEngine(db);
  }

  public start() {
    this.isRunning = true;
    this.initWebSocket();
    this.runLoop();
    console.log(`[INTEL_WORKER] Started background crawler on WS port ${this.port}`);
  }

  public stop() {
    this.isRunning = false;
    if (this.wss) this.wss.close();
  }

  private initWebSocket() {
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on('connection', (ws: WebSocket) => {
      ws.send(
        JSON.stringify({
          type: 'INTEL_HEARTBEAT',
          timestamp: new Date().toISOString(),
          message: 'UPLINK_ESTABLISHED // Connected to Infiltration Worker WS'
        })
      );
    });
  }

  private broadcast(packet: WebSocketPacket) {
    if (!this.wss) return;
    const data = JSON.stringify(packet);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private async fetchRssItems(url: string): Promise<RawScrapedItem[]> {
    const res = await fetch(url, { headers: { 'User-Agent': 'Argus-IntelWorker/3.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const xml = await res.text();

    const items: RawScrapedItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block);
      const linkMatch = /<link[^>]*>([\s\S]*?)<\/link>/i.exec(block);
      const descMatch = /<description[^>]*>([\s\S]*?)<\/description>/i.exec(block);

      if (titleMatch && linkMatch) {
        items.push({
          title: cleanText(titleMatch[1]),
          canonicalUrl: cleanText(linkMatch[1]),
          body: cleanText(descMatch ? descMatch[1] : titleMatch[1])
        });
      }
    }
    return items;
  }

  private async runLoop() {
    while (this.isRunning) {
      const sources = await db.getSources();

      for (const src of sources) {
        if (!this.isRunning) break;
        if (src.circuitState === 'OPEN') continue;

        try {
          let scraped: RawScrapedItem[] = [];
          if (src.crawlerType === 'RSS') {
            scraped = await this.fetchRssItems(src.targetUrl);
          }

          const report = await this.engine.reconcile(src.sourceId, scraped);
          await db.updateSourceCircuit(src.sourceId, 'CLOSED', 0);

          // Stream injected records
          for (const rec of report.added) {
            this.broadcast({
              type: 'INTEL_INJECTED',
              timestamp: rec.updatedAt,
              message: `INTEL_INJECTED: [${rec.category}] ${rec.title} (ID: ${rec.id.slice(0, 8)})`,
              record: rec
            });
          }

          // Stream modified records
          for (const rec of report.updated) {
            this.broadcast({
              type: 'INTEL_UPDATED',
              timestamp: rec.updatedAt,
              message: `INTEL_UPDATED: ${rec.title} (Hash Recalibrated)`,
              record: rec
            });
          }

          // Stream purged records
          for (const rec of report.deleted) {
            this.broadcast({
              type: 'INTEL_PURGED',
              timestamp: rec.updatedAt,
              message: `INTEL_PURGED: ${rec.title} (Vanished from source)`,
              record: rec
            });
          }
        } catch (err: any) {
          const failures = src.consecutiveFailures + 1;
          const circuitState = failures >= 5 ? 'OPEN' : 'HALF_OPEN';
          await db.updateSourceCircuit(src.sourceId, circuitState, failures, err.message);

          this.broadcast({
            type: 'CIRCUIT_TRIPPED',
            timestamp: new Date().toISOString(),
            message: `[ALERT] Crawl error on ${src.sourceId}: ${err.message}. Circuit: ${circuitState}`
          });

          await delay(calculateBackoff(failures));
        }

        await delay(src.rateLimitMs || 500);
      }

      await delay(10000); // 10s cycle cadence
    }
  }
}

// Auto-run if executed directly via Node / ts-node
if (require.main === module) {
  const worker = new IntelInfiltrationWorker(8080);
  worker.start();
}
