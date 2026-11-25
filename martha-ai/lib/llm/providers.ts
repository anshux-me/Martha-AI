import "server-only";
import OpenAI from "openai";
import { getConfig } from "@/lib/config";

const BASE_URLS = {
  groq: "https://api.groq.com/openai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
} as const;

export type Provider = keyof typeof BASE_URLS;

const clients = new Map<Provider, OpenAI>();

export function hasKey(provider: Provider): boolean {
  const c = getConfig();
  return provider === "groq" ? !!c.GROQ_API_KEY : !!c.GEMINI_API_KEY;
}

export function getClient(provider: Provider): OpenAI {
  let client = clients.get(provider);
  if (!client) {
    const c = getConfig();
    client = new OpenAI({
      apiKey: provider === "groq" ? c.GROQ_API_KEY : c.GEMINI_API_KEY,
      baseURL: BASE_URLS[provider],
      maxRetries: 0, // the fallback chain handles retries
      timeout: 30_000,
    });
    clients.set(provider, client);
  }
  return client;
}

/** gpt-oss models on Groq are reasoning models and accept reasoning_effort. */
export function isReasoningModel(model: string): boolean {
  return /gpt-oss/i.test(model);
}
