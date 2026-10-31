import express from 'express';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';
import { computeSatTelemetry } from './space.js';
import { adapterRegistry } from '../adapters/index.js';

export const objectsRouter = express.Router();

/**
 * Universal Catalogue Search & Faceted Filter
 * Query params: q, category, regime, objectType, status, agency, page, limit, sortBy, order
 */
objectsRouter.get('/catalog/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').toLowerCase();
  const regime = String(req.query.regime || '').toUpperCase();
  const objectType = String(req.query.objectType || '').toLowerCase();
  const status = String(req.query.status || '').toUpperCase();
  const agency = String(req.query.agency || '').toLowerCase();

  let matches = MASTER_TRACKABLE_CATALOG.filter(item => {
    if (category && item.category.toLowerCase() !== category) return false;
    if (regime && (item.regime || '').toUpperCase() !== regime) return false;
    if (objectType && (item.objectType || '').toLowerCase() !== objectType) return false;
    if (status && (item.status || '').toUpperCase() !== status) return false;
    if (agency && (item.agency || '').toLowerCase().indexOf(agency) === -1 && (item.country || '').toLowerCase() !== agency) return false;

    if (q) {
      const nameMatch = item.name.toLowerCase().includes(q);
      const noradMatch = item.norad !== null && String(item.norad).includes(q);
      const cosparMatch = (item.cospar || '').toLowerCase().includes(q);
      const roleMatch = (item.role || '').toLowerCase().includes(q);
      const aliasMatch = Array.isArray(item.aliases) && item.aliases.some(a => a.toLowerCase().includes(q));
      if (!nameMatch && !noradMatch && !cosparMatch && !roleMatch && !aliasMatch) return false;
    }
    return true;
  });

  // Sorting
  const sortBy = req.query.sortBy || 'name';
  const order = req.query.order === 'desc' ? -1 : 1;
  matches.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (typeof valA === 'string') return valA.localeCompare(valB) * order;
    if (typeof valA === 'number') return ((valA || 0) - (valB || 0)) * order;
    return 0;
  });

  // Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const total = matches.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const pagedItems = matches.slice(startIndex, startIndex + limit);

  // Enrich with live telemetry when requested
  const enriched = pagedItems.map(item => ({
    ...item,
    live: item.parent === 'earth' && item.norad ? computeSatTelemetry(item) : null
  }));

  res.json({
    ok: true,
    meta: {
      total,
      page,
      limit,
      totalPages,
      returned: enriched.length
    },
    data: enriched
  });
});

/**
 * Filter facets and available catalogue dimensions
 */
objectsRouter.get('/catalog/facets', (req, res) => {
  const categories = [...new Set(MASTER_TRACKABLE_CATALOG.map(m => m.category).filter(Boolean))];
  const regimes = [...new Set(MASTER_TRACKABLE_CATALOG.map(m => m.regime).filter(Boolean))];
  const objectTypes = [...new Set(MASTER_TRACKABLE_CATALOG.map(m => m.objectType).filter(Boolean))];
  const agencies = [...new Set(MASTER_TRACKABLE_CATALOG.map(m => m.agency).filter(Boolean))];
  const statuses = [...new Set(MASTER_TRACKABLE_CATALOG.map(m => m.status).filter(Boolean))];

  res.json({
    ok: true,
    data: {
      totalObjects: MASTER_TRACKABLE_CATALOG.length,
      categories,
      regimes,
      objectTypes,
      agencies,
      statuses
    }
  });
});

objectsRouter.get('/objects', (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const data = MASTER_TRACKABLE_CATALOG.slice(0, limit);
  res.json({ ok: true, meta: { total: MASTER_TRACKABLE_CATALOG.length, count: data.length }, data });
});

// GET /api/v1/catalog - Returns master trackable catalogue & curated NASA Eyes featured story tours
objectsRouter.get('/v1/catalog', (req, res) => {
  res.json({
    ok: true,
    total: MASTER_TRACKABLE_CATALOG.length,
    catalog: MASTER_TRACKABLE_CATALOG,
    featured_stories: [
      {
        id: 'artemis_ii',
        title: 'Artemis II Mission',
        subtitle: 'Lunar Free-Return Trajectory',
        slides: [
          { title: 'Earth Departure', desc: 'Orion spacecraft translunar injection.', target: 'earth', dist: 4.8 },
          { title: 'Lunar Flyby', desc: 'Passage around the lunar farside before returning to Earth.', target: 'moon', dist: 2.2 }
        ]
      },
      {
        id: 'voyager_grand_tour',
        title: 'Voyager Grand Tour',
        subtitle: 'Outer Planets Exploration',
        slides: [
          { title: 'Jupiter Encounter', desc: 'Gravitational slingshot past Jupiter in 1979.', target: 'jupiter', dist: 6.5 },
          { title: 'Saturn Flyby', desc: 'Close examination of the rings and Titan.', target: 'saturn', dist: 5.8 }
        ]
      },
      {
        id: 'chandrayaan3_landing',
        title: 'Chandrayaan-3 Lunar Landing',
        subtitle: 'Historic South Pole Landing',
        slides: [
          { title: 'Earth-Bound Phase', desc: 'Orbit raising maneuvers around Earth.', target: 'earth', dist: 5.0 },
          { title: 'Lunar Landing', desc: 'Soft landing near lunar south polar terrain.', target: 'moon', dist: 1.8 }
        ]
      }
    ]
  });
});

