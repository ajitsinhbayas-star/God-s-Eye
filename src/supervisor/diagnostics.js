import fs from 'fs';
import { DIAGNOSTICS_FILE } from '../config/constants.js';

export class SentinelDiagnosticsManager {
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
    this.incidents.unshift({ ...incident, receivedAt: new Date().toISOString() });
    if (this.incidents.length > 200) this.incidents.pop();
    try {
      await fs.promises.writeFile(DIAGNOSTICS_FILE, JSON.stringify(this.incidents, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Diagnostics Error]', e.message);
    }
  }
}

export const sentinelDiagnostics = new SentinelDiagnosticsManager();
