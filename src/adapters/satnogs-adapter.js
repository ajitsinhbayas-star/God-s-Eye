import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class SatNogsAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'satnogs',
      name: 'SatNOGS Open Satellite Network & Ground Station DB',
      agency: 'Libre Space Foundation',
      category: 'STATION',
      attribution: 'Ground station and radio transmitter data courtesy of Libre Space Foundation / SatNOGS Network.',
      homepage: 'https://satnogs.org',
      ttlMs: 30 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });

    this.token = process.env.SATNOGS_API_TOKEN || null;
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchStations() {
    const t0 = Date.now();
    try {
      const headers = { 'User-Agent': 'GodsEye-OrbitalCommand/3.0' };
      if (this.token && this.token.length > 10) {
        headers['Authorization'] = `Token ${this.token.replace(/^"|"$/g, '')}`;
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch('https://network.satnogs.org/api/stations/?status=online&limit=10', {
        headers,
        signal: ctrl.signal
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const stations = (Array.isArray(data) ? data : []).map(s => ({
        id: `satnogs-${s.id}`,
        name: s.name || `SatNOGS Station #${s.id}`,
        lat: parseFloat(s.lat),
        lon: parseFloat(s.lng),
        altM: parseFloat(s.altitude || 0),
        operator: 'SatNOGS Global Community',
        network: 'SatNOGS',
        status: s.status || 'online',
        antenna: s.antenna || 'VHF/UHF Yagi / Turnstile'
      }));

      this.recordSuccess(stations, Date.now() - t0);
      return stations;
    } catch (err) {
      this.recordFailure(err.message);
      return [];
    }
  }
}
