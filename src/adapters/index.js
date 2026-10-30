import { CelesTrakAdapter } from './celestrak-adapter.js';
import { SpaceTrackAdapter } from './space-track-adapter.js';
import { SatNogsAdapter } from './satnogs-adapter.js';
import { NasaHorizonsAdapter } from './nasa-horizons-adapter.js';
import { NasaCadAdapter } from './nasa-cad-adapter.js';
import { NoaaSwpcAdapter } from './noaa-swpc-adapter.js';
import { NoaaNhcAdapter } from './noaa-nhc-adapter.js';
import { RainViewerAdapter } from './rainviewer-adapter.js';
import { EsaDiscosAdapter, EuSstAdapter, LeoLabsAdapter, SlingshotAdapter, ComspocAdapter } from './restricted-adapters.js';

export class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaults();
  }

  register(adapter) {
    this.adapters.set(adapter.id, adapter);
  }

  get(id) {
    return this.adapters.get(id);
  }

  getAll() {
    return Array.from(this.adapters.values());
  }

  getAllMetadata() {
    return this.getAll().map(a => a.getMetadata());
  }

  registerDefaults() {
    this.register(new CelesTrakAdapter());
    this.register(new SpaceTrackAdapter());
    this.register(new SatNogsAdapter());
    this.register(new NasaHorizonsAdapter());
    this.register(new NasaCadAdapter());
    this.register(new NoaaSwpcAdapter());
    this.register(new NoaaNhcAdapter());
    this.register(new RainViewerAdapter());
    this.register(new EsaDiscosAdapter());
    this.register(new EuSstAdapter());
    this.register(new LeoLabsAdapter());
    this.register(new SlingshotAdapter());
    this.register(new ComspocAdapter());
  }
}

export const adapterRegistry = new AdapterRegistry();
