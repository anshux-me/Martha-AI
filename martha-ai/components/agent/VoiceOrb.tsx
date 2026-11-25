"use client";
import { useEffect, useRef } from "react";
import type { AgentStatus } from "@/hooks/useMarthaAgent";

/** Animated orb. Scale follows `getLevel()` (mic loudness / word pulses) via rAF — no re-renders. */
export function VoiceOrb({
  status,
  muted,
  getLevel,
  size = 180,
}: {
  status: AgentStatus;
  muted: boolean;
  getLevel: () => number;
  size?: number;
}) {
  const coreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const target = getLevel();
      smooth = smooth * 0.75 + target * 0.25;
      if (coreRef.current) coreRef.current.style.transform = `scale(${1 + smooth * 0.18})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel]);

  const state = muted && status === "listening" ? "muted" : status;
  return (
    <div className="orb" data-state={state} style={{ width: size, height: size }} aria-hidden="true">
      <div ref={coreRef} style={{ position: "absolute", inset: 0 }}>
        <div className="orb-core" />
        <div className="orb-shine" />
      </div>
      <div className="orb-ring" />
    </div>
  );
}

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Ready",
  primer: "Needs mic",
  connecting: "Connecting…",
  listening: "Listening",
  transcribing: "Got it…",
  thinking: "Thinking…",
  speaking: "Speaking",
  ending: "Writing up your call…",
  report: "Call ended",
};

export const STATUS_DOT: Record<AgentStatus, string> = {
  idle: "bg-muted",
  primer: "bg-muted",
  connecting: "bg-muted",
  listening: "bg-accent",
  transcribing: "bg-accent-2",
  thinking: "bg-accent-2",
  speaking: "bg-accent",
  ending: "bg-accent-2",
  report: "bg-muted",
};
