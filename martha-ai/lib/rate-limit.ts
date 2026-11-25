// Best-effort in-memory sliding-window limiter (per serverless instance).
// Production: swap for Upstash Redis (@upstash/ratelimit) to share limits across instances.

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function rateLimit(key: string, limitPerMin: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= limitPerMin) {
    hits.set(key, arr);
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}
