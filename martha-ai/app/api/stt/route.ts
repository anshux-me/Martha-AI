import OpenAI from "openai";
import { getConfig } from "@/lib/config";
import { checkRate, jsonError, logEvent, requestId } from "@/lib/http";
import { getClient, hasKey } from "@/lib/llm/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024;
const STT_VOCAB =
  "Martha Motors, Martha, Spark, Terra, Aero, Atlas, Volt GT, lakh, kilometres, EMI, AWD, kWh";

export async function POST(req: Request) {
  const rid = requestId();
  const limited = checkRate(req, rid);
  if (limited) return limited;
  if (!hasKey("groq")) return jsonError(503, "stt_unavailable", "Speech-to-text is not configured", rid);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "invalid_audio", "Expected multipart form data", rid);
  }
  const audio = form.get("audio");
  const sessionId = String(form.get("sessionId") ?? "");
  if (!(audio instanceof File) || audio.size === 0) return jsonError(400, "invalid_audio", "Missing audio file", rid);
  if (audio.size > MAX_BYTES) return jsonError(413, "audio_too_large", "Audio must be under 2 MB", rid);

  const cfg = getConfig();
  const t0 = performance.now();
  try {
    const file = new File([await audio.arrayBuffer()], "utterance.wav", { type: audio.type || "audio/wav" });
    const res = await getClient("groq").audio.transcriptions.create({
      file,
      model: cfg.GROQ_STT_MODEL,
      language: "en",
      response_format: "json",
      temperature: 0,
      prompt: STT_VOCAB,
    });
    const durationMs = Math.round(performance.now() - t0);
    logEvent({ rid, route: "stt", sessionId, bytes: audio.size, durationMs, status: 200 });
    return Response.json(
      { text: (res.text ?? "").trim(), durationMs },
      { headers: { "x-request-id": rid, "cache-control": "no-store" } },
    );
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? (err.status ?? 502) : 502;
    logEvent({ rid, route: "stt", sessionId, status, error: (err as Error).message?.slice(0, 200) });
    if (status === 429) return jsonError(429, "stt_rate_limited", "Speech-to-text limit reached", rid);
    if (status === 400) return jsonError(400, "invalid_audio", "Audio could not be decoded", rid);
    return jsonError(502, "upstream_error", "Speech-to-text failed", rid);
  }
}
