import type { AnalyzeResponse, CacheEntry } from './types';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 50;

const analysisCache = storage.defineItem<Record<string, CacheEntry>>('local:analysisCache', {
  fallback: {},
});

export async function getCache(key: string): Promise<AnalyzeResponse | null> {
  const cache = await analysisCache.getValue();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) return null;
  return entry.response;
}

export async function setCache(key: string, response: AnalyzeResponse & { success: true }): Promise<void> {
  const cache = await analysisCache.getValue();
  cache[key] = { response, timestamp: Date.now() };

  // Evict oldest entries if over limit
  const keys = Object.keys(cache);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
    for (const k of sorted.slice(0, keys.length - MAX_ENTRIES)) {
      delete cache[k];
    }
  }

  await analysisCache.setValue(cache);
}
