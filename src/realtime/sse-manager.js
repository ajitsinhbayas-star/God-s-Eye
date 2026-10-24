const sseClients = new Set();

export function registerSseClient(req, res, initialData = {}) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ...initialData })}\n\n`);
  sseClients.add(res);

  req.on('close', () => { sseClients.delete(res); });
}

export function broadcastSse(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}
