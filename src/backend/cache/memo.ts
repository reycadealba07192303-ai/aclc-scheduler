/**
 * Short-lived, per-server-instance memory cache (systemsecured.md 3 and 4).
 *
 * The free Atlas tier allows about 100 database operations per second, and
 * pages poll, so repeated lookups of data that rarely changes (who is signed
 * in, a student's section, subject names) are kept here for a few seconds.
 * Each Vercel instance has its own copy; nothing here is the source of truth.
 */
type Entry = { expiresAt: number; value: Promise<unknown> };

const MAX_ENTRIES = 5000;
const store = new Map<string, Entry>();
const keysByTag = new Map<string, Set<string>>();

export async function memo<T>(key: string, ttlMs: number, load: () => Promise<T>, tags: string[] = []): Promise<T> {
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) return cached.value as Promise<T>;

  const value = load();
  store.set(key, { expiresAt: now + ttlMs, value });
  for (const tag of tags) {
    if (!keysByTag.has(tag)) keysByTag.set(tag, new Set());
    keysByTag.get(tag)!.add(key);
  }
  // Failed loads are not cached.
  value.catch(() => { if (store.get(key)?.value === value) store.delete(key); });
  // Map keeps insertion order, so the first keys are the oldest.
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value!);
  return value;
}

export function forget(key: string) {
  store.delete(key);
}

/** Drops every entry stored with `tag` (for example all cached sessions of one account). */
export function forgetTag(tag: string) {
  for (const key of keysByTag.get(tag) ?? []) store.delete(key);
  keysByTag.delete(tag);
}
