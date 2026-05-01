import { isAxiosError } from 'axios';
import { toast } from 'sonner';

type Entry = { data: unknown; expiresAt: number };

const entries = new Map<string, Entry>();
/** Last successful payloads kept for 429 / network fallback after TTL */
const lastGood = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  const e = entries.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    entries.delete(key);
    return undefined;
  }
  return e.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number) {
  entries.set(key, { data, expiresAt: Date.now() + ttlMs });
  lastGood.set(key, data);
}

export function cacheInvalidate(key: string) {
  entries.delete(key);
}

export function cacheInvalidatePrefix(prefix: string) {
  for (const k of entries.keys()) {
    if (k.startsWith(prefix)) entries.delete(k);
  }
  for (const k of lastGood.keys()) {
    if (k.startsWith(prefix)) lastGood.delete(k);
  }
}

type GetOrFetchOptions = {
  force?: boolean;
  /** When true, use last successful response if request fails with 429 */
  staleOn429?: boolean;
};

/**
 * Returns cached data when fresh; otherwise runs fetcher.
 * Use `force: true` on explicit user refresh to bypass TTL.
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  options?: GetOrFetchOptions
): Promise<T> {
  const force = options?.force ?? false;
  const staleOn429 = options?.staleOn429 ?? true;

  if (!force) {
    const hit = cacheGet<T>(key);
    if (hit !== undefined) return hit;
  }

  try {
    const data = await fetcher();
    cacheSet(key, data, ttlMs);
    return data;
  } catch (err) {
    if (staleOn429 && isAxiosError(err) && err.response?.status === 429) {
      const stale = lastGood.get(key) as T | undefined;
      if (stale !== undefined) {
        toast.message('Rate limited — showing cached data', {
          description: 'Use Refresh to try again after a short wait.',
        });
        return stale;
      }
    }
    throw err;
  }
}
