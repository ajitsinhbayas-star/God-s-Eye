import subprocess
import time
import json
import urllib.request
import os

html_dir = r'C:\Users\other\.gemini\antigravity\scratch\camera_viewer\public'
server = subprocess.Popen(['uv', 'run', 'python', '-m', 'http.server', '8091', '--directory', html_dir])
time.sleep(1)

chrome_path = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
chrome_proc = subprocess.Popen([
    chrome_path,
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:8091/index.html'
])
time.sleep(3)

try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9225/json').read().decode())
    ws_url = tabs[0]['webSocketDebuggerUrl']
    
    # Send CDP command via python
    import socket
    # We can use websocket or python script
    print('Tabs ready:', ws_url)
finally:
    chrome_proc.terminate()
    server.terminate()
