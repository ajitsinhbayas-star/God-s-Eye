import express from 'express';
import { MASTER_TRACKABLE_CATALOG } from '../config/catalog.js';
import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';

export const objectsRouter = express.Router();

objectsRouter.get('/objects', (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const data = MASTER_TRACKABLE_CATALOG.slice(0, limit);
  res.json({ ok: true, meta: { total: MASTER_TRACKABLE_CATALOG.length, count: data.length }, data });
});

objectsRouter.get('/objects/:id', (req, res) => {
  const item = MASTER_TRACKABLE_CATALOG.find(m => m.id.toLowerCase() === req.params.id.toLowerCase());
  if (!item) return res.status(404).json({ ok: false, error: 'Object not found' });
  res.json({ ok: true, data: item });
});

objectsRouter.get('/objects/:id/state', (req, res) => {
  const item = MASTER_TRACKABLE_CATALOG.find(m => m.id.toLowerCase() === req.params.id.toLowerCase());
  if (!item) return res.status(404).json({ ok: false, error: 'Object not found' });
  res.json({ ok: true, data: { id: item.id, name: item.name, status: item.status, altKm: item.altKm } });
});

objectsRouter.get('/events', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, meta: { total: store.events?.length || 0 }, data: store.events || [] });
});

objectsRouter.get('/sources', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, data: store.sources });
});

objectsRouter.get('/watchlist', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, data: store.watchlist });
});

objectsRouter.put('/watchlist', async (req, res) => {
  const store = getSpaceStore();
  if (Array.isArray(req.body?.watchlist)) {
    store.watchlist = req.body.watchlist.map(x => String(x).toUpperCase()).slice(0, 100);
    await saveSpaceStore();
  }
  res.json({ ok: true, data: store.watchlist });
});

objectsRouter.get('/alert-settings', (req, res) => {
  const store = getSpaceStore();
  res.json({ ok: true, data: store.preferences });
});

objectsRouter.put('/alert-settings', async (req, res) => {
  const store = getSpaceStore();
  if (req.body && typeof req.body === 'object') {
    Object.assign(store.preferences, req.body);
    await saveSpaceStore();
  }
  res.json({ ok: true, data: store.preferences });
});
