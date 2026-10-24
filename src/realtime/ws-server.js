import { WebSocketServer, WebSocket } from 'ws';
import { providerRegistry } from '../supervisor/registry.js';

let wss = null;

export function initWebSocketServer(server) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({
      type: 'SENTINEL_INIT',
      status: 'ONLINE',
      providers: providerRegistry.getAllProviders()
    }));
  });
  return wss;
}

export function broadcastWs(data) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) { client.send(payload); }
  });
}
