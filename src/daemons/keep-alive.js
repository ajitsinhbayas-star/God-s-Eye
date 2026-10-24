export function startKeepAliveDaemon() {
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`).catch(() => {});
    }, 12 * 60 * 1000);
  }
}
