const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

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
}).listen(8092, async () => {
  const chrome = spawn('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:8092/index.html'
  ]);

  setTimeout(async () => {
    try {
      const res = await fetch('http://localhost:9226/json');
      const tabs = await res.json();
      const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
        
        const expr = `(function() {
          var out = {};
          out.activeTargetKey = typeof activeTargetKey !== 'undefined' ? activeTargetKey : 'undef';
          out.activeCosmicTier = typeof activeCosmicTier !== 'undefined' ? activeCosmicTier : 'undef';
          out.cameraPos = typeof camera !== 'undefined' ? [camera.position.x, camera.position.y, camera.position.z] : null;
          out.cameraTarget = typeof cameraTarget !== 'undefined' ? [cameraTarget.x, cameraTarget.y, cameraTarget.z] : null;
          out.targetCameraDistance = typeof targetCameraDistance !== 'undefined' ? targetCameraDistance : null;
          out.cameraDistance = typeof cameraDistance !== 'undefined' ? cameraDistance : null;
          out.cameraFar = typeof camera !== 'undefined' ? camera.far : null;
          out.cameraNear = typeof camera !== 'undefined' ? camera.near : null;
          out.sceneChildrenCount = typeof scene !== 'undefined' ? scene.children.length : 0;
          out.mercuryPos = (typeof planetMeshes !== 'undefined' && planetMeshes.mercury) ? planetMeshes.mercury.group.position : null;
          out.sunMeshPos = typeof sunMesh !== 'undefined' ? sunMesh.position : null;
          out.sunVisible = typeof sunMesh !== 'undefined' ? sunMesh.visible : null;
          out.sunGlowScale = typeof coronaMesh !== 'undefined' ? coronaMesh.scale : null;
          return JSON.stringify(out);
        })()`;

        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: { expression: expr }
        }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('>>> EXCEPTION:', JSON.stringify(msg.params.exceptionDetails));
        } else if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
          console.error('>>> CONSOLE ERROR:', msg.params.message.text);
        } else if (msg.id === 10) {
          console.log('>>> STATE:', msg.params?.result?.value);
        }
      });

      setTimeout(() => {
        chrome.kill();
        server.close();
        process.exit(0);
      }, 3500);
    } catch(e) {
      console.error(e);
      chrome.kill();
      server.close();
      process.exit(1);
    }
  }, 2000);
});
