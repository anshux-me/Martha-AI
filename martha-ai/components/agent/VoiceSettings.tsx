"use client";
import { Play, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { VoicePrefs } from "@/lib/client/session";
import { ORPHEUS_VOICES } from "@/lib/tts-voices";

type Selection = Pick<VoicePrefs, "engine" | "groqVoice" | "voiceURI">;

const encode = (p: Selection, fallbackURI: string) =>
  p.engine === "groq" ? `groq:${p.groqVoice}` : `browser:${p.voiceURI ?? fallbackURI}`;

export function VoiceSettings({
  voices,
  prefs,
  onChange,
  onPreview,
}: {
  voices: SpeechSynthesisVoice[];
  prefs: VoicePrefs;
  onChange: (p: Partial<VoicePrefs>) => void;
  onPreview: (p: Selection) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const value = encode(prefs, voices[0]?.voiceURI ?? "");
  const decode = (v: string): Selection => {
    const i = v.indexOf(":");
    const kind = v.slice(0, i);
    const id = v.slice(i + 1);
    return kind === "groq"
      ? { engine: "groq", groqVoice: id, voiceURI: prefs.voiceURI }
      : { engine: "browser", groqVoice: prefs.groqVoice, voiceURI: id || null };
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
        aria-label="Voice settings"
        aria-expanded={open}
      >
        <Settings2 className="size-5" />
      </button>
      {open && (
        <div className="rise absolute right-0 z-20 mt-2 w-72 rounded-md border border-border bg-surface-2 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <label className="text-xs font-semibold tracking-[0.12em] text-muted uppercase" htmlFor="voice-select">
            Martha&apos;s voice
          </label>
          <div className="mt-2 flex gap-2">
            <select
              id="voice-select"
              value={value}
              onChange={(e) => onChange(decode(e.target.value))}
              className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 py-2 text-sm"
            >
              <optgroup label="Groq Orpheus (natural)">
                {ORPHEUS_VOICES.map((v, i) => (
                  <option key={v.id} value={`groq:${v.id}`}>
                    {v.label}
                    {i === 0 ? " · Recommended" : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Your browser (on-device)">
                {voices.length === 0 && <option value="browser:">Browser default</option>}
                {voices.map((v) => (
                  <option key={v.voiceURI} value={`browser:${v.voiceURI}`}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              type="button"
              onClick={() => onPreview(decode(value))}
              className="grid size-9 shrink-0 place-items-center rounded-sm bg-surface text-accent"
              aria-label="Preview voice"
            >
              <Play className="size-4" />
            </button>
          </div>

          <label className="mt-4 block text-xs font-semibold tracking-[0.12em] text-muted uppercase" htmlFor="rate">
            Speaking speed · {prefs.rate.toFixed(1)}×
          </label>
          <input
            id="rate"
            type="range"
            min={0.8}
            max={1.3}
            step={0.1}
            value={prefs.rate}
            onChange={(e) => onChange({ rate: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--accent)]"
          />

          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>Let me interrupt Martha</span>
            <input
              type="checkbox"
              checked={prefs.bargeIn}
              onChange={(e) => onChange({ bargeIn: e.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
          </label>
          <p className="mt-3 text-xs leading-5 text-muted">
            {prefs.engine === "groq"
              ? "Groq voices sound most natural. If Groq's free limit is reached, Martha switches to your browser's voice."
              : "Browser voices are generated on your device, so they may sound different on other devices."}
          </p>
        </div>
      )}
    </div>
  );
}
