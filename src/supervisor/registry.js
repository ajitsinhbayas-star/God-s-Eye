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
      { id: 'wheretheiss', name: 'WhereTheISS.at', category: 'MEASURED', status: PROVIDER_STATUS.ACTIVE, attribution: 'Bill Shupp / WhereTheISS.at' },
      { id: 'rainviewer', name: 'RainViewer Doppler Radar', category: 'MEASURED_RADAR', status: PROVIDER_STATUS.ACTIVE, attribution: 'RainViewer API v2' },
      { id: 'noaa_nhc', name: 'NOAA National Hurricane Center', category: 'TROPICAL_CYCLONES', status: PROVIDER_STATUS.ACTIVE, attribution: 'NOAA NHC RSMC' },
      { id: 'nasa_firms', name: 'NASA FIRMS Active Fires', category: 'THERMAL_ANOMALIES', status: process.env.FIRMS_MAP_KEY ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: 'NASA FIRMS (MODIS/VIIRS)' },
      { id: 'open_meteo', name: 'Open-Meteo Global Forecast Models', category: 'NWP_FORECAST', status: PROVIDER_STATUS.ACTIVE, attribution: 'Open-Meteo' },
      // Air Quality Observatory Providers
      { id: 'cpcb_naqi', name: 'CPCB National Air Quality Index (NAQI)', category: 'AIR_QUALITY_OBSERVATORY', status: PROVIDER_STATUS.ACTIVE, attribution: 'Central Pollution Control Board (CPCB) India / MoEFCC & Open-Meteo Atmospheric Chemistry' },
      { id: 'google_air_quality', name: 'Google Maps Platform Air Quality API', category: 'AIR_QUALITY_OBSERVATORY', status: (process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_AIR_QUALITY_API_KEY) ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: 'Google Maps Platform Air Quality API (ind_cpcb)' },
      { id: 'iqair', name: 'IQAir AirVisual Community API', category: 'AIR_QUALITY_OBSERVATORY', status: process.env.IQAIR_API_KEY ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: 'IQAir AirVisual Community Network' },
      { id: 'waqi', name: 'World Air Quality Index Project (WAQI)', category: 'AIR_QUALITY_OBSERVATORY', status: process.env.WAQI_API_TOKEN ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: 'World Air Quality Index Project (waqi.info)' },
      { id: 'airnow', name: 'U.S. EPA AirNow API', category: 'AIR_QUALITY_OBSERVATORY', status: process.env.AIRNOW_API_KEY ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.NEEDS_CREDENTIALS, attribution: 'U.S. EPA AirNow (North America)' },
      { id: 'aqi_in', name: 'AQI.in National Monitoring', category: 'AIR_QUALITY_OBSERVATORY', status: PROVIDER_STATUS.NEEDS_AUTHORIZATION, attribution: 'AQI.in India (Partner Authorization Required)' }
    ];

    list.forEach(p => {
      this.providers.set(p.id, {
        ...p,
        lastAttempt: null,
        lastSuccess: null,
        lastError: null,
        latencyMs: 0,
        successCount: 0,
        failureCount: 0,
        totalCalls: 0
      });
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
    prov.successCount = (prov.successCount || 0) + 1;
    prov.totalCalls = (prov.totalCalls || 0) + 1;
    breaker.failures = 0;
    breaker.state = 'CLOSED';
  }

  recordFailure(id, errorMsg) {
    const prov = this.providers.get(id);
    const breaker = this.circuitBreakers.get(id);
    if (!prov) return;
    prov.lastAttempt = new Date().toISOString();
    prov.lastError = errorMsg;
    prov.failureCount = (prov.failureCount || 0) + 1;
    prov.totalCalls = (prov.totalCalls || 0) + 1;
    breaker.failures += 1;
    if (breaker.failures >= 3) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = Date.now() + 60000;
      prov.status = PROVIDER_STATUS.DEGRADED;
    }
  }
}

export const providerRegistry = new ProviderRegistry();
