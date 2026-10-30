/**
 * AQI.IN — INDIAN CITY RANKINGS & MONITORING ADAPTER
 * Official integration descriptor requiring partner API licensing.
 * Docs: https://www.aqi.in/
 */
import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class AqiInAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'aqi_in',
      name: 'AQI.in National Monitoring Platform',
      agency: 'AQI.in / Purelogic Labs India',
      category: 'AIR_QUALITY_OBSERVATORY',
      attribution: 'AQI.in India (Partner API Documentation Required)',
      homepage: 'https://www.aqi.in',
      ttlMs: 30 * 60 * 1000,
      requiresAuth: true,
      isCommercial: true
    });
    this.apiKey = process.env.AQI_IN_API_KEY || null;
    this.status = this.apiKey ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_AUTHORIZATION;
  }

  async fetchData(lat, lon) {
    if (!this.apiKey) {
      this.status = ADAPTER_STATUS.NEEDS_AUTHORIZATION;
      return null;
    }

    const t0 = Date.now();
    try {
      const url = `https://api.aqi.in/v1/live?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      if (!res.ok) throw new Error(`AQI.in HTTP ${res.status}`);
      const data = await res.json();
      this.recordSuccess(data, Date.now() - t0);
      return data;
    } catch (err) {
      this.recordFailure(err.message);
      return null;
    }
  }
}
