import OpenAI from "openai";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import { checkRate, jsonError, logEvent, requestId } from "@/lib/http";
import { getClient, hasKey } from "@/lib/llm/providers";
import { toSpeechText } from "@/lib/speech-text";
import { isOrpheusVoice, TTS_MAX_CHARS } from "@/lib/tts-voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TtsRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  text: z.string().min(1).max(1000),
  voice: z.string().optional(),
});

export async function POST(req: Request) {
  const rid = requestId();
  const limited = checkRate(req, rid);
  if (limited) return limited;
  const cfg = getConfig();
  if (cfg.TTS_ENGINE !== "groq" || !hasKey("groq")) {
    return jsonError(503, "tts_unavailable", "Groq text-to-speech is not enabled", rid);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON", rid);
  }
  const parsed = TtsRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_text", "Invalid text", rid);

  const input = toSpeechText(parsed.data.text).slice(0, TTS_MAX_CHARS);
  if (!input) return jsonError(400, "invalid_text", "Nothing to speak", rid);
  const voice = isOrpheusVoice(parsed.data.voice) ? parsed.data.voice : cfg.GROQ_TTS_VOICE;

  const t0 = performance.now();
  try {
    const res = await getClient("groq").audio.speech.create({
      model: cfg.GROQ_TTS_MODEL,
      voice: voice as never, // Orpheus voice ids aren't in the OpenAI SDK's voice union
      input,
      response_format: "wav",
    });
    const audio = await res.arrayBuffer();
    logEvent({ rid, route: "tts", sessionId: parsed.data.sessionId, chars: input.length, voice, durationMs: Math.round(performance.now() - t0), status: 200 });
    return new Response(audio, {
      headers: { "content-type": "audio/wav", "cache-control": "no-store", "x-request-id": rid },
    });
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? (err.status ?? 502) : 502;
    const code = err instanceof OpenAI.APIError ? String((err.error as { code?: string } | undefined)?.code ?? "") : "";
    logEvent({ rid, route: "tts", sessionId: parsed.data.sessionId, status, code, error: (err as Error).message?.slice(0, 200) });
    if (code === "model_terms_required") {
      return jsonError(503, "tts_terms_required", "Accept the Orpheus model terms in the Groq console to enable this voice.", rid);
    }
    if (status === 429) return jsonError(429, "tts_rate_limited", "Text-to-speech limit reached", rid);
    return jsonError(502, "upstream_error", "Text-to-speech failed", rid);
  }
}
