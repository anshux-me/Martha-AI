import "server-only";
import { getConfig } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";

export function requestId(): string {
  return crypto.randomUUID();
}

export function jsonError(status: number, code: string, message: string, rid: string, extra?: HeadersInit) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "x-request-id": rid, "cache-control": "no-store", ...(extra ?? {}) } },
  );
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns a 429 Response if the caller is over the limit, otherwise null. */
export function checkRate(req: Request, rid: string): Response | null {
  const { ok, retryAfterSec } = rateLimit(clientIp(req), getConfig().RATE_LIMIT_PER_MIN);
  if (ok) return null;
  return jsonError(429, "rate_limited", "Too many requests. Please wait a moment.", rid, {
    "retry-after": String(retryAfterSec),
  });
}

/** Structured log line. Never pass message text, audio or phone numbers here. */
export function logEvent(fields: Record<string, unknown>) {
  console.log(JSON.stringify({ t: new Date().toISOString(), ...fields }));
}
