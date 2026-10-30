/**
 * God's Eye PWA Lifecycle & Installation Manager
 * Version: 4.0.0
 * 
 * Handles:
 * - Service worker registration and update notification
 * - Non-intrusive desktop/mobile PWA install prompt
 * - Installation dismissal memory (prevents repeatedly nagging users)
 */

class PwaManager {
  constructor() {
    this.deferredPrompt = null;
    this.swRegistration = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    // Register Service Worker
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            this.swRegistration = reg;
            console.log('[PWA] Service Worker registered with scope:', reg.scope);

            // Handle updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    this.showUpdateToast(reg);
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration skipped/failed:', err.message);
          });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.renderInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] God\'s Eye successfully installed as standalone app.');
      this.deferredPrompt = null;
      const btn = document.getElementById('btn-pwa-install');
      if (btn) btn.style.display = 'none';
      if (window.statusManager) {
        window.statusManager.notify({
          severity: 'SUCCESS',
          title: 'Installation Complete',
          message: 'God\'s Eye is now installed as a desktop/mobile application.',
          durationMs: 4000
        });
      }
    });
  }

  showUpdateToast(registration) {
    if (window.statusManager) {
      window.statusManager.notify({
        id: 'pwa-update-available',
        severity: 'INFO',
        title: 'Observatory Update Ready',
        message: 'A newer release of God\'s Eye is ready to deploy.',
        durationMs: 0,
        action: {
          label: 'Update Now',
          onClick: () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
              window.location.reload();
            }
          }
        }
      });
    }
  }

  renderInstallButton() {
    // Check if user previously dismissed installation in this browser
    const dismissedTime = localStorage.getItem('godseye_pwa_dismissed_at');
    if (dismissedTime && Date.now() - Number(dismissedTime) < 7 * 86400000) {
      // Don't nag user within 7 days of dismissal
      return;
    }

    // Check if already injected
    if (document.getElementById('btn-pwa-install')) return;

    // Look for header actions or navigation bar to place unobtrusive install button
    const container = document.querySelector('header nav, header .flex, #header-controls') || document.body;

    const btn = document.createElement('button');
    btn.id = 'btn-pwa-install';
    btn.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900/90 text-cyan-300 text-[11px] font-mono font-bold transition shadow-sm cursor-pointer';
    btn.innerHTML = `
      <i class="fa-solid fa-download text-[10px]"></i>
      <span>Install App</span>
    `;
    btn.onclick = () => this.promptInstall();

    // If placed in document.body fallback, position neatly in top-right
    if (container === document.body) {
      btn.className += ' fixed top-20 right-4 z-40';
    }

    container.appendChild(btn);
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      alert("App installation is supported via your browser's menu (e.g. Chrome 'Install God's Eye' or Edge 'Apps > Install').");
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);

    if (outcome === 'dismissed') {
      localStorage.setItem('godseye_pwa_dismissed_at', Date.now().toString());
    }

    this.deferredPrompt = null;
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.style.display = 'none';
  }
}

export const pwaManager = new PwaManager();

if (typeof window !== 'undefined') {
  window.pwaManager = pwaManager;
  window.installGodsEyeApp = () => pwaManager.promptInstall();
}
