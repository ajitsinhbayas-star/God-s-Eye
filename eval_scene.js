import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
  let p = path.join(__dirname, 'public', req.url.split('?')[0]);
  if (req.url === '/' || req.url.startsWith('/?')) p = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    res.writeHead(200);
    fs.createReadStream(p).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(8095, async () => {
  const chrome = spawn('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:8095/index.html'
  ]);

  setTimeout(async () => {
    try {
      const res = await fetch('http://localhost:9229/json');
      const tabs = await res.json();
      const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER LOG]', msg.params.type, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
        }
      });

      setTimeout(() => {
        chrome.kill();
        server.close();
        process.exit(0);
      }, 4000);
    } catch(e) {
      console.error(e);
      chrome.kill();
      server.close();
      process.exit(1);
    }
  }, 1500);
});
