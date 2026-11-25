// Rank the browser's speech-synthesis voices and pick the best English one for Martha.

export type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "lang" | "voiceURI" | "localService">;

const QUALITY_HINTS = /natural|neural|online|google|premium|enhanced/i;
const FEMALE_HINTS = /female|woman|neerja|heera|veena|swara|aria|jenny|samantha|zira|susan|karen|moira|tessa|serena|libby|sonia|emma|ava|allison|google uk english female|google us english/i;
const MALE_HINTS = /\bmale\b|prabhat|ravi|david|mark|guy|daniel|george|ryan|alex|fred/i;

export function scoreVoice(v: VoiceLike): number {
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (!lang.startsWith("en")) return -1;
  let s = 1;
  if (lang === "en-in") s += 40;
  else if (lang === "en-gb" || lang === "en-us") s += 10;
  if (QUALITY_HINTS.test(v.name)) s += 30;
  if (FEMALE_HINTS.test(v.name)) s += 15;
  if (MALE_HINTS.test(v.name) && !/female/i.test(v.name)) s -= 10;
  return s;
}

export function rankVoices<T extends VoiceLike>(voices: T[]): T[] {
  return voices
    .filter((v) => scoreVoice(v) >= 0)
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export function pickBestVoice<T extends VoiceLike>(voices: T[], preferredURI?: string | null): T | null {
  if (preferredURI) {
    const p = voices.find((v) => v.voiceURI === preferredURI);
    if (p) return p;
  }
  return rankVoices(voices)[0] ?? null;
}
