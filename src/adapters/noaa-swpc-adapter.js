import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class NoaaSwpcAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'noaa_swpc',
      name: 'NOAA Space Weather Prediction Center (SWPC)',
      agency: 'U.S. National Oceanic and Atmospheric Administration (NOAA)',
      category: 'SPACE_WEATHER',
      attribution: 'Real-time geomagnetic indices and space weather alerts courtesy of NOAA SWPC (swpc.noaa.gov).',
      homepage: 'https://www.swpc.noaa.gov',
      ttlMs: 15 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchPlanetaryKp() {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'GodsEye-OrbitalCommand/3.0' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length <= 1) throw new Error('Invalid Kp array');
      const latest = rows[rows.length - 1];
      const result = {
        observationTime: latest[0],
        kpIndex: parseFloat(latest[1]),
        stationCount: parseInt(latest[3], 10)
      };
      this.recordSuccess(result, Date.now() - t0);
      return result;
    } catch (err) {
      this.recordFailure(err.message);
      throw err;
    }
  }
}
