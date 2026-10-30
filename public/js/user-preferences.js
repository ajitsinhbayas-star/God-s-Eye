/**
 * God's Eye User Preferences Manager
 * Version: 4.0.0
 * 
 * Safely persists non-sensitive preferences in local storage:
 * - Observer coordinates and default sector
 * - Velocity & altitude display units
 * - Graphics quality preset (Auto / Balanced / High)
 * - Accessibility: Reduced motion & high contrast
 * - Local personal watchlist
 */

const PREFS_STORAGE_KEY = 'godseye_user_preferences_v4';

const DEFAULT_PREFERENCES = {
  observer: {
    lat: 18.5204,
    lon: 73.8567,
    name: 'Pune / India Sector'
  },
  units: {
    velocity: 'km/s', // 'km/s' | 'km/h' | 'mph'
    altitude: 'km'     // 'km' | 'mi'
  },
  quality: 'auto',     // 'auto' | 'balanced' | 'high'
  accessibility: {
    reducedMotion: 'auto', // 'auto' (follows system) | 'always' | 'never'
    highContrast: false,
    hudSound: false
  },
  watchlist: ['ISS', 'CARTOSAT3', 'ADITYA_L1', 'EOS04'],
  activeLayers: {
    debris: true,
    groundStations: false,
    atmosphere: true,
    dayNight: true
  }
};

class UserPreferencesManager {
  constructor() {
    this.prefs = this.loadPreferences();
    this.listeners = new Set();
    this.bindMediaQueries();
  }

  loadPreferences() {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      const parsed = JSON.parse(raw);
      // Validate schema and merge with defaults
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        observer: { ...DEFAULT_PREFERENCES.observer, ...(parsed.observer || {}) },
        units: { ...DEFAULT_PREFERENCES.units, ...(parsed.units || {}) },
        accessibility: { ...DEFAULT_PREFERENCES.accessibility, ...(parsed.accessibility || {}) },
        activeLayers: { ...DEFAULT_PREFERENCES.activeLayers, ...(parsed.activeLayers || {}) },
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : DEFAULT_PREFERENCES.watchlist
      };
    } catch (_) {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  save() {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.prefs));
      this.notifyListeners();
    } catch (e) {
      console.warn('[Preferences] Failed to save to localStorage:', e.message);
    }
  }

  get(path, fallback = null) {
    const parts = path.split('.');
    let curr = this.prefs;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return fallback;
      }
    }
    return curr !== undefined ? curr : fallback;
  }

  set(path, value) {
    const parts = path.split('.');
    let curr = this.prefs;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!curr[p] || typeof curr[p] !== 'object') curr[p] = {};
      curr = curr[p];
    }
    curr[parts[parts.length - 1]] = value;
    this.save();
  }

  isReducedMotion() {
    const pref = this.prefs.accessibility.reducedMotion;
    if (pref === 'always') return true;
    if (pref === 'never') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  bindMediaQueries() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
        this.notifyListeners();
      });
    }
  }

  getEffectivePixelDensity(maxDefault = 2) {
    const q = this.prefs.quality;
    const deviceRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    if (q === 'high') return Math.min(deviceRatio, 2.0);
    if (q === 'balanced') return Math.min(deviceRatio, 1.25);
    // Auto: limit to 1.25 on mobile screens or weak GPUs
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
    return isMobile ? Math.min(deviceRatio, 1.0) : Math.min(deviceRatio, maxDefault);
  }

  // Personal Watchlist API
  toggleWatchlist(satelliteId) {
    const list = this.prefs.watchlist || [];
    const id = String(satelliteId).toUpperCase();
    const idx = list.indexOf(id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(id);
    }
    this.prefs.watchlist = list;
    this.save();
    return list.includes(id);
  }

  isWatchlisted(satelliteId) {
    const list = this.prefs.watchlist || [];
    return list.includes(String(satelliteId).toUpperCase());
  }

  resetDefaults() {
    this.prefs = { ...DEFAULT_PREFERENCES };
    this.save();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    for (const cb of this.listeners) {
      try { cb(this.prefs); } catch (_) {}
    }
  }
}

export const userPreferences = new UserPreferencesManager();

if (typeof window !== 'undefined') {
  window.userPreferences = userPreferences;
}
