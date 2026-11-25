"use client";
import { useEffect, useRef } from "react";
import { Monogram } from "@/components/brand/Monogram";
import type { AgentStatus } from "@/hooks/useMarthaAgent";

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Ready",
  primer: "Needs mic",
  connecting: "Connecting",
  listening: "Listening",
  transcribing: "Got it",
  thinking: "Thinking",
  speaking: "Speaking",
  ending: "Writing up",
  report: "Call ended",
};

export const STATUS_DOT: Record<AgentStatus, string> = {
  idle: "bg-muted",
  primer: "bg-muted",
  connecting: "bg-muted",
  listening: "bg-accent",
  transcribing: "bg-accent-2",
  thinking: "bg-accent-2",
  speaking: "bg-text",
  ending: "bg-accent-2",
  report: "bg-muted",
};

const BARS = 72;

/**
 * Ring of fine radial bars drawn on a canvas (no React re-renders per frame).
 * - listening: bars follow the microphone level, plus ripple rings
 * - speaking: bars follow Martha's audio output
 * - thinking / transcribing / connecting: a highlight sweeps around the ring
 * - idle / muted: still, dim ticks
 */
export function VoiceVisualizer({
  status,
  muted,
  getLevel,
  size = 232,
}: {
  status: AgentStatus;
  muted: boolean;
  getLevel: () => number;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ status, muted });
  stateRef.current = { status, muted };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const css = getComputedStyle(document.documentElement);
    const color = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback;
    const ACCENT = color("--accent", "#2ee6a6");
    const ACCENT2 = color("--accent-2", "#4c8dff");
    const TEXT = color("--text", "#f2f4f7");
    const MUTED = color("--text-muted", "#9aa3af");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lengths = new Float32Array(BARS).fill(3);
    const c = size / 2;
    const inner = size * 0.3;
    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const { status: s, muted: m } = stateRef.current;
      const t = reduced ? 0 : (now - start) / 1000;
      const listening = s === "listening" && !m;
      const speaking = s === "speaking";
      const busy = s === "thinking" || s === "transcribing" || s === "connecting" || s === "ending";
      const level = listening || speaking ? Math.min(1, getLevel() * 1.4) : 0;
      const head = ((t * 0.9) % 1) * BARS;

      ctx.clearRect(0, 0, size, size);

      // inner hairline circle
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(c, c, inner - 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      for (let i = 0; i < BARS; i++) {
        let target = 3;
        let alpha = 0.35;
        let stroke = MUTED;

        if (listening) {
          const wave = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + t * 3.1) * Math.cos(i * 0.6 - t * 2.3));
          const idleBreath = 1.6 * (1 + Math.sin(t * 2 + i * 0.35));
          target = 3 + idleBreath + level * 34 * wave;
          alpha = 0.55 + 0.45 * Math.min(1, level * 2);
          stroke = ACCENT;
        } else if (speaking) {
          const wave = 0.5 + 0.5 * Math.abs(Math.sin(i * 0.9 + t * 4.2));
          target = 3 + level * 30 * wave + 1.2 * (1 + Math.sin(t * 3 + i * 0.5));
          alpha = 0.6 + 0.4 * level;
          stroke = TEXT;
        } else if (busy) {
          const d = Math.min(Math.abs(i - head), BARS - Math.abs(i - head));
          const glow = Math.max(0, 1 - d / 10);
          target = 3 + glow * 10;
          alpha = 0.2 + glow * 0.8;
          stroke = ACCENT2;
        } else if (m && s === "listening") {
          alpha = 0.2;
        }

        lengths[i] += (target - lengths[i]) * 0.22;
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(c + cos * inner, c + sin * inner);
        ctx.lineTo(c + cos * (inner + lengths[i]), c + sin * (inner + lengths[i]));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getLevel, size]);

  const listening = status === "listening" && !muted;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-hidden="true">
      {listening && (
        <>
          <span className="ripple" style={{ width: size * 0.6, height: size * 0.6 }} />
          <span className="ripple ripple-delay" style={{ width: size * 0.6, height: size * 0.6 }} />
        </>
      )}
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="absolute inset-0" />
      <div
        className={`relative grid place-items-center rounded-full border border-white/10 bg-white/[0.03] transition ${
          muted ? "opacity-40" : ""
        }`}
        style={{ width: size * 0.4, height: size * 0.4 }}
      >
        <Monogram className="size-10 text-text" />
      </div>
    </div>
  );
}
