import { dataDistributionService, CHANNELS } from './data-distribution.js';

export function registerSseClient(req, res, initialData = {}) {
  let requestedChannels = [];
  try {
    const url = new URL(req.url, 'http://localhost');
    const chParam = url.searchParams.get('channels') || url.searchParams.get('channel');
    if (chParam) {
      requestedChannels = chParam.split(',').map(c => c.trim().toLowerCase());
    }
  } catch (_) {}

  dataDistributionService.registerSseClient(req, res, requestedChannels);
}

export function broadcastSse(payload) {
  dataDistributionService.broadcast(Object.values(CHANNELS), payload.type || 'SYSTEM_EVENT', payload);
}
