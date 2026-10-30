/**
 * God's Eye Resilient Network & Storage Utility
 * Version: 4.0.0
 * 
 * Provides:
 * - Request timeouts and AbortController integration
 * - In-flight request deduplication
 * - Controlled retry with exponential backoff for transient errors
 * - Protected quota-safe LocalStorage / SessionStorage wrappers
 */

const pendingRequests = new Map();

export async function resilientFetch(url, options = {}) {
  const {
    timeoutMs = 8000,
    retries = 2,
    backoffMs = 800,
    deduplicate = (options.method === undefined || options.method === 'GET'),
    ...fetchOptions
  } = options;

  // Request deduplication for identical GET requests
  const cacheKey = deduplicate ? `${fetchOptions.method || 'GET'}:${url}` : null;
  if (cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const execFetch = async () => {
    let attempt = 0;
    while (attempt <= retries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const signal = fetchOptions.signal
          ? AbortSignal.any([fetchOptions.signal, controller.signal])
          : controller.signal;

        const response = await fetch(url, { ...fetchOptions, signal });
        clearTimeout(timer);

        // Do not retry 4xx client errors (e.g. 401 unauthorized, 404, 400 invalid param)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry 5xx server errors
        if (response.status >= 500 && attempt < retries) {
          attempt++;
          const waitTime = backoffMs * Math.pow(2, attempt - 1) + Math.random() * 200;
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }

        return response;
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError' && attempt >= retries) {
          throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
        }
        if (attempt < retries) {
          attempt++;
          const waitTime = backoffMs * Math.pow(2, attempt - 1) + Math.random() * 200;
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          throw err;
        }
      }
    }
  };

  const promise = execFetch().finally(() => {
    if (cacheKey) pendingRequests.delete(cacheKey);
  });

  if (cacheKey) pendingRequests.set(cacheKey, promise);
  return promise;
}

export async function safeFetchJson(url, options = {}) {
  try {
    const res = await resilientFetch(url, options);
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Server returned HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message || 'Network request failed' };
  }
}

// Quota-safe storage wrappers
export const safeStorage = {
  getItem(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return defaultValue;
      return JSON.parse(val);
    } catch (_) {
      try {
        return localStorage.getItem(key) || defaultValue;
      } catch (_) {
        return defaultValue;
      }
    }
  },

  setItem(key, value) {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, str);
      return true;
    } catch (e) {
      console.warn('[SafeStorage] Storage write failed (Quota or restricted mode):', e.message);
      return false;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }
};

if (typeof window !== 'undefined') {
  window.resilientFetch = resilientFetch;
  window.safeFetchJson = safeFetchJson;
  window.safeStorage = safeStorage;
}
