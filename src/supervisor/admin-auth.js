/**
 * GOD'S EYE — SENTINEL BOT ADMIN AUTHENTICATION SUPERVISOR
 * Zero-dependency native loader with constant-time equality and brute-force mitigation (ESM).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load .env natively if dotenv is absent
(function loadEnvNative() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const k = trimmed.slice(0, eqIdx).trim();
            const v = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      } catch (_) {}
      break;
    }
  }
})();

const activeSessions = new Map();
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30-day persistent session

// File-backed persistent session store
const SESSIONS_FILE = path.resolve(process.cwd(), 'data/sentinel-sessions.json');

function loadPersistedSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const list = JSON.parse(raw);
      const now = Date.now();
      if (Array.isArray(list)) {
        for (const s of list) {
          if (s && s.sessionId && s.expiresAt && s.expiresAt > now) {
            activeSessions.set(s.sessionId, s);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Sentinel Auth] Notice reading persisted sessions:', err.message);
  }
}

function savePersistedSessions() {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const now = Date.now();
    const valid = Array.from(activeSessions.values()).filter(s => s && s.expiresAt > now);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(valid, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Sentinel Auth] Notice saving persisted sessions:', err.message);
  }
}

// Initial session load
loadPersistedSessions();

let ephemeralCredentials = null;

export function getCredentials() {
  const envUser = process.env.SENTINEL_ADMIN_USERNAME;
  const envPass = process.env.SENTINEL_ADMIN_PASSWORD;
  const envSecret = process.env.SENTINEL_SESSION_SECRET;

  if (envUser && envPass) {
    return {
      username: envUser,
      password: envPass,
      secret: envSecret || 'sentinel_master_crypto_secret_32bytes',
      isEphemeral: false
    };
  }

  // Never use hardcoded credentials in production or version control.
  // Generate high-entropy ephemeral credentials on boot if environment variables are not provided.
  if (!ephemeralCredentials) {
    const generatedPass = crypto.randomBytes(16).toString('hex');
    ephemeralCredentials = {
      username: envUser || 'sentinel-admin',
      password: generatedPass,
      secret: envSecret || crypto.randomBytes(32).toString('hex'),
      isEphemeral: true
    };
    console.warn('\n============================================================');
    console.warn('[SECURITY] SENTINEL_ADMIN_PASSWORD not set in environment.');
    console.warn('[SECURITY] Ephemeral credentials generated for this server process:');
    console.warn(`[SECURITY]   Username: ${ephemeralCredentials.username}`);
    console.warn(`[SECURITY]   Password: ${ephemeralCredentials.password}`);
    console.warn('[SECURITY] Set SENTINEL_ADMIN_USERNAME and SENTINEL_ADMIN_PASSWORD in .env');
    console.warn('============================================================\n');
  }

  return ephemeralCredentials;
}

export function isAuthConfigured() {
  const c = getCredentials();
  return Boolean(c.username && c.password && c.password.length >= 8);
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Constant-time comparison using fixed 256-bit digests prevents length-leak timing attacks
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function getClientIp(req) {
  return (req.ip || req.connection?.remoteAddress || '127.0.0.1').replace(/^.*:/, '');
}

export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const sec = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, error: 'Too many failed attempts. Console locked for ' + sec + 's.' };
  }
  if (now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }
  loginAttempts.set(ip, entry);
}

export function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}

export function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie;
  if (!header) return list;
  header.split(';').forEach(c => {
    const parts = c.split('=');
    const name = parts[0]?.trim();
    if (name) list[name] = decodeURIComponent(parts.slice(1).join('=').trim());
  });
  return list;
}

export function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session = { sessionId, username, createdAt: now, expiresAt: now + SESSION_LIFETIME_MS };
  activeSessions.set(sessionId, session);
  savePersistedSessions();
  return session;
}

export function getSession(id) {
  if (!id) return null;
  let s = activeSessions.get(id);
  if (!s) {
    loadPersistedSessions();
    s = activeSessions.get(id);
  }
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    activeSessions.delete(id);
    savePersistedSessions();
    return null;
  }
  return s;
}

export function destroySession(id) {
  if (id) {
    activeSessions.delete(id);
    savePersistedSessions();
  }
}

export function requireAdminAuth(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const fullPath = req.originalUrl || req.baseUrl + req.path || req.path || '';
  const isApi = fullPath.startsWith('/api/');

  if (!isAuthConfigured()) {
    if (!isApi && req.accepts && req.accepts('html')) {
      return res.status(503).send('<h2 style="font-family:monospace;color:#f87171;text-align:center;padding:40px;">503 // SENTINEL ADMIN SETUP REQUIRED</h2>');
    }
    return res.status(503).json({ error: 'Sentinel admin authentication setup required.' });
  }

  const cookies = parseCookies(req);
  const session = getSession(cookies.sentinel_session);

  if (!session) {
    if (!isApi && req.accepts && req.accepts('html')) {
      return res.redirect('/sentinel-login');
    }
    return res.status(401).json({ error: 'Unauthorized: Administrator session required.' });
  }

  req.adminSession = session;
  next();
}
