/**
 * WORLD AIR QUALITY INDEX PROJECT (WAQI) ADAPTER
 * Connects to the WAQI / aqicn.org global public platform.
 * Terms: Explicit attribution mandatory. Commercial use requires explicit agreement.
 * Docs: https://aqicn.org/api/
 */
import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class WaqiAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'waqi',
      name: 'World Air Quality Index Project (WAQI)',
      agency: 'WAQI / aqicn.org Project Team',
      category: 'AIR_QUALITY_OBSERVATORY',
      attribution: 'World Air Quality Index Project (waqi.info / aqicn.org)',
      homepage: 'https://aqicn.org/api/',
      ttlMs: 25 * 60 * 1000,
      requiresAuth: true,
      isCommercial: false
    });
    this.token = process.env.WAQI_API_TOKEN || null;
    this.status = this.token ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
  }

  async fetchData(lat, lon) {
    if (!this.token) {
      this.status = ADAPTER_STATUS.NEEDS_CREDENTIALS;
      return null;
    }

    const t0 = Date.now();
    try {
      const url = `https://api.waqi.info/feed/geo:${Number(lat).toFixed(4)};${Number(lon).toFixed(4)}/?token=${this.token}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WAQI HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.data || 'WAQI API error');
      this.recordSuccess(data.data, Date.now() - t0);
      return data.data;
    } catch (err) {
      this.recordFailure(err.message);
      return null;
    }
  }
}
