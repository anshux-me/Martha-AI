import "server-only";
import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChainEntry } from "@/lib/config";
import { getConfig } from "@/lib/config";
import { getClient, hasKey, isReasoningModel } from "@/lib/llm/providers";

const COOLDOWN_MS = 60_000;
const cooldown = new Map<string, number>(); // "provider:model" -> until (ms)

const keyOf = (e: ChainEntry) => `${e.provider}:${e.model}`;

/** Errors that should move us on to the next model/provider. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof OpenAI.APIConnectionError) return true;
  if (err instanceof OpenAI.APIError) {
    const s = err.status ?? 0;
    if (s === 429 || s >= 500) return true;
    // Model removed/renamed on a free tier: skip it rather than failing the visitor.
    if (s === 404 || ((s === 400 || s === 403) && /model/i.test(err.message))) return true;
  }
  return false;
}

export function markCooldown(e: ChainEntry, err: unknown) {
  if (err instanceof OpenAI.APIError && err.status === 429) cooldown.set(keyOf(e), Date.now() + COOLDOWN_MS);
}

/** Usable entries in order: has a key, not cooling down. Falls back to cooling ones if nothing else is left. */
export function usableEntries(chain: ChainEntry[]): ChainEntry[] {
  const now = Date.now();
  const withKey = chain.filter((e) => hasKey(e.provider));
  const warm = withKey.filter((e) => (cooldown.get(keyOf(e)) ?? 0) <= now);
  return warm.length ? warm : withKey;
}

type BaseParams = {
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
};

function paramsFor(e: ChainEntry, p: BaseParams) {
  const params: Record<string, unknown> = {
    model: e.model,
    messages: p.messages,
    temperature: p.temperature,
  };
  if (p.max_tokens) params.max_tokens = p.max_tokens;
  if (p.json) params.response_format = { type: "json_object" };
  if (isReasoningModel(e.model)) params.reasoning_effort = getConfig().REASONING_EFFORT;
  return params;
}

export class NotConfiguredError extends Error {
  constructor() {
    super("No AI provider is configured. Set GROQ_API_KEY (and optionally GEMINI_API_KEY) in .env.local.");
  }
}

function requireEntries(chain: ChainEntry[]): ChainEntry[] {
  const entries = usableEntries(chain);
  if (!entries.length) throw new NotConfiguredError();
  return entries;
}

export class AllProvidersBusyError extends Error {
  constructor(public readonly lastError: unknown) {
    super("All providers are busy or unavailable");
  }
}

/** Streaming chat with fallback. Falls through only if the failure happens before the first token. */
export async function* streamWithFallback(
  chain: ChainEntry[],
  p: BaseParams,
): AsyncGenerator<{ type: "meta"; entry: ChainEntry } | { type: "token"; text: string } | { type: "done"; finishReason: string | null; usage?: unknown }> {
  const entries = requireEntries(chain);
  let lastErr: unknown = new Error("No providers configured (set GROQ_API_KEY)");
  for (const e of entries) {
    let started = false;
    try {
      const stream = await getClient(e.provider).chat.completions.create({
        ...(paramsFor(e, p) as unknown as ChatCompletionCreateParamsNonStreaming),
        stream: true,
      });
      let finishReason: string | null = null;
      let usage: unknown;
      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content;
        if (text) {
          if (!started) {
            started = true;
            yield { type: "meta", entry: e };
          }
          yield { type: "token", text };
        }
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        if ((chunk as { usage?: unknown }).usage) usage = (chunk as { usage?: unknown }).usage;
      }
      if (!started) yield { type: "meta", entry: e };
      yield { type: "done", finishReason, usage };
      return;
    } catch (err) {
      if (started) throw err; // mid-answer failure: surface it, don't restart silently
      lastErr = err;
      markCooldown(e, err);
      if (!isRetryable(err)) throw err;
    }
  }
  throw new AllProvidersBusyError(lastErr);
}

/** Non-streaming completion with fallback (used for the report). */
export async function completeWithFallback(
  chain: ChainEntry[],
  p: BaseParams,
): Promise<{ entry: ChainEntry; content: string }> {
  const entries = requireEntries(chain);
  let lastErr: unknown = new Error("No providers configured (set GROQ_API_KEY)");
  for (const e of entries) {
    try {
      const res = await getClient(e.provider).chat.completions.create(
        paramsFor(e, p) as unknown as ChatCompletionCreateParamsNonStreaming,
      );
      return { entry: e, content: res.choices[0]?.message?.content ?? "" };
    } catch (err) {
      lastErr = err;
      markCooldown(e, err);
      if (!isRetryable(err)) throw err;
    }
  }
  throw new AllProvidersBusyError(lastErr);
}
