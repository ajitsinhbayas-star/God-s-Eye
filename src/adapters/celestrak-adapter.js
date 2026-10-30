import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class CelesTrakAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'celestrak',
      name: 'CelesTrak General Perturbations (GP)',
      agency: 'Center for Space Standards & Innovation / Dr. T.S. Kelso',
      category: 'ORBITAL_ELEMENTS',
      attribution: 'Data courtesy of CelesTrak (celestrak.org). TLE ephemerides generated from 18th SDS tracking.',
      homepage: 'https://celestrak.org',
      ttlMs: 20 * 60 * 1000,
      requiresAuth: false,
      isCommercial: false
    });
    this.status = ADAPTER_STATUS.ACTIVE;
  }

  async fetchTleByCatalogNumber(noradCatNum) {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradCatNum}&FORMAT=tle`, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'GodsEye-OrbitalCommand/3.0 (Aerospace Situational Awareness)' }
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/).filter(l => l.startsWith('1 ') || l.startsWith('2 '));
      if (lines.length < 2) throw new Error('Incomplete TLE lines in response');

      const result = {
        norad: Number(noradCatNum),
        line1: lines[0],
        line2: lines[1],
        source: 'celestrak',
        fetchedAt: new Date().toISOString()
      };
      this.recordSuccess(result, Date.now() - t0);
      return result;
    } catch (err) {
      this.recordFailure(err.message);
      throw err;
    }
  }

  async fetchDecayList() {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch('https://celestrak.org/satcat/decay.php', {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'GodsEye-OrbitalCommand/3.0' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // Basic parse of decay table
      const records = [];
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\d{5}/.test(trimmed)) {
          const parts = trimmed.split(/\s{2,}/);
          if (parts.length >= 3) {
            records.push({
              norad: Number(parts[0]),
              name: parts[1],
              decayDate: parts[2],
              source: 'CelesTrak SATCAT Decay'
            });
          }
        }
      }
      this.recordSuccess(records, Date.now() - t0);
      return records;
    } catch (err) {
      this.recordFailure(err.message);
      return [];
    }
  }
}
