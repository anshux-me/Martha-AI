import type { ChatMessage } from "@/lib/schemas";

/** Keep the first assistant greeting for context, plus the last `max` messages. */
export function trimHistory(messages: ChatMessage[], max: number): ChatMessage[] {
  if (messages.length <= max) return messages;
  const first = messages[0];
  const tail = messages.slice(-max);
  return first.role === "assistant" ? [first, ...tail] : tail;
}

const MAX_TRANSCRIPT_CHARS = 14_000; // ≈ 3.5–4K tokens

/** Report input: keep every visitor message; shorten older Martha messages to their first sentence if too long. */
export function compressTranscript(messages: ChatMessage[], maxChars = MAX_TRANSCRIPT_CHARS): string {
  const line = (m: ChatMessage, short: boolean) => {
    const text =
      short && m.role === "assistant" ? (m.content.match(/^.*?[.!?](\s|$)/)?.[0] ?? m.content) : m.content;
    return `${m.role === "assistant" ? "Martha" : "Visitor"}: ${text.trim()}`;
  };
  const full = messages.map((m) => line(m, false)).join("\n");
  if (full.length <= maxChars) return full;
  const keepFull = 6; // last messages kept verbatim
  return messages
    .map((m, i) => line(m, i < messages.length - keepFull))
    .join("\n")
    .slice(-maxChars);
}
