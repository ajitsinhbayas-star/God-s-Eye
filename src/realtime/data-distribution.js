/**
 * ORBITAL EYE — CENTRAL DATA DISTRIBUTION & REAL-TIME EVENT BUS
 * Selective, channel-based pub/sub routing to public viewports and Sentinel console.
 * Prevents redundant large broadcasts and provides immediate snapshots on connect.
 */
import { WebSocket } from 'ws';

export const CHANNELS = {
  HOME: 'home',
  SOLAR: 'solar',
  EARTH: 'earth',
  DEEPSPACE: 'deepspace',
  ASTEROIDS: 'asteroids',
  ATMOSPHERE: 'atmosphere',
  AIR_QUALITY: 'air-quality',
  ALERT: 'alert',
  SENTINEL: 'sentinel'
};

export const EVENT_TYPES = {
  SPACE_OBJECTS_UPDATED: 'SPACE_OBJECTS_UPDATED',
  SATELLITE_STATE_UPDATED: 'SATELLITE_STATE_UPDATED',
  ORBITAL_ELEMENTS_UPDATED: 'ORBITAL_ELEMENTS_UPDATED',
  DEEP_SPACE_STATE_UPDATED: 'DEEP_SPACE_STATE_UPDATED',
  ASTEROID_CATALOG_UPDATED: 'ASTEROID_CATALOG_UPDATED',
  SPACE_WEATHER_UPDATED: 'SPACE_WEATHER_UPDATED',
  WEATHER_UPDATED: 'WEATHER_UPDATED',
  RADAR_UPDATED: 'RADAR_UPDATED',
  CYCLONE_UPDATED: 'CYCLONE_UPDATED',
  DISTRICT_WEATHER_UPDATED: 'DISTRICT_WEATHER_UPDATED',
  AIR_QUALITY_UPDATED: 'AIR_QUALITY_UPDATED',
  AQI_STATION_UPDATED: 'AQI_STATION_UPDATED',
  MISSION_NEWS_UPDATED: 'MISSION_NEWS_UPDATED',
  PROVIDER_HEALTH_UPDATED: 'PROVIDER_HEALTH_UPDATED',
  WORKER_TELEMETRY_UPDATED: 'WORKER_TELEMETRY_UPDATED',
  SYSTEM_INCIDENT_CREATED: 'SYSTEM_INCIDENT_CREATED'
};

export class DataDistributionService {
  constructor() {
    this.wsClients = new Map(); // ws -> Set(channels)
    this.sseClients = new Map(); // res -> Set(channels)
    this.snapshots = new Map();  // channel -> latest snapshot data
    this.versions = new Map();   // channel -> version counter
  }

  /**
   * Registers a WebSocket client and assigns default or requested channels.
   */
  registerWsClient(ws, initialChannels = []) {
    const channelSet = new Set(initialChannels.length ? initialChannels : [CHANNELS.HOME]);
    this.wsClients.set(ws, channelSet);

    // Send immediate current snapshot for each requested channel
    for (const ch of channelSet) {
      this.sendSnapshotToWs(ws, ch);
    }

    ws.on('close', () => {
      this.wsClients.delete(ws);
    });

    ws.on('message', (msg) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (payload.action === 'subscribe' && Array.isArray(payload.channels)) {
          payload.channels.forEach(ch => {
            channelSet.add(ch);
            this.sendSnapshotToWs(ws, ch);
          });
        } else if (payload.action === 'unsubscribe' && Array.isArray(payload.channels)) {
          payload.channels.forEach(ch => channelSet.delete(ch));
        }
      } catch (_) {}
    });
  }

  /**
   * Registers an SSE client connection.
   */
  registerSseClient(req, res, initialChannels = []) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const channelSet = new Set(initialChannels.length ? initialChannels : [CHANNELS.HOME]);
    this.sseClients.set(res, channelSet);

    // Write initial greeting
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', channels: Array.from(channelSet), timestamp: new Date().toISOString() })}\n\n`);

    // Send snapshots
    for (const ch of channelSet) {
      const snap = this.snapshots.get(ch);
      if (snap) {
        res.write(`data: ${JSON.stringify({ type: 'SNAPSHOT', channel: ch, version: this.versions.get(ch) || 1, data: snap })}\n\n`);
      }
    }

    req.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Stores the latest validated data snapshot for a specific channel.
   */
  setSnapshot(channel, data) {
    this.snapshots.set(channel, data);
    const nextVer = (this.versions.get(channel) || 0) + 1;
    this.versions.set(channel, nextVer);
  }

  /**
   * Sends a snapshot to a single WebSocket client.
   */
  sendSnapshotToWs(ws, channel) {
    if (ws.readyState !== WebSocket.OPEN) return;
    const snap = this.snapshots.get(channel);
    if (snap) {
      ws.send(JSON.stringify({
        type: 'SNAPSHOT',
        channel,
        version: this.versions.get(channel) || 1,
        timestamp: new Date().toISOString(),
        data: snap
      }));
    }
  }

  /**
   * Broadcasts an event strictly to subscribers of the specified channels.
   */
  broadcast(targetChannels, eventType, payload = {}) {
    const channels = Array.isArray(targetChannels) ? targetChannels : [targetChannels];
    const messageObj = {
      type: eventType,
      channels,
      timestamp: new Date().toISOString(),
      payload
    };
    const messageStr = JSON.stringify(messageObj);

    // Update snapshots for the target channels
    channels.forEach(ch => this.setSnapshot(ch, payload));

    // WebSocket distribution
    for (const [ws, subscribedChannels] of this.wsClients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        const hasMatch = channels.some(ch => subscribedChannels.has(ch));
        if (hasMatch) {
          try { ws.send(messageStr); } catch (_) {}
        }
      }
    }

    // SSE distribution
    const sseFormatted = `data: ${messageStr}\n\n`;
    for (const [res, subscribedChannels] of this.sseClients.entries()) {
      const hasMatch = channels.some(ch => subscribedChannels.has(ch));
      if (hasMatch) {
        try { res.write(sseFormatted); } catch {
          this.sseClients.delete(res);
        }
      }
    }
  }

  getClientCounts() {
    return {
      wsTotal: this.wsClients.size,
      sseTotal: this.sseClients.size
    };
  }
}

export const dataDistributionService = new DataDistributionService();
