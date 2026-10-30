import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class NasaCadAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'nasa_jpl_cad',
      name: 'NASA/JPL Small-Body Close-Approach Data (CAD)',
      agency: 'NASA / Jet Propulsion Laboratory Center for Near Earth Object Studies (CNEOS)',
      category: 'EPHEMERIS',
      attribution: 'Near-Earth Asteroid trajectory and close-approach calculations courtesy of NASA/JPL CNEOS.',
      homepage: 'https://cneos.jpl.nasa.gov',
      ttlMs: 30 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchApproaches(maxDistAu = 0.05, limit = 5) {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`https://ssd-api.jpl.nasa.gov/cad.api?dist-max=${maxDistAu}&date-min=now&limit=${limit}`, {
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const records = (Array.isArray(data.data) ? data.data : []).map(r => ({
        designation: String(r[0]),
        closeApproachDate: String(r[3]),
        distanceAu: parseFloat(r[4]),
        distanceKm: Math.round(parseFloat(r[4]) * 149597870.7),
        vRelKmS: parseFloat(r[7])
      }));
      this.recordSuccess(records, Date.now() - t0);
      return records;
    } catch (err) {
      this.recordFailure(err.message);
      return [];
    }
  }
}
