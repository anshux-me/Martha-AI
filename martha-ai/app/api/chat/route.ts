import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getConfig, parseChain } from "@/lib/config";
import { checkRate, jsonError, logEvent, requestId } from "@/lib/http";
import { AllProvidersBusyError, NotConfiguredError, streamWithFallback } from "@/lib/llm/chain";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { ChatRequestSchema } from "@/lib/schemas";
import { trimHistory } from "@/lib/history";
import { sseEncode } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const rid = requestId();
  const limited = checkRate(req, rid);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON", rid);
  }
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request", rid);

  const cfg = getConfig();
  const { mode, messages, sessionId } = parsed.data;
  const chatMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(mode) },
    ...trimHistory(messages, cfg.HISTORY_MAX_MESSAGES),
  ];

  const t0 = performance.now();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let ttftMs: number | null = null;
      let model = "";
      try {
        for await (const ev of streamWithFallback(parseChain(cfg.CHAT_CHAIN), {
          messages: chatMessages,
          temperature: cfg.CHAT_TEMPERATURE,
          // chat replies may use short lists; voice replies stay short
          max_tokens: mode === "chat" ? Math.round(cfg.CHAT_MAX_TOKENS * 2) : cfg.CHAT_MAX_TOKENS,
        })) {
          if (ev.type === "meta") {
            model = `${ev.entry.provider}:${ev.entry.model}`;
            controller.enqueue(sseEncode("meta", { provider: ev.entry.provider, model: ev.entry.model }));
          } else if (ev.type === "token") {
            if (ttftMs === null) ttftMs = Math.round(performance.now() - t0);
            controller.enqueue(sseEncode("token", { t: ev.text }));
          } else {
            controller.enqueue(
              sseEncode("done", { finishReason: ev.finishReason, usage: ev.usage ?? null, timings: { ttftMs } }),
            );
          }
        }
        logEvent({ rid, route: "chat", sessionId, mode, model, ttftMs, totalMs: Math.round(performance.now() - t0), status: 200 });
      } catch (err) {
        const busy = err instanceof AllProvidersBusyError;
        const unconfigured = err instanceof NotConfiguredError;
        logEvent({ rid, route: "chat", sessionId, model, status: busy || unconfigured ? 503 : 502, error: (err as Error).message?.slice(0, 200) });
        controller.enqueue(
          sseEncode("error", {
            code: unconfigured ? "not_configured" : busy ? "all_providers_busy" : "upstream_error",
            message: unconfigured
              ? "Martha isn't set up yet: the server has no AI API key."
              : busy
                ? "Martha is busy right now. Please try again in a minute."
                : "Martha couldn't respond. Please retry.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-request-id": rid,
    },
  });
}
