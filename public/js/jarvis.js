/**
 * ============================================================================
 * GOD'S EYE — J.A.R.V.I.S. ADVANCED TACTICAL AI & ORBITAL INTELLIGENCE SYSTEM
 * Conforming to God's Eye J.A.R.V.I.S. AI Assistant Blueprint
 * Button Style: Iron Man 2/3 Triangular Vibranium Arc Reactor Core
 * Engineered by Mr. Singh
 * ============================================================================
 */
(function () {
  function mountJarvis() {
    if (document.getElementById('jarvis-root')) return;

    // --- 1. Memory, State & Context Management ---
    const session = {
      isOpen: false,
      voiceEnabled: localStorage.getItem('jarvis_voice_muted') !== 'true',
      isListening: false,
      neuralState: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'
      lastTrackedObject: 'ISS',
      activeLocation: (function() {
        try {
          const l = JSON.parse(localStorage.getItem('orbital_observer_location_v2'));
          return l?.name || 'Pune, India';
        } catch (_) { return 'Pune, India'; }
      })(),
      recognition: null,
      wavePhase: 0,
      currentPath: window.location.pathname.toLowerCase()
    };

    // --- 2. Iron Man 2/3 Vibranium Arc Reactor Keyframes & UI CSS ---
    const style = document.createElement('style');
    style.id = 'jarvis-vibranium-core-styles';
    style.innerHTML = `
      @keyframes arc-spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes arc-spin-ccw { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
      @keyframes arc-vibranium-pulse {
        0%, 100% { filter: drop-shadow(0 0 10px #00f0ff) drop-shadow(0 0 22px rgba(0, 240, 255, 0.65)); transform: scale(1); }
        50% { filter: drop-shadow(0 0 18px #38bdf8) drop-shadow(0 0 36px rgba(56, 189, 248, 0.95)); transform: scale(1.04); }
      }
      @keyframes arc-speaking-glow {
        0%, 100% { filter: drop-shadow(0 0 14px #38bdf8) drop-shadow(0 0 30px #00f0ff); transform: scale(1.02); }
        50% { filter: drop-shadow(0 0 28px #38bdf8) drop-shadow(0 0 50px #38bdf8); transform: scale(1.08); }
      }
      .arc-speaking-active { animation: arc-speaking-glow 0.6s infinite ease-in-out !important; }
      .arc-listening-active { filter: drop-shadow(0 0 24px #ef4444) drop-shadow(0 0 45px #ef4444) !important; }
      #jarvis-hud-panel ::-webkit-scrollbar { width: 5px; }
      #jarvis-hud-panel ::-webkit-scrollbar-track { background: rgba(3, 7, 18, 0.6); }
      #jarvis-hud-panel ::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.4); border-radius: 4px; }
      #jarvis-hud-panel ::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.8); }
      .jarvis-chip-btn {
        background: rgba(0, 240, 255, 0.08);
        border: 1px solid rgba(0, 240, 255, 0.35);
        color: #38bdf8;
        font-size: 10px;
        border-radius: 12px;
        padding: 3px 9px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
      }
      .jarvis-chip-btn:hover {
        background: rgba(0, 240, 255, 0.22) !important;
        border-color: #00f0ff !important;
        color: #fff !important;
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
      }
      .jarvis-action-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 6px;
        margin-right: 6px;
        padding: 4px 10px;
        border-radius: 8px;
        background: rgba(0, 240, 255, 0.15);
        border: 1px solid rgba(0, 240, 255, 0.5);
        color: #00f0ff;
        font-size: 10px;
        font-weight: 700;
        font-family: monospace;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
      }
      .jarvis-action-pill:hover {
        background: #00f0ff;
        color: #030712;
        box-shadow: 0 0 14px rgba(0, 240, 255, 0.6);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);

    // --- 3. DOM Component Structure ---
    const root = document.createElement('div');
    root.id = 'jarvis-root';
    root.style.cssText = 'position:fixed; bottom:26px; right:20px; z-index:999999; font-family:"Courier New", monospace; pointer-events:auto; select-none;';

    root.innerHTML = `
      <!-- Iron Man 2/3 Triangular Vibranium Arc Reactor Button -->
      <div id="jarvis-arc-button" title="Initiate J.A.R.V.I.S. Orbital Command" style="width:62px; height:62px; border-radius:50%; background:radial-gradient(circle, #02121f 10%, #030712 90%); border:2px solid rgba(0, 240, 255, 0.7); cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center; box-shadow:0 0 24px rgba(0, 240, 255, 0.55); animation:arc-vibranium-pulse 3s infinite; transition:transform 0.25s ease;">
        
        <!-- Outer Rotating Notched Segment Ring -->
        <svg style="position:absolute; inset:-4px; width:66px; height:66px; pointer-events:none; animation:arc-spin-cw 16s linear infinite;" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0, 240, 255, 0.4)" stroke-width="2.5" stroke-dasharray="10 6 16 6" />
          <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(56, 189, 248, 0.7)" stroke-width="1.5" stroke-dasharray="4 8" />
        </svg>

        <!-- Inner Counter-Rotating Heat Vents -->
        <svg style="position:absolute; inset:2px; width:54px; height:54px; pointer-events:none; animation:arc-spin-ccw 8s linear infinite;" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#00f0ff" stroke-width="2.5" stroke-dasharray="18 10" opacity="0.8" />
          <circle cx="50" cy="50" r="33" fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="6 6" />
        </svg>

        <!-- Central Vibranium Triangular Power Core -->
        <svg style="width:34px; height:34px; filter:drop-shadow(0 0 7px #00f0ff);" viewBox="0 0 100 100">
          <polygon points="50,14 88,82 12,82" fill="none" stroke="#00f0ff" stroke-width="5" stroke-linejoin="round" />
          <polygon points="50,30 76,76 24,76" fill="rgba(0, 240, 255, 0.45)" stroke="#e0faff" stroke-width="3" stroke-linejoin="round" />
          <polygon points="50,44 64,70 36,70" fill="#ffffff" opacity="0.95" />
          <line x1="50" y1="14" x2="50" y2="30" stroke="#00f0ff" stroke-width="3" />
          <line x1="88" y1="82" x2="76" y2="76" stroke="#00f0ff" stroke-width="3" />
          <line x1="12" y1="82" x2="24" y2="76" stroke="#00f0ff" stroke-width="3" />
        </svg>

        <!-- Online Badge -->
        <div style="position:absolute; top:-2px; right:-2px; width:10px; height:10px; border-radius:50%; background:#10b981; border:2px solid #030712; box-shadow:0 0 8px #10b981;"></div>
      </div>

      <!-- Holographic Tactical HUD Terminal Panel -->
      <div id="jarvis-hud-panel" style="display:none; position:fixed; bottom:98px; right:20px; width:410px; max-width:calc(100vw - 32px); height:560px; max-height:calc(100vh - 120px); background:rgba(3, 7, 18, 0.96); backdrop-filter:blur(24px); border:1px solid rgba(0, 240, 255, 0.5); border-radius:16px; box-shadow:0 0 50px rgba(0,0,0,0.95), 0 0 30px rgba(0, 240, 255, 0.25); flex-direction:column; overflow:hidden;">
        
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:rgba(15, 23, 42, 0.95); border-bottom:1px solid rgba(0, 240, 255, 0.3);">
          <div style="display:flex; align-items:center; gap:9px;">
            <div id="jarvis-status-led" style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></div>
            <div>
              <div style="font-size:12px; font-weight:800; color:#fff; letter-spacing:0.12em; display:flex; align-items:center; gap:6px;">
                <span>J.A.R.V.I.S. TACTICAL AI</span>
                <span style="font-size:8px; background:rgba(0, 240, 255, 0.2); color:#00f0ff; border:1px solid rgba(0, 240, 255, 0.4); padding:1px 5px; border-radius:4px; font-weight:700;">V4.2</span>
              </div>
              <div style="font-size:9px; color:#38bdf8;">ORBITAL SUPERVISOR // ENGINEERED BY MR. SINGH</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="jarvis-mute-btn" class="jarvis-chip-btn" style="padding:2px 7px;">${session.voiceEnabled ? 'VOICE: ON' : 'VOICE: OFF'}</button>
            <button id="jarvis-clear-btn" title="Clear Dialogue Stream" class="jarvis-chip-btn" style="padding:2px 6px;">🗑️</button>
            <button id="jarvis-close-btn" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px; line-height:1;">✕</button>
          </div>
        </div>

        <!-- Real-Time Neural Oscilloscope Canvas -->
        <div style="padding:8px 12px 0 12px; background:rgba(0,0,0,0.5);">
          <canvas id="jarvis-oscilloscope" width="384" height="38" style="width:100%; height:38px; display:block; border-radius:6px; background:rgba(3,7,18,0.75); border:1px solid rgba(0, 240, 255, 0.25);"></canvas>
        </div>

        <!-- Dynamic Quick Chips Strip -->
        <div style="display:flex; gap:6px; padding:8px 10px; overflow-x:auto; background:rgba(0,0,0,0.4); border-bottom:1px solid rgba(255,255,255,0.06);">
          <button class="jarvis-chip-btn" data-query="Track the International Space Station and show live metrics.">🛰️ Track ISS</button>
          <button class="jarvis-chip-btn" data-query="Calculate satellite passes over my active ground station tonight.">📍 Station Passes</button>
          <button class="jarvis-chip-btn" data-query="Take me to live atmosphere Doppler radar and precipitation view.">🌀 Atmosphere</button>
          <button class="jarvis-chip-btn" data-query="Report status on active ISRO satellites and Chandrayaan missions.">🚀 ISRO Fleet</button>
          <button class="jarvis-chip-btn" data-query="Show Near-Earth Asteroid close passes and CNEOS planetary defense.">☄️ Asteroids 3D</button>
          <button class="jarvis-chip-btn" data-query="Where is the James Webb Space Telescope and Voyager probes?">🌌 Deep Space</button>
          <button class="jarvis-chip-btn" data-query="What is the current solar radiation flux and space weather index?">☀️ Solar Weather</button>
          <button class="jarvis-chip-btn" data-query="Open Sentinel Mission Control admin deck.">🛡️ Admin Console</button>
        </div>

        <!-- Telemetry & Dialogue Comms Stream -->
        <div id="jarvis-stream" style="flex:1; padding:12px; overflow-y:auto; font-size:11px; line-height:1.6; display:flex; flex-direction:column; gap:10px; color:#cbd5e1;">
          <div style="align-self:flex-start; max-width:94%; background:rgba(0, 240, 255, 0.08); border-left:3px solid #00f0ff; padding:9px 12px; border-radius:0 10px 10px 0;">
            <div style="font-weight:bold; color:#00f0ff; margin-bottom:2px;">J.A.R.V.I.S. Core Online:</div>
            At your command, Sir. Arc Reactor power nominal. Telemetry sensors synchronized across Solar System, Earth LEO, Doppler Atmosphere, Asteroid defense, and Deep Space probes. How may I assist you today?
          </div>
        </div>

        <!-- Voice & Command Input Dock -->
        <div style="padding:10px 12px; background:rgba(15, 23, 42, 0.95); border-top:1px solid rgba(0,240,255,0.25); display:flex; align-items:center; gap:8px;">
          <button id="jarvis-mic-btn" title="Click to Speak Voice Command" style="background:rgba(0,240,255,0.15); border:1px solid #00f0ff; border-radius:8px; color:#00f0ff; padding:7px 11px; cursor:pointer; font-size:14px; transition:all 0.2s;">🎙️</button>
          <input id="jarvis-input" type="text" placeholder="Instruct J.A.R.V.I.S. (e.g. 'Track ISS', 'Show Atmosphere', 'Pune Passes')..." style="flex:1; background:rgba(0,0,0,0.65); border:1px solid rgba(0,240,255,0.35); border-radius:8px; color:#fff; font-family:monospace; font-size:11px; padding:8px 12px; outline:none; transition:border 0.2s;" />
          <button id="jarvis-exec-btn" style="background:#00f0ff; border:none; border-radius:8px; color:#030712; font-weight:800; font-family:monospace; font-size:11px; padding:8px 14px; cursor:pointer; transition:all 0.2s; box-shadow:0 0 10px rgba(0,240,255,0.4);">EXEC</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // --- 4. Wire Handlers & Oscilloscope ---
    const orb = document.getElementById('jarvis-arc-button');
    const panel = document.getElementById('jarvis-hud-panel');
    const input = document.getElementById('jarvis-input');
    const stream = document.getElementById('jarvis-stream');
    const micBtn = document.getElementById('jarvis-mic-btn');
    const muteBtn = document.getElementById('jarvis-mute-btn');
    const clearBtn = document.getElementById('jarvis-clear-btn');
    const closeBtn = document.getElementById('jarvis-close-btn');
    const canvas = document.getElementById('jarvis-oscilloscope');
    const ctx = canvas.getContext('2d');

    // Oscilloscope Animation Loop
    function runOscilloscope() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width, h = canvas.height, midY = h / 2;

      let freq = 0.04, amp = 4, col = 'rgba(0, 240, 255, 0.45)';
      if (session.neuralState === 'listening') { freq = 0.08; amp = 14; col = '#ef4444'; }
      else if (session.neuralState === 'thinking') { freq = 0.12; amp = 10; col = '#f59e0b'; }
      else if (session.neuralState === 'speaking') { freq = 0.09; amp = 16; col = '#38bdf8'; }

      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = col;
      for (let x = 0; x < w; x++) {
        const y = midY + Math.sin(x * freq + session.wavePhase) * amp * Math.sin((x / w) * Math.PI);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 1; i <= 6; i++) {
        const nx = (w / 7) * i;
        const ny = midY + Math.sin(nx * freq + session.wavePhase) * amp * Math.sin((nx / w) * Math.PI);
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
      session.wavePhase += 0.08;
      requestAnimationFrame(runOscilloscope);
    }
    requestAnimationFrame(runOscilloscope);

    // Toggle HUD Panel
    function togglePanel() {
      session.isOpen = !session.isOpen;
      panel.style.display = session.isOpen ? 'flex' : 'none';
      if (session.isOpen) {
        input.focus();
        stream.scrollTop = stream.scrollHeight;
      }
    }
    orb.onclick = togglePanel;
    closeBtn.onclick = togglePanel;

    // Clear dialogue stream
    clearBtn.onclick = () => {
      stream.innerHTML = `
        <div style="align-self:flex-start; max-width:94%; background:rgba(0, 240, 255, 0.08); border-left:3px solid #00f0ff; padding:8px 12px; border-radius:0 10px 10px 0;">
          Dialogue stream refreshed, Sir. Sensors operational.
        </div>
      `;
    };

    // Voice Mute Toggle
    muteBtn.onclick = () => {
      session.voiceEnabled = !session.voiceEnabled;
      localStorage.setItem('jarvis_voice_muted', (!session.voiceEnabled).toString());
      muteBtn.innerText = session.voiceEnabled ? 'VOICE: ON' : 'VOICE: OFF';
      muteBtn.style.color = session.voiceEnabled ? '#38bdf8' : '#ef4444';
      if (!session.voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
    };

    // Quick Chips Handlers
    document.querySelectorAll('.jarvis-chip-btn').forEach(b => {
      b.onclick = () => {
        input.value = b.getAttribute('data-query');
        processUserQuery();
      };
    });

    // Voice Synthesis (TTS)
    function speak(text) {
      if (!session.voiceEnabled || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      // Clean HTML tags and markdown symbols before speaking
      const plainSpeech = text.replace(/<[^>]*>/g, '').replace(/[*_#`~→↗]/g, ' ').replace(/\s+/g, ' ').trim();
      const utt = new SpeechSynthesisUtterance(plainSpeech);
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find(v => v.lang === 'en-GB' || v.name.includes('UK') || v.name.includes('British') || v.name.includes('George')) ||
                      voices.find(v => v.lang.startsWith('en'));
      if (ukVoice) utt.voice = ukVoice;
      utt.pitch = 0.95;
      utt.rate = 1.05;

      utt.onstart = () => {
        session.neuralState = 'speaking';
        orb.classList.add('arc-speaking-active');
      };
      utt.onend = () => {
        session.neuralState = 'idle';
        orb.classList.remove('arc-speaking-active');
      };
      utt.onerror = () => {
        session.neuralState = 'idle';
        orb.classList.remove('arc-speaking-active');
      };
      window.speechSynthesis.speak(utt);
    }

    // Voice Input (STT)
    function toggleMicrophone() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        alert('Voice speech recognition requires Chrome, Edge, or Safari.');
        return;
      }
      if (!session.recognition) {
        session.recognition = new SR();
        session.recognition.continuous = false;
        session.recognition.interimResults = false;
        session.recognition.lang = 'en-US';

        session.recognition.onstart = () => {
          session.isListening = true;
          session.neuralState = 'listening';
          micBtn.style.background = '#ef4444';
          micBtn.style.color = '#fff';
          orb.classList.add('arc-listening-active');
        };
        session.recognition.onresult = (e) => {
          input.value = e.results[0][0].transcript;
          processUserQuery();
        };
        const resetMic = () => {
          session.isListening = false;
          if (session.neuralState === 'listening') session.neuralState = 'idle';
          micBtn.style.background = 'rgba(0, 240, 255, 0.15)';
          micBtn.style.color = '#00f0ff';
          orb.classList.remove('arc-listening-active');
        };
        session.recognition.onerror = resetMic;
        session.recognition.onend = resetMic;
      }

      if (session.isListening) session.recognition.stop();
      else session.recognition.start();
    }
    micBtn.onclick = toggleMicrophone;

    // Execute User Query
    input.onkeydown = (e) => { if (e.key === 'Enter') processUserQuery(); };
    document.getElementById('jarvis-exec-btn').onclick = processUserQuery;

    // --- 5. COMPREHENSIVE SPACE & ORBITAL INTELLIGENCE ENGINE ---
    async function processUserQuery() {
      const rawText = input.value.trim();
      if (!rawText) return;

      session.neuralState = 'thinking';
      input.value = '';

      // Append User Bubble
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'align-self:flex-end; max-width:85%; background:rgba(0, 240, 255, 0.15); border:1px solid rgba(0, 240, 255, 0.4); border-radius:10px 10px 0 10px; padding:8px 12px; color:#fff; word-break:break-word;';
      userBubble.innerText = rawText;
      stream.appendChild(userBubble);

      // Append Bot Bubble (Consulting status)
      const botBubble = document.createElement('div');
      botBubble.style.cssText = 'align-self:flex-start; max-width:94%; background:rgba(0, 240, 255, 0.08); border-left:3px solid #00f0ff; padding:9px 12px; border-radius:0 10px 10px 0; color:#00f0ff; font-style:italic; line-height:1.6;';
      botBubble.innerText = 'Calculating orbital telemetry & intelligence vectors, Sir...';
      stream.appendChild(botBubble);
      stream.scrollTop = stream.scrollHeight;

      // Pronoun / follow-up resolution
      let query = rawText;
      if (/\b(it|its|this|that|track it|show it|tell me more)\b/i.test(query)) {
        query += ` (context: ${session.lastTrackedObject})`;
      }

      const q = query.toUpperCase();
      let answer = '';
      let actions = [];

      // Attempt backend AI & live telemetry query first
      let backendReply = null;
      try {
        const aiResp = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query }),
          signal: AbortSignal.timeout(6000)
        });
        if (aiResp.ok) {
          const aiJson = await aiResp.json();
          if (aiJson && aiJson.reply) {
            backendReply = aiJson.reply;
          }
        }
      } catch (_) {}

      // Contextual Action Pills & Telemetry Mapping
      if (q.includes('ISS') || q.includes('SPACE STATION') || q.includes('ZARYA') || q.includes('TIANGONG')) {
        session.lastTrackedObject = 'ISS';
        actions.push({ label: '🛰️ Lock ISS in Earth Orbit', type: 'FOCUS_ISS' });
        actions.push({ label: '🔔 Check Local ISS Passes', type: 'NAV_ALERT', hash: 'passes' });
      } else if (q.includes('ATMOSPHERE') || q.includes('WEATHER') || q.includes('RADAR') || q.includes('PRECIPITATION') || q.includes('CYCLONE') || q.includes('RAIN') || q.includes('WIND') || q.includes('HURRICANE')) {
        actions.push({ label: '🌀 Open Atmosphere Radar', type: 'NAV_WEATHER' });
        actions.push({ label: '🌧️ Precipitation Analysis', type: 'NAV_WEATHER', hash: 'precipitation' });
      } else if (q.includes('ASTEROID') || q.includes('CNEOS') || q.includes('BENNU') || q.includes('APOPHIS') || q.includes('DEFENSE') || q.includes('METEOR') || q.includes('COLLISION')) {
        session.lastTrackedObject = 'Asteroids';
        actions.push({ label: '☄️ Launch 3D Asteroids', type: 'NAV_ASTEROIDS' });
        actions.push({ label: '🔭 View CNEOS Pass Table', type: 'NAV_ALERT', hash: 'nea' });
      } else if (q.includes('SOLAR SYSTEM') || q.includes('SUN') || q.includes('MARS') || q.includes('JUPITER') || q.includes('SATURN') || q.includes('VENUS') || q.includes('MERCURY') || q.includes('MOON')) {
        session.lastTrackedObject = 'Solar System';
        actions.push({ label: '☀️ Explore Solar System 3D', type: 'NAV_SOLAR' });
        actions.push({ label: '🪐 Planets Visible Tonight', type: 'NAV_ALERT', hash: 'planets' });
      } else if (q.includes('DEEP SPACE') || q.includes('VOYAGER') || q.includes('JWST') || q.includes('JAMES WEBB') || q.includes('GALAXY') || q.includes('NEBULA') || q.includes('CIGAR') || q.includes('M82')) {
        session.lastTrackedObject = 'Deep Space';
        actions.push({ label: '🌌 Launch Deep Space View', type: 'NAV_DEEPSPACE' });
        actions.push({ label: '📡 NASA DSN Live Antennas', type: 'NAV_ALERT', hash: 'dsn' });
      } else if (q.includes('ISRO') || q.includes('CHANDRAYAAN') || q.includes('ADITYA') || q.includes('CARTOSAT') || q.includes('GAGANYAAN') || q.includes('MOM') || q.includes('MANGALYAAN')) {
        session.lastTrackedObject = 'ISRO Fleet';
        actions.push({ label: '🌍 View ISRO Assets in LEO', type: 'NAV_EARTH' });
        actions.push({ label: '☀️ View Aditya-L1 at L1', type: 'NAV_SOLAR', hash: 'aditya_l1' });
      } else if (q.includes('PUNE') || q.includes('PASS') || q.includes('STATION') || q.includes('LOCATION') || q.includes('OVERHEAD') || q.includes('TONIGHT')) {
        actions.push({ label: '📍 Change Observation Station', type: 'OPEN_LOCATION_MODAL' });
        actions.push({ label: '🔔 Topocentric Sky Radar', type: 'NAV_ALERT', hash: 'passes' });
      } else if (q.includes('ADMIN') || q.includes('SENTINEL') || q.includes('DAEMON') || q.includes('CONTROL') || q.includes('TELEMETRY') || q.includes('PIPELINE') || q.includes('LOGIN')) {
        actions.push({ label: '🛡️ Open Sentinel Mission Control', type: 'NAV_SENTINEL' });
      } else {
        actions.push({ label: '☀️ Solar System', type: 'NAV_SOLAR' });
        actions.push({ label: '🌍 Earth Orbit', type: 'NAV_EARTH' });
        actions.push({ label: '🌀 Atmosphere', type: 'NAV_WEATHER' });
        actions.push({ label: '☄️ Asteroids', type: 'NAV_ASTEROIDS' });
      }

      if (backendReply) {
        answer = backendReply;
      } else {
        // High-fidelity fallback when offline
        if (q.includes('ISS') || q.includes('SPACE STATION')) {
          answer = `I have locked onto the <b>International Space Station (ZARYA)</b>.<br>
          • Altitude: ~418 km (LEO)<br>
          • Orbital Speed: 27,600 km/h (7.66 km/s)<br>
          • Inclination: 51.64° | Period: ~92.9 minutes<br>
          Centering camera and plotting its live ground-track swath now, Sir.`;
        } else if (q.includes('ATMOSPHERE') || q.includes('WEATHER') || q.includes('RADAR')) {
          answer = `Accessing our <b>Atmospheric & Meteorological Viewport</b>.<br>
          Features multi-source RainViewer Doppler radar mosaics, zoom-adaptive precipitation analysis, NASA FIRMS active fire hotspots, and real-time tropical cyclone forecast cones.`;
        } else if (q.includes('ASTEROID') || q.includes('CNEOS') || q.includes('BENNU') || q.includes('APOPHIS')) {
          answer = `Monitoring NASA CNEOS Near-Earth Objects (NEOs).<br>
          • Asteroid <b>99942 Apophis</b> (~340m diameter) will have a safe close flyby within geostationary distance on April 13, 2029.<br>
          • Asteroid <b>101955 Bennu</b> is monitored under NASA planetary defense protocols.<br>
          No hazardous impact trajectories detected within standard observation horizons, Sir.`;
        } else if (q.includes('ISRO') || q.includes('CHANDRAYAAN') || q.includes('ADITYA')) {
          answer = `Tracking the <b>ISRO Space Exploration Fleet</b>:<br>
          • <b>Chandrayaan-3</b>: Historic south-polar lunar landing mission.<br>
          • <b>Aditya-L1</b>: India's premier solar observatory operating at Sun-Earth L1.<br>
          • <b>Cartosat-3 & EOS-04</b>: High-resolution optical and synthetic aperture radar imaging in sun-synchronous orbits.<br>
          • <b>Gaganyaan</b>: Orbital crewed test configuration underway.`;
        } else {
          answer = `Greetings, Sir. Orbital telemetry is nominal. SGP4 propagation and atmospheric Doppler feeds are synchronizing continuously across all orbital viewports.`;
        }
      }

      // Render Bot Bubble with Interactive Action Buttons
      botBubble.style.fontStyle = 'normal';
      botBubble.style.color = '#cbd5e1';
      botBubble.innerHTML = `<div>${answer}</div>`;

      if (actions.length > 0) {
        const actCont = document.createElement('div');
        actCont.style.cssText = 'margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;';
        actions.forEach(act => {
          const btn = document.createElement('button');
          btn.className = 'jarvis-action-pill';
          btn.innerHTML = act.label;
          btn.onclick = () => dispatchAction(act.type, act.hash);
          actCont.appendChild(btn);
        });
        botBubble.appendChild(actCont);
      }

      speak(answer);
      stream.scrollTop = stream.scrollHeight;
    }

      // Render Bot Bubble with Interactive Action Buttons
      botBubble.style.fontStyle = 'normal';
      botBubble.style.color = '#cbd5e1';
      botBubble.innerHTML = `<div>${answer}</div>`;

      if (actions.length > 0) {
        const actCont = document.createElement('div');
        actCont.style.cssText = 'margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;';
        actions.forEach(act => {
          const btn = document.createElement('button');
          btn.className = 'jarvis-action-pill';
          btn.innerHTML = act.label;
          btn.onclick = () => dispatchAction(act.type, act.hash);
          actCont.appendChild(btn);
        });
        botBubble.appendChild(actCont);
      }

      speak(answer);
      stream.scrollTop = stream.scrollHeight;
    }

    // --- 6. Tactical Action Dispatcher & Cross-Page Teleporter ---
    function dispatchAction(action, hash = '') {
      console.log('[J.A.R.V.I.S. ACTION DISPATCH]:', action, hash);
      const isFile = window.location.protocol === 'file:';

      function navigateTo(targetHtml, targetPath) {
        const dest = isFile ? targetHtml : targetPath;
        const url = hash ? `${dest}#/${hash}` : dest;
        window.location.href = url;
      }

      switch (action) {
        case 'NAV_SOLAR':
          if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            navigateTo('index.html', '/');
          } else if (hash) {
            window.location.hash = `#/${hash}`;
          }
          break;

        case 'NAV_EARTH':
          if (!window.location.pathname.includes('earth.html')) {
            navigateTo('earth.html', '/earth');
          } else if (hash) {
            window.location.hash = `#/${hash}`;
          }
          break;

        case 'NAV_WEATHER':
          if (!window.location.pathname.includes('weather.html')) {
            navigateTo('weather.html', '/weather');
          } else if (hash && typeof window.setLayerMode === 'function') {
            window.setLayerMode(hash);
          }
          break;

        case 'NAV_ASTEROIDS':
          if (!window.location.pathname.includes('asteroids.html')) {
            navigateTo('asteroids.html', '/asteroids');
          } else if (hash && typeof window.selectAsteroid === 'function') {
            window.selectAsteroid(hash);
          }
          break;

        case 'NAV_DEEPSPACE':
          if (!window.location.pathname.includes('deepspace.html')) {
            navigateTo('deepspace.html', '/deepspace');
          } else if (hash) {
            window.location.hash = `#/${hash}`;
          }
          break;

        case 'NAV_ALERT':
          if (!window.location.pathname.includes('orbitalert.html')) {
            navigateTo('orbitalert.html', '/orbitalert');
          } else if (hash && typeof window.switchMainTab === 'function') {
            window.switchMainTab(hash);
          }
          break;

        case 'NAV_SENTINEL':
          navigateTo('sentinel.html', '/sentinel');
          break;

        case 'OPEN_LOCATION_MODAL':
          if (typeof window.openUniversalLocationModal === 'function') {
            window.openUniversalLocationModal();
          } else if (typeof window.openCityModal === 'function') {
            window.openCityModal();
          }
          break;

        case 'FOCUS_ISS':
          if (!window.location.pathname.includes('earth.html') && !window.location.pathname.endsWith('index.html')) {
            navigateTo('earth.html', '/earth');
          } else {
            const issBtn = document.querySelector('[data-target="iss"]') ||
                           document.getElementById('btn-track-iss') ||
                           document.querySelector('button[title*="ISS"]');
            if (issBtn) issBtn.click();
            else if (typeof window.setFocusTo === 'function') {
              window.setFocusTo('iss');
            }
          }
          break;
      }
    }

    window.JARVIS = {
      open: () => { if (!session.isOpen) togglePanel(); },
      close: () => { if (session.isOpen) togglePanel(); },
      query: (text) => {
        if (!session.isOpen) togglePanel();
        input.value = text;
        processUserQuery();
      },
      speak: speak,
      dispatch: dispatchAction
    };

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountJarvis);
  } else {
    mountJarvis();
  }
})();
