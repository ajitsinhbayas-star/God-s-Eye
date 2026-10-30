import { WebSocketServer, WebSocket } from 'ws';
import { providerRegistry } from '../supervisor/registry.js';
import { sentinelDiagnostics } from '../supervisor/diagnostics.js';
import { dataDistributionService, CHANNELS, EVENT_TYPES } from './data-distribution.js';

let wss = null;

export function initWebSocketServer(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    sentinelDiagnostics.recordWsConnection('CONNECT');

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Parse channel subscriptions from request URL e.g. /?channels=earth,alert
    let requestedChannels = [];
    try {
      const url = new URL(req.url, 'http://localhost');
      const chParam = url.searchParams.get('channels') || url.searchParams.get('channel');
      if (chParam) {
        requestedChannels = chParam.split(',').map(c => c.trim().toLowerCase());
      }
    } catch (_) {}

    // Register with data distribution service
    dataDistributionService.registerWsClient(ws, requestedChannels);

    ws.send(JSON.stringify({
      type: 'SENTINEL_INIT',
      status: 'ONLINE',
      providers: providerRegistry.getAllProviders(),
      timestamp: new Date().toISOString()
    }));

    ws.on('close', () => {
      sentinelDiagnostics.recordWsConnection('DISCONNECT');
    });

    ws.on('error', (err) => {
      sentinelDiagnostics.logEvent('WEBSOCKET', 'WARN', 'WebSocket client error: ' + err.message);
    });
  });

  // Keep-alive ping interval to clean up dropped connections every 30s
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
}

export function broadcastWs(data) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(payload); } catch (_) {}
    }
  });
}

export function closeWebSocketServer() {
  if (wss) {
    wss.close();
  }
}
