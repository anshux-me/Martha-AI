"use client";
import { Mic, Send } from "lucide-react";
import { useState } from "react";

const CHIPS = ["SUVs under ₹30L", "Charging at home?", "Compare Terra vs Atlas", "Request a callback"];

export function ChatComposer({
  disabled,
  showChips,
  onSend,
  onVoice,
}: {
  disabled: boolean;
  showChips: boolean;
  onSend: (text: string) => void;
  onVoice: () => void;
}) {
  const [text, setText] = useState("");
  const send = (t: string) => {
    const v = t.trim();
    if (!v || disabled) return;
    onSend(v);
    setText("");
  };

  return (
    <div className="mx-4 border-t border-white/10 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
      {showChips && (
        <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => send(c)}
              className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-muted transition hover:border-accent hover:text-text disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <button
          type="button"
          onClick={onVoice}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 text-muted transition hover:border-accent hover:text-accent"
          aria-label="Switch to voice"
          title="Switch to voice"
        >
          <Mic className="size-5" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Ask about models, range, charging, EMI…"
          aria-label="Message Martha"
          className="max-h-28 min-h-11 flex-1 resize-none rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[15px] text-text placeholder:text-muted focus:border-white/30 focus:outline-none"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
