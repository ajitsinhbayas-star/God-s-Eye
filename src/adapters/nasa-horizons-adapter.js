import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class NasaHorizonsAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'nasa_horizons',
      name: 'NASA/JPL Horizons Ephemeris System',
      agency: 'NASA / Jet Propulsion Laboratory Solar System Dynamics Group',
      category: 'EPHEMERIS',
      attribution: 'Ephemerides provided by NASA/JPL Solar System Dynamics Group (Horizons API).',
      homepage: 'https://ssd.jpl.nasa.gov/horizons/',
      ttlMs: 60 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchEphemeris(targetCode = '399', centerCode = '500@10', startIso = 'now', stopIso = '+1d') {
    const t0 = Date.now();
    try {
      const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${targetCode}'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='${centerCode}'&START_TIME='${startIso}'&STOP_TIME='${stopIso}'&STEP_SIZE='1d'`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.recordSuccess({ target: targetCode, signature: data.signature, result: data.result?.slice(0, 500) }, Date.now() - t0);
      return data;
    } catch (err) {
      this.recordFailure(err.message);
      throw err;
    }
  }
}
