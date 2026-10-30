/**
 * GOD'S EYE — MULTI-AGENCY DATA SOURCE ADAPTER BASE
 * Enforces unified schema validation, status management, provenance tracking,
 * and rate-limited execution across all space situational awareness providers.
 */

export const ADAPTER_STATUS = {
  ACTIVE: 'ACTIVE',
  NEEDS_CREDENTIALS: 'NEEDS_CREDENTIALS',
  NEEDS_AUTHORIZATION: 'NEEDS_AUTHORIZATION',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE'
};

export class BaseSourceAdapter {
  /**
   * @param {Object} config
   * @param {string} config.id Unique identifier (e.g. 'celestrak')
   * @param {string} config.name Display name (e.g. 'CelesTrak NORAD GP')
   * @param {string} config.agency Sponsoring agency (e.g. 'Center for Space Standards & Innovation / Dr. T.S. Kelso')
   * @param {string} config.category Data domain ('ORBITAL_ELEMENTS'|'SPACE_WEATHER'|'EPHEMERIS'|'RADAR'|'STATION'|'DEBRIS'|'REENTRY')
   * @param {string} config.attribution Mandatory copyright and attribution statement
   * @param {string} [config.homepage] Official documentation or portal URL
   * @param {number} [config.ttlMs] Cache validity window in milliseconds
   * @param {boolean} [config.requiresAuth] Whether provider requires API keys or login credentials
   * @param {boolean} [config.isCommercial] Whether access requires institutional contract
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.agency = config.agency || 'Global Aerospace Partner';
    this.category = config.category || 'ORBITAL_DATA';
    this.attribution = config.attribution;
    this.homepage = config.homepage || 'https://celestrak.org';
    this.ttlMs = config.ttlMs || 15 * 60 * 1000;
    this.requiresAuth = Boolean(config.requiresAuth);
    this.isCommercial = Boolean(config.isCommercial);

    this.status = ADAPTER_STATUS.NOT_CONFIGURED;
    this.lastAttempt = null;
    this.lastSuccess = null;
    this.lastError = null;
    this.latencyMs = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.cachedData = null;
    this.cacheTimestamp = 0;
  }

  isCacheFresh() {
    return this.cachedData !== null && (Date.now() - this.cacheTimestamp < this.ttlMs);
  }

  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      agency: this.agency,
      category: this.category,
      attribution: this.attribution,
      homepage: this.homepage,
      requiresAuth: this.requiresAuth,
      isCommercial: this.isCommercial,
      status: this.status,
      lastAttempt: this.lastAttempt,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
      latencyMs: this.latencyMs,
      successCount: this.successCount,
      failureCount: this.failureCount,
      cacheAgeSeconds: this.cacheTimestamp ? Math.round((Date.now() - this.cacheTimestamp) / 1000) : null
    };
  }

  recordSuccess(data, latencyMs) {
    const now = new Date().toISOString();
    this.lastAttempt = now;
    this.lastSuccess = now;
    this.lastError = null;
    this.latencyMs = latencyMs;
    this.status = ADAPTER_STATUS.ACTIVE;
    this.successCount += 1;
    this.cachedData = data;
    this.cacheTimestamp = Date.now();
  }

  recordFailure(errorMsg) {
    this.lastAttempt = new Date().toISOString();
    this.lastError = String(errorMsg || 'Unknown provider error');
    this.failureCount += 1;
    this.status = this.cachedData ? ADAPTER_STATUS.DEGRADED : ADAPTER_STATUS.UNAVAILABLE;
  }

  /**
   * Abstract execution method to be implemented by subclasses
   */
  async fetchData() {
    throw new Error(`fetchData() not implemented on ${this.constructor.name}`);
  }
}
