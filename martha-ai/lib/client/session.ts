"use client";
import type { StoredMessage } from "@/lib/export";
import type { Report } from "@/lib/schemas";

export type StoredSession = {
  id: string;
  startedAt: string;
  updatedAt: string;
  mode: "voice" | "chat";
  messages: StoredMessage[];
  report?: Report;
};

export type VoicePrefs = {
  engine: "groq" | "browser"; // Groq Orpheus (default) or the browser's own voice
  groqVoice: string;
  voiceURI: string | null; // browser voice
  rate: number;
  bargeIn: boolean;
};

const SESSION_KEY = "martha.session.v1";
const VOICE_KEY = "martha.voice";
const TTL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_VOICE_PREFS: VoicePrefs = { engine: "groq", groqVoice: "hannah", voiceURI: null, rate: 1, bargeIn: true };

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota): keep working in memory */
  }
}

export function loadSession(): StoredSession | null {
  const s = read<StoredSession>(SESSION_KEY);
  if (!s) return null;
  if (Date.now() - Date.parse(s.updatedAt) > TTL_MS) {
    clearSession();
    return null;
  }
  return s;
}

export function saveSession(s: StoredSession) {
  write(SESSION_KEY, { ...s, updatedAt: new Date().toISOString() });
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadVoicePrefs(): VoicePrefs {
  return { ...DEFAULT_VOICE_PREFS, ...(read<Partial<VoicePrefs>>(VOICE_KEY) ?? {}) };
}

export function saveVoicePrefs(p: VoicePrefs) {
  write(VOICE_KEY, p);
}

export function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
