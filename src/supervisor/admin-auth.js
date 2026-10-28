/**
 * GOD'S EYE — SENTINEL BOT ADMIN AUTHENTICATION SUPERVISOR
 * Zero-dependency native loader with constant-time equality and brute-force mitigation.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

function getCredentials() {
  return {
    username: process.env.SENTINEL_ADMIN_USERNAME || 'Ajitsinh96',
    password: process.env.SENTINEL_ADMIN_PASSWORD || 'Ajitsinh@#9699',
    secret: process.env.SENTINEL_SESSION_SECRET || 'sentinel_master_crypto_secret_32bytes'
  };
}

function isAuthConfigured() {
  const c = getCredentials();
  return Boolean(c.username && c.password && c.password.length >= 8);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getClientIp(req) {
  return (req.ip || req.connection?.remoteAddress || '127.0.0.1').replace(/^.*:/, '');
}

function checkRateLimit(ip) {
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

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }
  loginAttempts.set(ip, entry);
}

function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}

function parseCookies(req) {
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

function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session = { sessionId, username, createdAt: now, expiresAt: now + SESSION_LIFETIME_MS };
  activeSessions.set(sessionId, session);
  return session;
}

function getSession(id) {
  if (!id) return null;
  const s = activeSessions.get(id);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    activeSessions.delete(id);
    return null;
  }
  return s;
}

function destroySession(id) {
  if (id) activeSessions.delete(id);
}

function requireAdminAuth(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  if (!isAuthConfigured()) {
    if (req.accepts && req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.status(503).send('<h2 style="font-family:monospace;color:#f87171;text-align:center;padding:40px;">503 // SENTINEL ADMIN SETUP REQUIRED</h2>');
    }
    return res.status(503).json({ error: 'Sentinel admin authentication setup required.' });
  }

  const cookies = parseCookies(req);
  const session = getSession(cookies.sentinel_session);

  if (!session) {
    if (req.accepts && req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/sentinel-login');
    }
    return res.status(401).json({ error: 'Unauthorized: Administrator session required.' });
  }

  req.adminSession = session;
  next();
}

module.exports = {
  getCredentials,
  isAuthConfigured,
  timingSafeEqual,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  parseCookies,
  createSession,
  getSession,
  destroySession,
  requireAdminAuth
};
