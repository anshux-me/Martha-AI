"use client";
import { ChevronDown, MessageSquare, Mic, MicOff, PhoneOff, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgentUI } from "@/components/agent/AgentProvider";
import { ChatComposer } from "@/components/agent/ChatComposer";
import { ReportCard } from "@/components/agent/ReportCard";
import { Transcript } from "@/components/agent/Transcript";
import { STATUS_DOT, STATUS_LABEL, VoiceVisualizer } from "@/components/agent/VoiceVisualizer";
import { VoiceSettings } from "@/components/agent/VoiceSettings";
import { Monogram } from "@/components/brand/Monogram";
import type { AgentStatus } from "@/hooks/useMarthaAgent";

const LIVE: AgentStatus[] = ["connecting", "listening", "transcribing", "thinking", "speaking"];

/** Big serif line under the visualizer. */
const HEADLINE: Partial<Record<AgentStatus, string>> = {
  connecting: "Connecting…",
  listening: "Listening",
  transcribing: "Got it…",
  thinking: "Thinking…",
  speaking: "Martha",
  idle: "Call paused",
};

function useCallTimer(running: boolean) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setStart((s) => s ?? Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const secs = start ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
  return {
    label: `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`,
    reset: () => setStart(null),
  };
}

export function AgentPanel() {
  const { agent: a, isOpen, close } = useAgentUI();
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [debug, setDebug] = useState(false);
  const live = LIVE.includes(a.status);
  const timer = useCallTimer(isOpen && a.mode === "voice" && live);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!a.toast) return;
    const t = setTimeout(a.dismissToast, 5000);
    return () => clearTimeout(t);
  }, [a.toast, a.dismissToast]);

  // Keyboard: Esc closes (asks to end if live), Space toggles mute in voice view
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (live) setConfirmEnd(true);
        else close();
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === " " && a.mode === "voice" && live && tag !== "TEXTAREA" && tag !== "INPUT" && tag !== "BUTTON") {
        e.preventDefault();
        a.setMuted(!a.muted);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, live, a, close]);

  if (!isOpen) return null;

  const inReport = a.status === "report" || a.status === "ending";
  const statusLabel = a.muted && a.status === "listening" ? "Muted" : STATUS_LABEL[a.status];
  const end = async () => {
    setConfirmEnd(false);
    const had = await a.endConversation();
    timer.reset();
    if (!had) close();
  };

  const headline = a.muted && a.status === "listening" ? "You're muted" : (HEADLINE[a.status] ?? "");
  const caption =
    a.caption ||
    (a.status === "listening"
      ? a.muted
        ? "Unmute when you're ready to talk."
        : "Go ahead — ask about range, charging, price or EMI."
      : a.status === "idle" && a.messages.length
        ? "Pick up where you left off."
        : "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Talk to Martha">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
        onClick={() => (live ? setConfirmEnd(true) : close())}
      />
      <div className="relative flex h-full w-full flex-col border-white/10 bg-[#0e1013] shadow-[0_10px_60px_rgba(0,0,0,0.55)] md:w-[420px] md:rounded-l-[22px] md:border-l lg:w-[440px] animate-[panel-in_320ms_cubic-bezier(0.22,1,0.36,1)]">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
            <Monogram className="size-6 text-text" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[22px] leading-none">Martha</div>
            <div
              className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap font-mono text-[10px] tracking-[0.14em] text-muted uppercase"
              role="status"
              aria-live="polite"
            >
              <span className={`size-1.5 rounded-full ${STATUS_DOT[a.status]} ${live ? "pulse-dot" : ""}`} />
              <span>{statusLabel}</span>
            </div>
          </div>
          {!inReport && (
            <div
              className="flex rounded-full border border-white/10 p-0.5 text-[13px]"
              role="tablist"
              aria-label="Conversation mode"
            >
              {(["voice", "chat"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={a.mode === m}
                  onClick={() => void a.switchMode(m)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                    a.mode === m ? "bg-text font-medium text-bg" : "text-muted hover:text-text"
                  }`}
                >
                  {m === "voice" ? <Mic className="size-3.5" /> : <MessageSquare className="size-3.5" />}
                  <span className="sr-only sm:not-sr-only">{m === "voice" ? "Voice" : "Chat"}</span>
                </button>
              ))}
            </div>
          )}
          <VoiceSettings voices={a.voices} prefs={a.prefs} onChange={a.updatePrefs} onPreview={a.previewVoice} />
          <button
            type="button"
            onClick={() => (live ? setConfirmEnd(true) : close())}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-text"
            aria-label="Close panel"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="mx-4 border-t border-white/10" />

        {/* Toast */}
        {a.toast && (
          <div
            key={a.toast.id}
            role="status"
            className="rise mx-4 mt-3 flex items-start gap-2.5 rounded-[12px] border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm"
          >
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                a.toast.kind === "warning" ? "bg-warning" : a.toast.kind === "error" ? "bg-danger" : "bg-accent-2"
              }`}
            />
            <span className="flex-1 leading-5">{a.toast.text}</span>
            <button type="button" onClick={a.dismissToast} aria-label="Dismiss" className="text-muted hover:text-text">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {inReport ? (
            a.status === "ending" ? (
              <div className="flex flex-col gap-3 p-5" aria-busy="true">
                <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Writing up your call…</p>
                {[80, 100, 92, 60, 100, 70].map((w, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-white/[0.06]" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <ReportCard
                report={a.report}
                error={a.reportError}
                messages={a.messages}
                onRetry={() => void a.retryReport()}
                onNew={a.newConversation}
              />
            )
          ) : a.mode === "voice" ? (
            a.status === "primer" ? (
              <MicPrimer onAllow={() => void a.startVoice()} onChat={() => a.startChat()} />
            ) : (
              <div className="flex min-h-full flex-col items-center px-6 pt-7 pb-6">
                <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
                  Voice call <span className="text-text/40">·</span> <span className="tabular">{timer.label}</span>
                </p>

                <div className="mt-6">
                  <VoiceVisualizer status={a.status} muted={a.muted} getLevel={a.getLevel} />
                </div>

                <h3 className="mt-4 font-display text-[30px] leading-none italic">{headline}</h3>
                <p className="mt-4 min-h-[4.5rem] max-w-[22rem] text-center text-[16px] leading-7 text-text/80" aria-live="off">
                  {caption}
                </p>

                {a.status === "idle" && (
                  <button
                    type="button"
                    onClick={() => void a.startVoice()}
                    className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-accent-fg transition hover:brightness-105"
                  >
                    <Mic className="size-4" /> {a.messages.length ? "Resume call" : "Start talking"}
                  </button>
                )}

                {a.messages.length > 0 && (
                  <div className="mt-auto w-full pt-6">
                    <button
                      type="button"
                      onClick={() => setShowTranscript((s) => !s)}
                      className="flex w-full items-center justify-between border-t border-white/10 pt-3 font-mono text-[11px] tracking-[0.14em] text-muted uppercase transition hover:text-text"
                      aria-expanded={showTranscript}
                    >
                      <span>Transcript · {a.messages.length}</span>
                      <ChevronDown className={`size-4 transition ${showTranscript ? "rotate-180" : ""}`} />
                    </button>
                    {showTranscript && (
                      <div className="mt-4">
                        <Transcript messages={a.messages} streaming={a.streaming} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="p-4">
              <Transcript messages={a.messages} streaming={a.streaming} />
              {a.status === "thinking" && !a.streaming && (
                <p className="mt-3 pl-10 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Martha is typing…</p>
              )}
              {a.chatError && (
                <div className="mt-3 ml-10 flex items-center gap-3 rounded-[12px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm">
                  <span className="flex-1">{a.chatError}</span>
                  <button type="button" onClick={a.retryLast} className="inline-flex items-center gap-1 font-medium">
                    <RotateCcw className="size-4" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!inReport &&
          (a.mode === "voice" ? (
            a.status !== "primer" && (
              <footer className="mx-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4 pb-[max(18px,env(safe-area-inset-bottom))]">
                <ControlButton
                  label={a.muted ? "Unmute" : "Mute"}
                  onClick={() => a.setMuted(!a.muted)}
                  active={a.muted}
                >
                  {a.muted ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
                </ControlButton>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  disabled={!a.messages.length}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-danger px-6 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  <PhoneOff className="size-[18px]" /> End call
                </button>
                <ControlButton label="Chat" onClick={() => void a.switchMode("chat")}>
                  <MessageSquare className="size-[18px]" />
                </ControlButton>
              </footer>
            )
          ) : (
            <>
              {a.messages.some((m) => m.role === "user") && (
                <div className="flex justify-end px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setConfirmEnd(true)}
                    className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase transition hover:text-danger"
                  >
                    End chat &amp; get summary
                  </button>
                </div>
              )}
              <ChatComposer
                disabled={a.status === "thinking"}
                showChips={a.messages.filter((m) => m.role === "user").length < 2}
                onSend={a.sendText}
                onVoice={() => void a.switchMode("voice")}
              />
            </>
          ))}

        {/* End confirmation */}
        {confirmEnd && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 p-6 md:rounded-l-[22px]">
            <div className="rise w-full max-w-sm rounded-[16px] border border-white/10 bg-[#14171b] p-5">
              <p className="font-display text-2xl">End the conversation?</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                You&apos;ll get a written summary and can download the transcript.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-text"
                >
                  Keep talking
                </button>
                <button
                  type="button"
                  onClick={() => void end()}
                  className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white"
                >
                  End &amp; summarise
                </button>
              </div>
            </div>
          </div>
        )}

        {debug && (
          <div className="pointer-events-none absolute bottom-24 left-3 rounded bg-black/80 px-2 py-1 font-mono text-[11px] leading-4 text-accent">
            <div>stt {a.debug.sttMs ?? "–"}ms ({a.debug.sttSource ?? "groq"})</div>
            <div>llm ttft {a.debug.ttftMs ?? "–"}ms</div>
            <div>speech start {a.debug.firstAudioMs ?? "–"}ms</div>
            <div>{a.debug.model ?? "model –"}</div>
            <div>voice {a.currentVoiceName ?? "default"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="group flex w-16 flex-col items-center gap-1.5">
      <span
        className={`grid size-11 place-items-center rounded-full border transition ${
          active
            ? "border-text bg-text text-bg"
            : "border-white/15 text-text group-hover:border-accent group-hover:text-accent"
        }`}
      >
        {children}
      </span>
      <span className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">{label}</span>
    </button>
  );
}

function MicPrimer({ onAllow, onChat }: { onAllow: () => void; onChat: () => void }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-6 px-7 py-10">
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Before we start</p>
      <div>
        <h3 className="font-display text-[34px] leading-[1.05]">
          Martha needs your <em className="text-accent">microphone</em>.
        </h3>
        <p className="mt-4 text-[15px] leading-6 text-muted">
          Your voice is only used to transcribe what you say. Nothing is stored on our servers.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onAllow}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-fg transition hover:brightness-105"
        >
          <Mic className="size-[18px]" /> Allow microphone
        </button>
        <button
          type="button"
          onClick={onChat}
          className="h-12 rounded-full border border-white/15 text-sm text-text/90 transition hover:border-white/30"
        >
          Type instead
        </button>
      </div>
      <p className="flex items-center gap-2 border-t border-white/10 pt-4 text-[13px] text-muted">
        <ShieldCheck className="size-4 shrink-0" /> You&apos;re talking to an AI. Headphones work best.
      </p>
    </div>
  );
}
