import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class SpaceTrackAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'space_track',
      name: 'Space-Track.org Satellite Catalog & TIP Re-entry',
      agency: 'U.S. Space Force / 18th Space Defense Squadron',
      category: 'ORBITAL_ELEMENTS',
      attribution: 'Orbital data provided by 18th Space Defense Squadron via Space-Track.org under user agreement.',
      homepage: 'https://www.space-track.org',
      ttlMs: 60 * 60 * 1000,
      requiresAuth: true,
      isCommercial: false
    });

    const user = process.env.SPACE_TRACK_USER;
    const pass = process.env.SPACE_TRACK_PASSWORD;
    const hasValidCreds = Boolean(user && pass && user !== 'your_email_here' && pass !== 'your_password_here');

    this.status = hasValidCreds ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
    this.sessionCookie = null;
  }

  isConfigured() {
    return this.status === ADAPTER_STATUS.ACTIVE;
  }

  async authenticate() {
    if (!this.isConfigured()) {
      return { success: false, reason: 'SPACE_TRACK_USER credentials not configured in environment.' };
    }
    const t0 = Date.now();
    try {
      const res = await fetch('https://www.space-track.org/ajaxauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          identity: process.env.SPACE_TRACK_USER,
          password: process.env.SPACE_TRACK_PASSWORD
        })
      });
      if (!res.ok) throw new Error(`Authentication rejected: HTTP ${res.status}`);
      const rawCookie = res.headers.get('set-cookie');
      this.sessionCookie = rawCookie ? rawCookie.split(';')[0] : null;
      this.recordSuccess({ authenticated: true }, Date.now() - t0);
      return { success: true };
    } catch (err) {
      this.recordFailure(err.message);
      return { success: false, error: err.message };
    }
  }
}
