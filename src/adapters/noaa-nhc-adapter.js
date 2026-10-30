import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class NoaaNhcAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'noaa_nhc',
      name: 'NOAA National Hurricane Center (NHC)',
      agency: 'U.S. National Oceanic and Atmospheric Administration (NOAA)',
      category: 'RADAR',
      attribution: 'Active tropical cyclone positions, forecasts, and intensities courtesy of NOAA NHC RSMC.',
      homepage: 'https://www.nhc.noaa.gov',
      ttlMs: 10 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchActiveStorms() {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'GodsEye-OrbitalCommand/3.0' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const storms = Array.isArray(data.activeStorms) ? data.activeStorms : [];
      this.recordSuccess(storms, Date.now() - t0);
      return storms;
    } catch (err) {
      this.recordFailure(err.message);
      return [];
    }
  }
}