objectsRouter.get('/objects/:id', (req, res) => {
  const item = MASTER_TRACKABLE_CATALOG.find(m => m.id.toLowerCase() === req.params.id.toLowerCase());
  if (!item) return res.status(404).json({ ok: false, error: 'Object not found' });
  res.json({ ok: true, data: item });
});

objectsRouter.get('/objects/:id/state', (req, res) => {
  const item = MASTER_TRACKABLE_CATALOG.find(m => m.id.toLowerCase() === req.params.id.toLowerCase());
  if (!item) return res.status(404).json({ ok: false, error: 'Object not found' });

  if (item.parent === 'earth') {
    const liveTelemetry = computeSatTelemetry(item);
    return res.json({
      ok: true,
      data: {
        id: item.id,
        name: item.name,
        status: item.status,
        norad: item.norad,
        role: item.role,
        agency: item.agency,
        telemetry: liveTelemetry
      }
    });
  }

  res.json({
    ok: true,
    data: {
      id: item.id,
      name: item.name,
      status: item.status,
      altitude: item.altitude,
      velocity: item.velocity,
      period: item.period,
      parent: item.parent,
      role: item.role,
      agency: item.agency
    }
  });
});

objectsRouter.get('/events', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, meta: { total: store.events?.length || 0 }, data: store.events || [] });
});

objectsRouter.get('/sources', (req, res) => {
  const store = getSpaceStore();
  res.json({
    ok: true,
    data: store.sources,
    providers: adapterRegistry.getAllMetadata()
  });
});

objectsRouter.get('/watchlist', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, data: store.watchlist || [] });
});

objectsRouter.put('/watchlist', async (req, res) => {
  const store = getSpaceStore();
  if (Array.isArray(req.body?.watchlist)) {
    store.watchlist = req.body.watchlist
      .filter(x => typeof x === 'string')
      .map(x => String(x).trim().toUpperCase())
      .slice(0, 100);
    await saveSpaceStore();
  }
  res.json({ ok: true, data: store.watchlist });
});

objectsRouter.post('/watchlist', async (req, res) => {
  const store = getSpaceStore();
  if (Array.isArray(req.body?.watchlist)) {
    store.watchlist = req.body.watchlist
      .filter(x => typeof x === 'string')
      .map(x => String(x).trim().toUpperCase())
      .slice(0, 100);
    await saveSpaceStore();
  }
  res.json({ ok: true, data: store.watchlist });
});

objectsRouter.post('/watchlist/add', async (req, res) => {
  const store = getSpaceStore();
  const id = String(req.body?.id || '').trim().toUpperCase();
  if (!id) return res.status(400).json({ ok: false, error: 'Missing object ID to add.' });
  if (!store.watchlist) store.watchlist = [];
  if (!store.watchlist.includes(id)) {
    store.watchlist.push(id);
    if (store.watchlist.length > 100) store.watchlist.shift();
    await saveSpaceStore();
  }
  res.json({ ok: true, count: store.watchlist.length, watchlist: store.watchlist });
});

objectsRouter.post('/watchlist/remove', async (req, res) => {
  const store = getSpaceStore();
  const id = String(req.body?.id || '').trim().toUpperCase();
  if (!id) return res.status(400).json({ ok: false, error: 'Missing object ID to remove.' });
  if (store.watchlist) {
    store.watchlist = store.watchlist.filter(x => x !== id);
    await saveSpaceStore();
  }
  res.json({ ok: true, count: store.watchlist.length, watchlist: store.watchlist });
});

objectsRouter.get('/alerts/history', (req, res) => {
  const store = getSpaceStore();
  const events = store.events || [];
  res.json({
    ok: true,
    count: events.length,
    events
  });
});

objectsRouter.get('/alert-settings', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, data: store.preferences });
});

objectsRouter.put('/alert-settings', async (req, res) => {
  const store = getSpaceStore();
  if (req.body && typeof req.body === 'object') {
    const p = req.body;
    if (typeof p.minElevation === 'number') store.preferences.minElevation = Math.max(5, Math.min(80, p.minElevation));
    if (typeof p.spaceWeatherKpThreshold === 'number') store.preferences.spaceWeatherKpThreshold = Math.max(1, Math.min(9, p.spaceWeatherKpThreshold));
    if (typeof p.enablePassAlerts === 'boolean') store.preferences.enablePassAlerts = p.enablePassAlerts;
    if (typeof p.enableStormAlerts === 'boolean') store.preferences.enableStormAlerts = p.enableStormAlerts;
    if (typeof p.observerName === 'string') store.preferences.observerName = String(p.observerName).slice(0, 50);
    await saveSpaceStore();
  }
  res.json({ ok: true, data: store.preferences });
});

objectsRouter.post('/alert-settings', async (req, res) => {
  const store = getSpaceStore();
  if (req.body && typeof req.body === 'object') {
    const p = req.body;
    if (typeof p.minElevation === 'number') store.preferences.minElevation = Math.max(5, Math.min(80, p.minElevation));
    if (typeof p.spaceWeatherKpThreshold === 'number') store.preferences.spaceWeatherKpThreshold = Math.max(1, Math.min(9, p.spaceWeatherKpThreshold));
    if (typeof p.enablePassAlerts === 'boolean') store.preferences.enablePassAlerts = p.enablePassAlerts;
    if (typeof p.enableStormAlerts === 'boolean') store.preferences.enableStormAlerts = p.enableStormAlerts;
    if (typeof p.observerName === 'string') store.preferences.observerName = String(p.observerName).slice(0, 50);
    await saveSpaceStore();
  }
  res.json({ ok: true, data: store.preferences });
});
