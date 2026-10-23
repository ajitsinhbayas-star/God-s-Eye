/**
 * SENTINEL OFFICIAL PROVIDER REGISTRY & QUALITY CONTRACT
 * Enforces rate limits, circuit breakers, and status classifications.
 */

export const PROVIDER_STATUS = {
  ACTIVE: 'ACTIVE',
  NEEDS_CREDENTIALS: 'NEEDS_CREDENTIALS',
  NEEDS_AUTHORIZATION: 'NEEDS_AUTHORIZATION',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  DISABLED: 'DISABLED'
};

export const DATA_CLASSES = {
  MEASURED: 'MEASURED',
  CATALOGUE: 'CATALOGUE',
  ORBITAL_ELEMENTS: 'ORBITAL_ELEMENTS',
  MODEL_DERIVED: 'MODEL_DERIVED',
  PREDICTION: 'PREDICTION',
  SCIENTIFIC_EPHEMERIS: 'SCIENTIFIC_EPHEMERIS',
  EARTH_IMAGERY: 'EARTH_IMAGERY',
  GROUND_STATION_STATUS: 'GROUND_STATION_STATUS'
};

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.circuitBreakers = new Map();
    this.initRegistry();
  }

  initRegistry() {
    const list = [
      {
        id: 'celestrak',
        name: 'CelesTrak NORAD GP',
        category: 'ORBITAL_ELEMENTS',
        docUrl: 'https://celestrak.org/NORAD/documentation/gp-data-formats.php',
        intervalMs: 2 * 60 * 60 * 1000, // Documented 2-hour guideline
        requiresAuth: false,
        requiredKeys: [],
        status: PROVIDER_STATUS.ACTIVE,
        attribution: 'T.S. Kelso / CelesTrak'
      },
      {
        id: 'space_track',
        name: 'Space-Track.org',
        category: 'ORBITAL_ELEMENTS',
        docUrl: 'https://www.space-track.org/documentation',
        intervalMs: 4 * 60 * 60 * 1000,
        requiresAuth: true,
        requiredKeys: ['SPACE_TRACK_USER', 'SPACE_TRACK_PASSWORD'],
        status: process.env.SPACE_TRACK_USER ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS,
        attribution: '18th Space Defense Squadron / US Space Force'
      },
      {
        id: 'satnogs_db',
        name: 'SatNOGS Satellite Database',
        category: 'CATALOGUE',
        docUrl: 'https://db.satnogs.org/api/schema/docs/',
        intervalMs: 6 * 60 * 60 * 1000,
        requiresAuth: true,
        requiredKeys: ['SATNOGS_API_KEY'],
        status: process.env.SATNOGS_API_KEY ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS,
        attribution: 'Libre Space Foundation / CC BY-SA 4.0'
      },
      {
        id: 'esa_discos',
        name: 'ESA DISCOSweb',
        category: 'CATALOGUE',
        docUrl: 'https://discosweb.esoc.esa.int/',
        intervalMs: 12 * 60 * 60 * 1000,
        requiresAuth: true,
        requiredKeys: ['ESA_DISCOS_TOKEN'],
        status: process.env.ESA_DISCOS_TOKEN ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_AUTHORIZATION,
        attribution: 'European Space Agency Space Debris Office'
      },
      {
        id: 'nasa_horizons',
        name: 'NASA/JPL Horizons System',
        category: 'SCIENTIFIC_EPHEMERIS',
        docUrl: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
        intervalMs: 15 * 60 * 1000,
        requiresAuth: false,
        requiredKeys: [],
        status: PROVIDER_STATUS.ACTIVE,
        attribution: 'NASA/JPL Solar System Dynamics Group'
      },
      {
        id: 'nasa_jpl_cad',
        name: 'NASA/JPL Small-Body CAD',
        category: 'PREDICTION',
        docUrl: 'https://ssd-api.jpl.nasa.gov/doc/cad.html',
        intervalMs: 60 * 60 * 1000,
        requiresAuth: false,
        requiredKeys: [],
        status: PROVIDER_STATUS.ACTIVE,
        attribution: 'NASA/JPL CNEOS'
      },
      {
        id: 'noaa_swpc',
        name: 'NOAA Space Weather Prediction Center',
        category: 'MEASURED',
        docUrl: 'https://services.swpc.noaa.gov/json/',
        intervalMs: 5 * 60 * 1000,
        requiresAuth: false,
        requiredKeys: [],
        status: PROVIDER_STATUS.ACTIVE,
        attribution: 'NOAA / Space Weather Prediction Center'
      },
      {
        id: 'nasa_dsn_now',
        name: 'NASA Deep Space Network Now',
        category: 'GROUND_STATION_STATUS',
        docUrl: 'https://eyes.nasa.gov/dsn-now/',
        intervalMs: 15 * 1000,
        requiresAuth: false,
        requiredKeys: [],
        status: PROVIDER_STATUS.ACTIVE,
        attribution: 'NASA Jet Propulsion Laboratory'
      },
      {
        id: 'wheretheiss',
        name: 'WhereTheISS.at',
        category: 'MEASURED',
        docUrl: 'https://wheretheiss.at/w/developer',
        intervalMs: 2000,
        requiresAuth: false,
        requiredKeys: [],
        status: PROVIDER_STATUS.ACTIVE,
        attribution: 'Bill Shupp / WhereTheISS.at'
      },
      {
        id: 'leolabs',
        name: 'LeoLabs Global Radar',
        category: 'MEASURED',
        docUrl: 'https://leolabs.space/',
        intervalMs: 60 * 60 * 1000,
        requiresAuth: true,
        requiredKeys: ['LEOLABS_API_KEY'],
        status: process.env.LEOLABS_API_KEY ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_AUTHORIZATION,
        attribution: 'LeoLabs Inc. Commercial Radar'
      }
    ];

    list.forEach(p => {
      this.providers.set(p.id, {
        ...p,
        lastAttempt: null,
        lastSuccess: null,
        lastError: null,
        latencyMs: 0,
        consecutiveFailures: 0
      });
      this.circuitBreakers.set(p.id, { failures: 0, state: 'CLOSED', nextAttempt: 0 });
    });
  }

  getProvider(id) {
    return this.providers.get(id);
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }

  canExecute(id) {
    const breaker = this.circuitBreakers.get(id);
    const prov = this.providers.get(id);
    if (!prov || prov.status === PROVIDER_STATUS.DISABLED) return false;
    if (prov.status === PROVIDER_STATUS.NEEDS_CREDENTIALS || prov.status === PROVIDER_STATUS.NEEDS_AUTHORIZATION) return false;
    if (breaker.state === 'OPEN') {
      if (Date.now() > breaker.nextAttempt) {
        breaker.state = 'HALF_OPEN';
        return true;
      }
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
    prov.consecutiveFailures = 0;
    prov.status = PROVIDER_STATUS.ACTIVE;

    breaker.failures = 0;
    breaker.state = 'CLOSED';
  }

  recordFailure(id, errorMsg, isAuthError = false) {
    const prov = this.providers.get(id);
    const breaker = this.circuitBreakers.get(id);
    if (!prov) return;

    prov.lastAttempt = new Date().toISOString();
    prov.lastError = errorMsg;
    prov.consecutiveFailures += 1;

    if (isAuthError) {
      prov.status = PROVIDER_STATUS.NEEDS_CREDENTIALS;
      breaker.state = 'OPEN';
      breaker.nextAttempt = Date.now() + 24 * 60 * 60 * 1000;
      return;
    }

    breaker.failures += 1;
    if (breaker.failures >= 3) {
      breaker.state = 'OPEN';
      // Exponential backoff up to 15 minutes
      const backoffMs = Math.min(15 * 60 * 1000, 15000 * Math.pow(2, breaker.failures - 3));
      breaker.nextAttempt = Date.now() + backoffMs;
      prov.status = PROVIDER_STATUS.DEGRADED;
    }
  }
}

export const providerRegistry = new ProviderRegistry();