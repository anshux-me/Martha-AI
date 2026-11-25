// Groq Orpheus (canopylabs/orpheus-v1-english) voices offered in the UI.
// The server validates against this list; check Groq's docs if a voice is rejected.
export const ORPHEUS_VOICES = [
  { id: "hannah", label: "Hannah (female)" },
  { id: "diana", label: "Diana (female)" },
  { id: "autumn", label: "Autumn (female)" },
  { id: "austin", label: "Austin (male)" },
  { id: "daniel", label: "Daniel (male)" },
  { id: "troy", label: "Troy (male)" },
] as const;

export type OrpheusVoice = (typeof ORPHEUS_VOICES)[number]["id"];

export const DEFAULT_ORPHEUS_VOICE: OrpheusVoice = "hannah";

export function isOrpheusVoice(v: unknown): v is OrpheusVoice {
  return typeof v === "string" && ORPHEUS_VOICES.some((x) => x.id === v);
}

/** Max characters per Orpheus request (chunks are kept below this). */
export const TTS_MAX_CHARS = 200;
