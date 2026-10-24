import { getSpaceStore, saveSpaceStore } from '../db/space-store.js';

export async function harvestNews() {
  const spaceStore = getSpaceStore();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=3', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.results)) {
        spaceStore.externalIntel.missionNews = json.results.map(a => ({ id: a.id, title: a.title, newsSite: a.news_site }));
        await saveSpaceStore();
      }
    }
  } catch {}
}

export function startNewsDaemon() {
  harvestNews();
  setInterval(harvestNews, 10 * 60 * 1000);
}
