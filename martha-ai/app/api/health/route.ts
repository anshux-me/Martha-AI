import { getConfig, parseChain } from "@/lib/config";
import { hasKey } from "@/lib/llm/providers";

export const dynamic = "force-dynamic";

export function GET() {
  const c = getConfig();
  return Response.json(
    {
      status: "ok",
      stt: c.GROQ_STT_MODEL,
      tts: c.TTS_ENGINE === "groq" ? `groq:${c.GROQ_TTS_MODEL} (${c.GROQ_TTS_VOICE})` : "browser",
      chatChain: parseChain(c.CHAT_CHAIN).map((e) => `${e.provider}:${e.model}`),
      reportChain: parseChain(c.REPORT_CHAIN).map((e) => `${e.provider}:${e.model}`),
      providers: { groq: hasKey("groq"), gemini: hasKey("gemini") },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
