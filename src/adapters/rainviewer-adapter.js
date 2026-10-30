import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class RainViewerAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'rainviewer',
      name: 'RainViewer Global Doppler Radar Mosaic',
      agency: 'RainViewer Meteorological Network',
      category: 'RADAR',
      attribution: 'Doppler precipitation radar mosaic courtesy of RainViewer API v2.',
      homepage: 'https://www.rainviewer.com/api.html',
      ttlMs: 5 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchMaps() {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'GodsEye-OrbitalCommand/3.0' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.recordSuccess(data, Date.now() - t0);
      return data;
    } catch (err) {
      this.recordFailure(err.message);
      throw err;
    }
  }
}
