"use client";
import { Mic } from "lucide-react";
import { useEffect, useRef } from "react";
import { Monogram } from "@/components/brand/Monogram";
import type { StoredMessage } from "@/lib/export";

/** Minimal markdown for chat replies: **bold** and "- " bullets. */
function renderRich(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const bullet = /^\s*[-•*]\s+/.test(line);
    const content = line.replace(/^\s*[-•*]\s+/, "");
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="font-semibold text-text">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    return bullet ? (
      <div key={i} className="flex gap-2 pl-1">
        <span className="text-accent">•</span>
        <span>{parts}</span>
      </div>
    ) : (
      <p key={i} className={line.trim() ? "" : "h-2"}>
        {parts}
      </p>
    );
  });
}

export function Transcript({ messages, streaming }: { messages: StoredMessage[]; streaming: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  return (
    <div className="flex flex-col gap-4" aria-live="polite" aria-relevant="additions">
      {messages.map((m, i) =>
        m.role === "assistant" ? (
          <div key={i} className="rise flex gap-3">
            <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]" aria-hidden="true">
              <Monogram className="size-4 text-text" />
            </div>
            <div className="min-w-0 text-[15px] leading-6 text-text/90">
              {renderRich(m.content)}
              {m.interrupted && <span className="mt-1 inline-block text-xs text-muted">interrupted</span>}
            </div>
          </div>
        ) : (
          <div key={i} className="rise flex justify-end">
            <div className="max-w-[85%] rounded-[16px] rounded-br-[4px] border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[15px] leading-6">
              {m.via === "voice" && <Mic className="mr-1.5 inline size-3.5 text-muted" aria-label="spoken" />}
              {m.content}
            </div>
          </div>
        ),
      )}
      {streaming && (
        <div className="flex gap-3">
          <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]" aria-hidden="true">
            <Monogram className="size-4 text-text" />
          </div>
          <div className="caret min-w-0 text-[15px] leading-6 text-text/90">{renderRich(streaming)}</div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
