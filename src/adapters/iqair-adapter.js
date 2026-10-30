/**
 * IQAIR AIRVISUAL — COMMUNITY API ADAPTER
 * Connects to IQAir community API for nearest city observations and global sensor indices.
 * Note: Free Community plan is limited to 5 calls/min, 500/day. AQI scales use US/CN standards.
 * Docs: https://www.iqair.com/air-pollution-data-api
 */
import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class IQAirAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'iqair',
      name: 'IQAir AirVisual Community API',
      agency: 'IQAir AG (Switzerland)',
      category: 'AIR_QUALITY_OBSERVATORY',
      attribution: 'IQAir AirVisual Global Network',
      homepage: 'https://www.iqair.com/air-pollution-data-api',
      ttlMs: 30 * 60 * 1000,
      requiresAuth: true,
      isCommercial: true
    });
    this.apiKey = process.env.IQAIR_API_KEY || null;
    this.status = this.apiKey ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
  }

  async fetchData(lat, lon) {
    if (!this.apiKey) {
      this.status = ADAPTER_STATUS.NEEDS_CREDENTIALS;
      return null;
    }

    const t0 = Date.now();
    try {
      const url = `http://api.airvisual.com/v2/nearest_city?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`IQAir HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.data?.message || 'IQAir error');
      this.recordSuccess(data.data, Date.now() - t0);
      return data.data;
    } catch (err) {
      this.recordFailure(err.message);
      return null;
    }
  }
}
