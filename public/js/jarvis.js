/**
 * GOD'S EYE — J.A.R.V.I.S. TACTICAL AI SYSTEM
 * Conforming to God's Eye JARVIS AI Assistant Blueprint
 * Button Style: Iron Man 2/3 Triangular Vibranium Arc Reactor
 * Engineered by Mr. Singh
 */
(function() {
  function mountJarvis() {
    if (document.getElementById('jarvis-root')) return;

    // --- 1. Memory & Session Context (Blueprint Module 4A & 4F) ---
    const session = {
      isOpen: false,
      voiceEnabled: true,
      isListening: false,
      neuralState: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'
      lastTrackedObject: 'ISS',
      lastLocation: 'Pune, Maharashtra',
      recognition: null,
      wavePhase: 0
    };

    // --- 2. Iron Man 2/3 Arc Reactor Animations & UI Styles ---
    const style = document.createElement('style');
    style.id = 'jarvis-vibranium-core-styles';
    style.innerHTML = `
      @keyframes arc-spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes arc-spin-ccw { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
      @keyframes arc-vibranium-pulse {
        0%, 100% { filter: drop-shadow(0 0 10px #00f0ff) drop-shadow(0 0 20px rgba(0, 240, 255, 0.6)); }
        50% { filter: drop-shadow(0 0 16px #38bdf8) drop-shadow(0 0 32px rgba(56, 189, 248, 0.9)); }
      }
      @keyframes arc-speaking-glow {
        0%, 100% { filter: drop-shadow(0 0 14px #38bdf8) drop-shadow(0 0 28px #00f0ff); transform: scale(1.02); }
        50% { filter: drop-shadow(0 0 26px #38bdf8) drop-shadow(0 0 45px #38bdf8); transform: scale(1.07); }
      }
      .arc-speaking-active { animation: arc-speaking-glow 0.6s infinite ease-in-out !important; }
      .arc-listening-active { filter: drop-shadow(0 0 22px #ef4444) drop-shadow(0 0 38px #ef4444) !important; }
      #jarvis-hud-panel ::-webkit-scrollbar { width: 4px; }
      #jarvis-hud-panel ::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.4); border-radius: 4px; }
      .jarvis-chip-btn:hover { background: rgba(0, 240, 255, 0.2) !important; border-color: #00f0ff !important; }
    `;
    document.head.appendChild(style);

    // --- 3. Inject DOM Components (Matches Uploaded Image Style) ---
    const root = document.createElement('div');
    root.id = 'jarvis-root';
    root.style.cssText = 'position:fixed; bottom:38px; right:20px; z-index:999999; font-family:"Courier New", monospace; pointer-events:auto;';

    root.innerHTML = `
      <!-- Iron Man 2/3 Triangular Vibranium Arc Reactor Button -->
      <div id="jarvis-arc-button" title="Initiate J.A.R.V.I.S. Command" style="width:62px; height:62px; border-radius:50%; background:radial-gradient(circle, #02121f 10%, #030712 90%); border:2px solid rgba(0, 240, 255, 0.7); cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center; box-shadow:0 0 22px rgba(0, 240, 255, 0.5); animation:arc-vibranium-pulse 3s infinite; transition:transform 0.25s ease;">
        
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

        <!-- Central Vibranium Triangular Power Core (Iron Man 2/3 Exact Geometry) -->
        <svg style="width:34px; height:34px; filter:drop-shadow(0 0 6px #00f0ff);" viewBox="0 0 100 100">
          <!-- Outer Chamfered Vibranium Triangle Frame -->
          <polygon points="50,14 88,82 12,82" fill="none" stroke="#00f0ff" stroke-width="5" stroke-linejoin="round" />
          <!-- Inner Radiant Glowing Inverted Triangle Core -->
          <polygon points="50,30 76,76 24,76" fill="rgba(0, 240, 255, 0.45)" stroke="#e0faff" stroke-width="3" stroke-linejoin="round" />
          <!-- Central Energy Emitter -->
          <polygon points="50,44 64,70 36,70" fill="#ffffff" opacity="0.95" />
          <!-- Radiating Power Conductors -->
          <line x1="50" y1="14" x2="50" y2="30" stroke="#00f0ff" stroke-width="3" />
          <line x1="88" y1="82" x2="76" y2="76" stroke="#00f0ff" stroke-width="3" />
          <line x1="12" y1="82" x2="24" y2="76" stroke="#00f0ff" stroke-width="3" />
        </svg>
      </div>

      <!-- Holographic Tactical HUD Terminal -->
      <div id="jarvis-hud-panel" style="display:none; position:fixed; bottom:110px; right:20px; width:390px; max-width:calc(100vw - 32px); height:530px; background:rgba(3, 7, 18, 0.95); backdrop-filter:blur(20px); border:1px solid rgba(0, 240, 255, 0.5); border-radius:14px; box-shadow:0 0 45px rgba(0,0,0,0.95), 0 0 25px rgba(0, 240, 255, 0.3); flex-direction:column; overflow:hidden;">
        
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(15, 23, 42, 0.95); border-bottom:1px solid rgba(0, 240, 255, 0.3);">
          <div style="display:flex; align-items:center; gap:8px;">
            <div id="jarvis-status-led" style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></div>
            <div>
              <div style="font-size:12px; font-weight:800; color:#fff; letter-spacing:0.12em;">J.A.R.V.I.S. // ORBITAL INTELLIGENCE</div>
              <div style="font-size:9px; color:#00f0ff;">CHIEF ARCHITECT: MR. SINGH</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="jarvis-mute-btn" class="jarvis-chip-btn" style="background:rgba(0, 240, 255, 0.12); border:1px solid rgba(0, 240, 255, 0.4); border-radius:6px; color:#38bdf8; font-size:10px; padding:3px 8px; cursor:pointer;">VOICE: ON</button>
            <button id="jarvis-close-btn" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
          </div>
        </div>

        <!-- Real-Time Neural Oscilloscope -->
        <div style="padding:8px 12px 0 12px; background:rgba(0,0,0,0.5);">
          <canvas id="jarvis-oscilloscope" width="364" height="40" style="width:100%; height:40px; display:block; border-radius:6px; background:rgba(3,7,18,0.7); border:1px solid rgba(0, 240, 255, 0.25);"></canvas>
        </div>

        <!-- Blueprint Quick Chips -->
        <div style="display:flex; gap:6px; padding:8px 10px; overflow-x:auto; background:rgba(0,0,0,0.35); border-bottom:1px solid rgba(255,255,255,0.06);">
          <button class="jarvis-chip-btn" data-query="Find and track the International Space Station." style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.3); color:#38bdf8; font-size:10px; border-radius:12px; padding:3px 8px; cursor:pointer; white-space:nowrap;">Track ISS</button>
          <button class="jarvis-chip-btn" data-query="Which satellites will pass over Pune tonight?" style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.3); color:#38bdf8; font-size:10px; border-radius:12px; padding:3px 8px; cursor:pointer; white-space:nowrap;">Passes: Pune</button>
          <button class="jarvis-chip-btn" data-query="Report status on active ISRO surveillance assets." style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.3); color:#38bdf8; font-size:10px; border-radius:12px; padding:3px 8px; cursor:pointer; white-space:nowrap;">ISRO Fleet</button>
          <button class="jarvis-chip-btn" data-query="Why do satellites remain in orbit without falling?" style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.3); color:#38bdf8; font-size:10px; border-radius:12px; padding:3px 8px; cursor:pointer; white-space:nowrap;">Orbital Physics</button>
        </div>

        <!-- Telemetry Comms Stream -->
        <div id="jarvis-stream" style="flex:1; padding:12px; overflow-y:auto; font-size:11px; line-height:1.6; display:flex; flex-direction:column; gap:8px; color:#cbd5e1;">
          <div style="align-self:flex-start; max-width:92%; background:rgba(0, 240, 255, 0.08); border-left:3px solid #00f0ff; padding:8px 10px; border-radius:0 8px 8px 0;">
            At your service, Sir. Arc Reactor core online and synchronized with God's Eye telemetry. Speak or transmit your instructions.
          </div>
        </div>

        <!-- Voice & Command Input Dock -->
        <div style="padding:10px 12px; background:rgba(15, 23, 42, 0.95); border-top:1px solid rgba(0,240,255,0.25); display:flex; align-items:center; gap:6px;">
          <button id="jarvis-mic-btn" title="Click to Speak" style="background:rgba(0,240,255,0.15); border:1px solid #00f0ff; border-radius:6px; color:#00f0ff; padding:7px 10px; cursor:pointer; font-size:13px; transition:all 0.2s;">🎙️</button>
          <input id="jarvis-input" type="text" placeholder="Command J.A.R.V.I.S., Sir..." style="flex:1; background:rgba(0,0,0,0.6); border:1px solid rgba(0,240,255,0.35); border-radius:6px; color:#fff; font-family:monospace; font-size:11px; padding:7px 10px; outline:none;" />
          <button id="jarvis-exec-btn" style="background:#00f0ff; border:none; border-radius:6px; color:#030712; font-weight:800; font-family:monospace; font-size:11px; padding:7px 12px; cursor:pointer;">EXEC</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // --- 4. Logic & Handlers ---
    const orb = document.getElementById('jarvis-arc-button');
    const panel = document.getElementById('jarvis-hud-panel');
    const input = document.getElementById('jarvis-input');
    const stream = document.getElementById('jarvis-stream');
    const micBtn = document.getElementById('jarvis-mic-btn');
    const muteBtn = document.getElementById('jarvis-mute-btn');
    const closeBtn = document.getElementById('jarvis-close-btn');
    const canvas = document.getElementById('jarvis-oscilloscope');
    const ctx = canvas.getContext('2d');

    // Oscilloscope Loop
    function runOscilloscope() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width, h = canvas.height, midY = h / 2;

      let freq = 0.04, amp = 4, col = 'rgba(0, 240, 255, 0.45)';
      if (session.neuralState === 'listening') { freq = 0.08; amp = 14; col = '#ef4444'; }
      else if (session.neuralState === 'thinking') { freq = 0.12; amp = 9; col = '#f59e0b'; }
      else if (session.neuralState === 'speaking') { freq = 0.09; amp = 15; col = '#38bdf8'; }

      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = col;
      for (let x = 0; x < w; x++) {
        const y = midY + Math.sin(x * freq + session.wavePhase) * amp * Math.sin((x / w) * Math.PI);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 1; i <= 5; i++) {
        const nx = (w / 6) * i;
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

    // Panel Toggle
    function togglePanel() {
      session.isOpen = !session.isOpen;
      panel.style.display = session.isOpen ? 'flex' : 'none';
      if (session.isOpen) input.focus();
    }
    orb.onclick = togglePanel;
    closeBtn.onclick = togglePanel;

    // Voice Mute Toggle
    muteBtn.onclick = () => {
      session.voiceEnabled = !session.voiceEnabled;
      muteBtn.innerText = session.voiceEnabled ? 'VOICE: ON' : 'VOICE: MUTED';
      muteBtn.style.color = session.voiceEnabled ? '#38bdf8' : '#ef4444';
      if (!session.voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
    };

    // Quick Chips
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

      const utt = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find(v => v.lang === 'en-GB' || v.name.includes('UK') || v.name.includes('British') || v.name.includes('George')) || voices.find(v => v.lang.startsWith('en'));
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
        alert('Voice recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }
      if (!session.recognition) {
        session.recognition = new SR();
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

    // --- 5. Space Intelligence Engine & Blueprint Tool Planner ---
    input.onkeydown = (e) => { if (e.key === 'Enter') processUserQuery(); };
    document.getElementById('jarvis-exec-btn').onclick = processUserQuery;

    async function processUserQuery() {
      const rawText = input.value.trim();
      if (!rawText) return;

      session.neuralState = 'thinking';
      input.value = '';

      // User Bubble
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'align-self:flex-end; max-width:85%; background:rgba(0, 240, 255, 0.15); border:1px solid rgba(0, 240, 255, 0.4); border-radius:8px 8px 0 8px; padding:7px 10px; color:#fff;';
      userBubble.innerText = rawText;
      stream.appendChild(userBubble);

      // Bot Bubble
      const botBubble = document.createElement('div');
      botBubble.style.cssText = 'align-self:flex-start; max-width:92%; background:rgba(0, 240, 255, 0.08); border-left:3px solid #00f0ff; padding:7px 10px; border-radius:0 8px 8px 0; color:#00f0ff; font-style:italic;';
      botBubble.innerText = 'Consulting orbital ephemeris, Sir...';
      stream.appendChild(botBubble);
      stream.scrollTop = stream.scrollHeight;

      // Handle Follow-up Context / Pronouns ("it", "track it", "show that one")
      let query = rawText;
      if (/\b(it|its|this|that|track it|show it)\b/i.test(query)) {
        query += ` (pertaining to ${session.lastTrackedObject})`;
      }

      // --- BLUEPRINT WORKFLOW ENGINE ---
      const q = query.toUpperCase();
      let answer = "";
      let actionTag = null;

      // WORKFLOW A & D: Satellite Search & Tracking (ISS / Hubble / Cartosat)
      if (q.includes("ISS") || q.includes("SPACE STATION")) {
        session.lastTrackedObject = "ISS";
        answer = "I have locked onto the International Space Station. Orbiting at approximately 418 km altitude, maintaining 27,600 km/h at 51.6° inclination. Centering 3D globe camera and displaying orbital track now, Sir.";
        actionTag = "FOCUS_ISS";
      } else if (q.includes("HUBBLE")) {
        session.lastTrackedObject = "Hubble Space Telescope";
        answer = "I found Hubble (NORAD 20580). Orbiting at ~535 km altitude with a 28.5° inclination. I have highlighted its position on the globe and enabled its orbital path, Sir.";
        actionTag = "FOCUS_ISS";
      }
      // WORKFLOW B: Scientific Questions
      else if (q.includes("WHY") && (q.includes("FALL") || q.includes("ORBIT") || q.includes("GRAVITY"))) {
        answer = "Satellites remain in orbit because forward velocity (~7.8 km/s in LEO) creates a centrifugal balance: the spacecraft is in perpetual free fall where the curvature of its trajectory precisely matches Earth's curvature, Sir.";
      }
      // WORKFLOW C: Location-Based Passes (Pune / Mumbai / Delhi)
      else if (q.includes("PUNE") || q.includes("PASS") || q.includes("TONIGHT")) {
        answer = "For Pune sector (18.52° N, 73.85° E), prime visual passes occur during twilight terminator windows when satellites reflect sunlight against dark skies. Navigating to the OrbitAlert pass table for elevation look-angles, Sir.";
        actionTag = "NAV_ALERT";
      }
      // ISRO Fleet
      else if (q.includes("ISRO") || q.includes("CARTOSAT") || q.includes("NISAR") || q.includes("ASTROSAT")) {
        session.lastTrackedObject = "ISRO Fleet";
        answer = "Tracking primary ISRO orbital assets including Cartosat-3 high-resolution imaging, EOS-04 radar surveillance, and AstroSat in sun-synchronous polar orbits, Sir.";
      }
      // Space Weather / Sun
      else if (q.includes("SUN") || q.includes("SOLAR")) {
        answer = "The Sun is at our system's gravitational center, Sir. Current solar radiation flux and space weather indices are within nominal thresholds.";
      }
      // Greetings
      else if (q === "HI" || q === "HELLO" || q === "HEY" || q.startsWith("HELLO JARVIS")) {
        answer = "At your service, Sir. Orbital tracks, pass calculations, and 3D globe telemetry are synchronized. What shall we observe?";
      }
      // Collision / Sentinel
      else if (q.includes("SENTINEL") || q.includes("COLLISION") || q.includes("DEBRIS") || q.includes("RE-ENTRY")) {
        answer = "Accessing Sentinel Conjunction Assessment hub to monitor close approaches and space debris conjunction events, Sir.";
        actionTag = "NAV_SENTINEL";
      }

      // If matched by Blueprint Engine, return response
      if (answer) {
        botBubble.style.fontStyle = 'normal';
        botBubble.style.color = '#cbd5e1';
        botBubble.innerText = answer;
        speak(answer);
        if (actionTag) dispatchAction(actionTag);
        stream.scrollTop = stream.scrollHeight;
        return;
      }

      // Fallback response
      const fallback = "Sensors operational, Sir. All orbital downlinks reporting nominal status.";
      botBubble.style.fontStyle = 'normal';
      botBubble.style.color = '#cbd5e1';
      botBubble.innerText = fallback;
      speak(fallback);
      stream.scrollTop = stream.scrollHeight;
    }

    // --- 6. Website Action Controller (Blueprint Section 7) ---
    function dispatchAction(action) {
      console.log('[J.A.R.V.I.S. ACTION DISPATCHED]:', action);
      if (action === 'NAV_ALERT') {
        if (!window.location.pathname.includes('orbitalert')) window.location.href = window.location.protocol === 'file:' ? 'orbitalert.html' : '/orbitalert';
      } else if (action === 'NAV_SENTINEL') {
        if (!window.location.pathname.includes('sentinel')) window.location.href = window.location.protocol === 'file:' ? 'sentinel.html' : '/sentinel';
      } else if (action === 'FOCUS_ISS') {
        const issBtn = document.querySelector('[data-target="iss"]') || document.getElementById('btn-track-iss') || document.querySelector('button[title*="ISS"]');
        if (issBtn) issBtn.click();
      }
    }

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

