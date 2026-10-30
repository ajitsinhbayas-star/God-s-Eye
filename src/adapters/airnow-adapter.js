/**
 * AIRNOW — U.S. EPA ENVIRONMENTAL MONITORING ADAPTER
 * Official air quality observations across US, Canada, and Mexico.
 * Not applicable for Indian domestic stations per regional jurisdiction.
 * Docs: https://docs.airnowapi.org/
 */
import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class AirNowAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'airnow',
      name: 'U.S. EPA AirNow API',
      agency: 'U.S. Environmental Protection Agency / Environment and Climate Change Canada',
      category: 'AIR_QUALITY_OBSERVATORY',
      attribution: 'U.S. EPA AirNow Program (North American Coverage: US, CA, MX)',
      homepage: 'https://docs.airnowapi.org/',
      ttlMs: 30 * 60 * 1000,
      requiresAuth: true,
      isCommercial: false
    });
    this.apiKey = process.env.AIRNOW_API_KEY || null;
    this.status = this.apiKey ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
  }

  async fetchData(lat, lon) {
    // AirNow strictly covers North America (lat ~14 to 75, lon ~-170 to -50)
    if (lon > -40 && lon < 170) {
      // Outside North American coverage
      return null;
    }

    if (!this.apiKey) {
      this.status = ADAPTER_STATUS.NEEDS_CREDENTIALS;
      return null;
    }

    const t0 = Date.now();
    try {
      const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&distance=50&API_KEY=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`AirNow HTTP ${res.status}`);
      const data = await res.json();
      this.recordSuccess(data, Date.now() - t0);
      return data;
    } catch (err) {
      this.recordFailure(err.message);
      return null;
    }
  }
}
