export const PROVIDER_STATUS = {
  ACTIVE: 'ACTIVE',
  NEEDS_CREDENTIALS: 'NEEDS_CREDENTIALS',
  NEEDS_AUTHORIZATION: 'NEEDS_AUTHORIZATION',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  DISABLED: 'DISABLED'
};

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.circuitBreakers = new Map();
    this.initRegistry();
  }

  initRegistry() {
    const list = [
      { id: 'celestrak', name: 'CelesTrak NORAD GP', category: 'ORBITAL_ELEMENTS', status: PROVIDER_STATUS.ACTIVE, attribution: 'T.S. Kelso / CelesTrak' },
      { id: 'space_track', name: 'Space-Track.org', category: 'ORBITAL_ELEMENTS', status: process.env.SPACE_TRACK_USER ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: '18th Space Defense Squadron' },
      { id: 'satnogs_db', name: 'SatNOGS Database', category: 'CATALOGUE', status: process.env.SATNOGS_API_KEY ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: 'Libre Space Foundation' },
      { id: 'nasa_horizons', name: 'NASA/JPL Horizons System', category: 'SCIENTIFIC_EPHEMERIS', status: PROVIDER_STATUS.ACTIVE, attribution: 'NASA/JPL Solar System Dynamics' },
      { id: 'nasa_jpl_cad', name: 'NASA/JPL Small-Body CAD', category: 'PREDICTION', status: PROVIDER_STATUS.ACTIVE, attribution: 'NASA/JPL CNEOS' },
      { id: 'noaa_swpc', name: 'NOAA Space Weather Prediction Center', category: 'MEASURED', status: PROVIDER_STATUS.ACTIVE, attribution: 'NOAA SWPC' },
      { id: 'wheretheiss', name: 'WhereTheISS.at', category: 'MEASURED', status: PROVIDER_STATUS.ACTIVE, attribution: 'Bill Shupp / WhereTheISS.at' }
    ];

    list.forEach(p => {
      this.providers.set(p.id, { ...p, lastAttempt: null, lastSuccess: null, lastError: null, latencyMs: 0 });
      this.circuitBreakers.set(p.id, { failures: 0, state: 'CLOSED', nextAttempt: 0 });
    });
  }

  getProvider(id) { return this.providers.get(id); }
  getAllProviders() { return Array.from(this.providers.values()); }

  canExecute(id) {
    const breaker = this.circuitBreakers.get(id);
    const prov = this.providers.get(id);
    if (!prov || prov.status === PROVIDER_STATUS.DISABLED) return false;
    if (breaker.state === 'OPEN') {
      if (Date.now() > breaker.nextAttempt) { breaker.state = 'HALF_OPEN'; return true; }
      return false;
    }
    return true;
  }

  recordSuccess(id, latencyMs) {
    const prov = this.providers.get(id);
    const breaker = this.circuitBreakers.get(id);
    if (!prov) return;
    prov.lastAttempt = new Date().toISOString();
    prov.lastSuccess = prov.lastAttempt;
    prov.lastError = null;
    prov.latencyMs = latencyMs;
    prov.status = PROVIDER_STATUS.ACTIVE;
    breaker.failures = 0;
    breaker.state = 'CLOSED';
  }

  recordFailure(id, errorMsg) {
    const prov = this.providers.get(id);
    const breaker = this.circuitBreakers.get(id);
    if (!prov) return;
    prov.lastAttempt = new Date().toISOString();
    prov.lastError = errorMsg;
    breaker.failures += 1;
    if (breaker.failures >= 3) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = Date.now() + 60000;
      prov.status = PROVIDER_STATUS.DEGRADED;
    }
  }
}

export const providerRegistry = new ProviderRegistry();
