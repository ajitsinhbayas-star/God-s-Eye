/**
 * God's Eye Application Status & Error Notification System
 * Version: 4.0.0
 * 
 * Provides accessible, unified visual states across all pages:
 * - Loading
 * - Fresh data available
 * - Stale data available
 * - Offline / Reconnecting
 * - Service unavailable
 * - Partial results
 * - Invalid user input
 * - Unsupported object or calculation
 * - Permission required
 * - Successful save or update
 * - Recoverable and unrecoverable errors
 */

export const StatusSeverity = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  STALE: 'STALE',
  OFFLINE: 'OFFLINE'
};

class StatusManager {
  constructor() {
    this.container = null;
    this.activeToasts = new Map();
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.initDom();
    this.bindNetworkListeners();
  }

  initDom() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('godseye-status-hud')) {
      this.container = document.getElementById('godseye-status-hud');
      return;
    }

    const hud = document.createElement('div');
    hud.id = 'godseye-status-hud';
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'System Status Alerts');
    hud.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2';
    
    const liveRegion = document.createElement('div');
    liveRegion.id = 'godseye-status-live-announcer';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    hud.appendChild(liveRegion);

    document.body.appendChild(hud);
    this.container = hud;
  }

  bindNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notify({
        id: 'net-status',
        severity: StatusSeverity.SUCCESS,
        title: 'Sensory Downlink Restored',
        message: 'Reconnected to God\'s Eye orbital telemetry network.',
        durationMs: 4000
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify({
        id: 'net-status',
        severity: StatusSeverity.OFFLINE,
        title: 'Offline Telemetry Mode',
        message: 'Live updates paused. Viewing locally cached orbital observations.',
        durationMs: 0, // Persistent until reconnected
        action: {
          label: 'Retry Connection',
          onClick: () => window.location.reload()
        }
      });
    });
  }

  announceScreenReader(text) {
    const announcer = document.getElementById('godseye-status-live-announcer');
    if (announcer) {
      announcer.innerText = text;
    }
  }

  notify(config) {
    this.initDom();
    if (!this.container) return;

    const {
      id = 'toast-' + Math.random().toString(36).substring(2, 9),
      severity = StatusSeverity.INFO,
      title,
      message,
      durationMs = 5000,
      action = null
    } = config;

    // Remove existing toast with identical ID
    if (this.activeToasts.has(id)) {
      this.dismiss(id);
    }

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 rounded-xl p-3 shadow-2xl backdrop-blur-md border text-xs flex gap-2.5 items-start font-sans';

    let icon = 'ℹ️';
    let borderClass = 'border-cyan-500/40 bg-slate-900/95 text-slate-200';
    let iconClass = 'text-cyan-400';

    switch (severity) {
      case StatusSeverity.SUCCESS:
        icon = '✓';
        borderClass = 'border-emerald-500/50 bg-slate-950/95 text-slate-100 shadow-emerald-500/10';
        iconClass = 'text-emerald-400 font-bold';
        break;
      case StatusSeverity.WARNING:
        icon = '⚠️';
        borderClass = 'border-amber-500/50 bg-slate-950/95 text-slate-100 shadow-amber-500/10';
        iconClass = 'text-amber-400 font-bold';
        break;
      case StatusSeverity.ERROR:
        icon = '⛔';
        borderClass = 'border-rose-500/60 bg-rose-950/95 text-rose-100 shadow-rose-500/20';
        iconClass = 'text-rose-400 font-bold';
        break;
      case StatusSeverity.STALE:
        icon = '⏳';
        borderClass = 'border-amber-600/50 bg-slate-950/95 text-slate-200';
        iconClass = 'text-amber-300';
        break;
      case StatusSeverity.OFFLINE:
        icon = '⚡';
        borderClass = 'border-yellow-500/60 bg-slate-950/95 text-yellow-200';
        iconClass = 'text-yellow-400 font-bold';
        break;
    }

    toast.className += ` ${borderClass}`;

    let actionHtml = '';
    if (action) {
      actionHtml = `
        <button id="${id}-action-btn" class="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] font-bold transition border border-slate-700">
          ${action.label} ➔
        </button>
      `;
    }

    toast.innerHTML = `
      <div class="text-sm mt-0.5 ${iconClass}">${icon}</div>
      <div class="flex-1 space-y-0.5">
        ${title ? `<div class="font-bold text-slate-100 tracking-wide font-mono text-[11px] uppercase">${title}</div>` : ''}
        <div class="text-slate-300 text-[11px] leading-relaxed">${message}</div>
        ${actionHtml}
      </div>
      <button onclick="window.statusManager.dismiss('${id}')" class="text-slate-500 hover:text-slate-300 p-1 text-sm font-bold transition" aria-label="Dismiss notification">
        &times;
      </button>
    `;

    this.container.appendChild(toast);
    this.activeToasts.set(id, toast);

    if (action && action.onClick) {
      const btn = toast.querySelector(`#${id}-action-btn`);
      if (btn) btn.onclick = action.onClick;
    }

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    this.announceScreenReader(`${title ? title + ': ' : ''}${message}`);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  dismiss(id) {
    const toast = this.activeToasts.get(id);
    if (!toast) return;

    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      this.activeToasts.delete(id);
    }, 300);
  }

  // Pre-configured status helper methods
  showLoading(msg = 'Acquiring orbital telemetry...') {
    return this.notify({
      id: 'app-loading-state',
      severity: StatusSeverity.INFO,
      title: 'Synchronizing',
      message: msg,
      durationMs: 0
    });
  }

  hideLoading() {
    this.dismiss('app-loading-state');
  }

  showFresh(msg = 'Telemetry vectors synchronized.') {
    this.hideLoading();
    return this.notify({
      id: 'fresh-data',
      severity: StatusSeverity.SUCCESS,
      title: 'Real-Time Feed',
      message: msg,
      durationMs: 3500
    });
  }

  showStale(ageMinutes, msg) {
    return this.notify({
      id: 'stale-data',
      severity: StatusSeverity.STALE,
      title: `Observation Cached (${ageMinutes}m ago)`,
      message: msg || 'Displaying last verified ephemeris. Live provider connection is delayed.',
      durationMs: 6000
    });
  }

  showError(title, message, retryFn = null) {
    this.hideLoading();
    return this.notify({
      severity: StatusSeverity.ERROR,
      title: title || 'Operational Error',
      message: message || 'An unexpected telemetry error occurred.',
      durationMs: 8000,
      action: retryFn ? { label: 'Retry Operation', onClick: retryFn } : null
    });
  }
}

export const statusManager = new StatusManager();

if (typeof window !== 'undefined') {
  window.statusManager = statusManager;
}
