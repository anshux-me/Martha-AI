import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  GROQ_API_KEY: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
  GROQ_STT_MODEL: z.string().default("whisper-large-v3-turbo"),
  CHAT_CHAIN: z
    .string()
    .default("groq:openai/gpt-oss-120b,groq:openai/gpt-oss-20b,groq:qwen/qwen3.8-27b,gemini:gemini-flash-lite-latest"),
  REPORT_CHAIN: z
    .string()
    .default("groq:openai/gpt-oss-120b,groq:openai/gpt-oss-20b,gemini:gemini-flash-latest"),
  REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("low"),
  CHAT_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.4),
  CHAT_MAX_TOKENS: z.coerce.number().int().positive().default(250),
  HISTORY_MAX_MESSAGES: z.coerce.number().int().positive().default(12),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),
  // Martha's voice: "groq" = Groq Orpheus (falls back to the browser voice), "browser" = on-device only
  TTS_ENGINE: z.enum(["groq", "browser"]).default("groq"),
  GROQ_TTS_MODEL: z.string().default("canopylabs/orpheus-v1-english"),
  GROQ_TTS_VOICE: z.string().default("hannah"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

/** Parsed lazily so `next build` works without secrets. */
export function getConfig(): AppConfig {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}

export type ChainEntry = { provider: "groq" | "gemini"; model: string };

export function parseChain(raw: string): ChainEntry[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      const provider = s.slice(0, i) as ChainEntry["provider"];
      const model = s.slice(i + 1);
      if ((provider !== "groq" && provider !== "gemini") || !model) {
        throw new Error(`Invalid chain entry "${s}" (expected groq:<model> or gemini:<model>)`);
      }
      return { provider, model };
    });
}
