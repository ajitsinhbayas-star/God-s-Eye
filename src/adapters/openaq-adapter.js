/**
 * OPENAQ — GLOBAL OPEN AIR QUALITY HUB ADAPTER (v3 API)
 * Worldwide aggregated regulatory and research air quality telemetry.
 * Docs: https://docs.openaq.org/
 */
import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class OpenAQAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'openaq',
      name: 'OpenAQ Global Air Quality Hub',
      agency: 'OpenAQ Community Platform',
      category: 'AIR_QUALITY_OBSERVATORY',
      attribution: 'OpenAQ Global Air Quality Network (Open Data v3 API)',
      homepage: 'https://openaq.org',
      ttlMs: 30 * 60 * 1000,
      requiresAuth: true,
      isCommercial: false
    });
    this.apiKey = process.env.OPENAQ_API_KEY || null;
    this.status = this.apiKey ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
  }

  async fetchData(lat, lon) {
    if (!this.apiKey) {
      this.status = ADAPTER_STATUS.NEEDS_CREDENTIALS;
      return null;
    }

    const t0 = Date.now();
    try {
      const url = `https://api.openaq.org/v3/locations?coordinates=${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}&radius=25000&limit=5`;
      const res = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'User-Agent': 'OrbitalEye-Observatory/2.0'
        }
      });
      if (!res.ok) throw new Error(`OpenAQ HTTP ${res.status}`);
      const data = await res.json();
      this.recordSuccess(data, Date.now() - t0);
      return data;
    } catch (err) {
      this.recordFailure(err.message);
      return null;
    }
  }
}
