import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIAGNOSTICS_FILE = path.join(__dirname, 'diagnostics-db.json');

export class SentinelIncidentReporter {
  constructor() {
    this.incidents = [];
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DIAGNOSTICS_FILE)) {
        this.incidents = JSON.parse(fs.readFileSync(DIAGNOSTICS_FILE, 'utf-8'));
      }
    } catch {
      this.incidents = [];
    }
  }

  async processIncident(incident) {
    if (!incident) return;
    this.incidents.unshift({
      ...incident,
      receivedAt: new Date().toISOString()
    });
    if (this.incidents.length > 250) this.incidents.pop();

    try {
      await fs.promises.writeFile(DIAGNOSTICS_FILE, JSON.stringify(this.incidents, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Sentinel Diagnostics Save Error]', e.message);
    }
  }

  async getDiagnosticSummary() {
    return {
      status: 'ONLINE',
      totalIncidents: this.incidents.length,
      incidents: this.incidents.slice(0, 50)
    };
  }
}

export const sentinel = new SentinelIncidentReporter();