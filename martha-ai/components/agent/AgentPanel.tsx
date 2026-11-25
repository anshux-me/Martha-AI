"use client";
import { ChevronDown, MessageSquare, Mic, MicOff, PhoneOff, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgentUI } from "@/components/agent/AgentProvider";
import { ChatComposer } from "@/components/agent/ChatComposer";
import { ReportCard } from "@/components/agent/ReportCard";
import { Transcript } from "@/components/agent/Transcript";
import { STATUS_DOT, STATUS_LABEL, VoiceOrb } from "@/components/agent/VoiceOrb";
import { VoiceSettings } from "@/components/agent/VoiceSettings";

export function AgentPanel() {
  const { agent: a, isOpen, close } = useAgentUI();
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [debug, setDebug] = useState(false);

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
  const live = ["connecting", "listening", "transcribing", "thinking", "speaking"].includes(a.status);
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
    if (!had) close();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Talk to Martha">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => (live ? setConfirmEnd(true) : close())}
      />
      <div className="relative flex h-full w-full flex-col bg-surface shadow-[0_10px_40px_rgba(0,0,0,0.45)] md:w-[400px] md:rounded-l-[24px] lg:w-[440px] animate-[rise_280ms_cubic-bezier(0.22,1,0.36,1)]">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
          <div
            className="size-9 shrink-0 rounded-full"
            style={{ background: "conic-gradient(var(--accent), var(--accent-2), var(--accent))" }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium leading-tight">Martha</div>
            <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted" role="status" aria-live="polite">
              <span className={`size-1.5 rounded-full ${STATUS_DOT[a.status]} ${live ? "pulse-dot" : ""}`} />
              <span>{statusLabel}</span>
            </div>
          </div>
          {!inReport && (
            <div className="flex rounded-full bg-surface-2 p-0.5 text-sm" role="tablist" aria-label="Conversation mode">
              {(["voice", "chat"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={a.mode === m}
                  onClick={() => void a.switchMode(m)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                    a.mode === m ? "bg-accent font-semibold text-accent-fg" : "text-muted hover:text-text"
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
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
            aria-label="Close panel"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Toast */}
        {a.toast && (
          <div
            key={a.toast.id}
            role="status"
            className="rise mx-4 mt-3 flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm"
          >
            <span className={a.toast.kind === "warning" ? "text-warning" : a.toast.kind === "error" ? "text-danger" : "text-accent-2"}>
              ●
            </span>
            <span className="flex-1">{a.toast.text}</span>
            <button type="button" onClick={a.dismissToast} aria-label="Dismiss" className="text-muted">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {inReport ? (
            a.status === "ending" ? (
              <div className="flex flex-col gap-3 p-5" aria-busy="true">
                <p className="text-sm text-muted">Martha is writing up your call…</p>
                {[80, 100, 92, 60, 100, 70].map((w, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-surface-2" style={{ width: `${w}%` }} />
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
              <div className="flex min-h-full flex-col items-center px-5 pt-10 pb-6">
                <VoiceOrb status={a.status} muted={a.muted} getLevel={a.getLevel} size={170} />
                <p
                  className="mt-8 min-h-[4.5rem] max-w-sm text-center text-lg leading-7 text-text/90"
                  aria-live="off"
                >
                  {a.caption ||
                    (a.status === "listening"
                      ? a.muted
                        ? "You're muted."
                        : "Go ahead, I'm listening."
                      : a.status === "idle" && a.messages.length
                        ? "Call paused."
                        : "")}
                </p>
                {a.status === "idle" && (
                  <button
                    type="button"
                    onClick={() => void a.startVoice()}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-fg"
                  >
                    <Mic className="size-4" /> {a.messages.length ? "Resume call" : "Start talking"}
                  </button>
                )}
                {a.messages.length > 0 && (
                  <div className="mt-6 w-full">
                    <button
                      type="button"
                      onClick={() => setShowTranscript((s) => !s)}
                      className="mx-auto flex items-center gap-1 text-sm text-muted hover:text-text"
                      aria-expanded={showTranscript}
                    >
                      <ChevronDown className={`size-4 transition ${showTranscript ? "rotate-180" : ""}`} />
                      {showTranscript ? "Hide" : "Show"} transcript ({a.messages.length})
                    </button>
                    {showTranscript && (
                      <div className="mt-4 rounded-md border border-border p-4">
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
                <p className="mt-3 pl-9 text-sm text-muted">Martha is typing…</p>
              )}
              {a.chatError && (
                <div className="mt-3 ml-9 flex items-center gap-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm">
                  <span className="flex-1">{a.chatError}</span>
                  <button type="button" onClick={a.retryLast} className="inline-flex items-center gap-1 font-semibold">
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
              <footer className="flex items-center justify-center gap-6 border-t border-border px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                <RoundButton
                  label={a.muted ? "Unmute" : "Mute"}
                  onClick={() => a.setMuted(!a.muted)}
                  active={a.muted}
                >
                  {a.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                </RoundButton>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  disabled={!a.messages.length}
                  className="grid size-16 place-items-center rounded-full bg-danger text-white transition hover:brightness-110 disabled:opacity-40"
                  aria-label="End call"
                >
                  <PhoneOff className="size-6" />
                </button>
                <RoundButton label="Switch to chat" onClick={() => void a.switchMode("chat")}>
                  <MessageSquare className="size-5" />
                </RoundButton>
              </footer>
            )
          ) : (
            <>
              {a.messages.some((m) => m.role === "user") && (
                <div className="flex justify-end border-t border-border px-4 py-2">
                  <button type="button" onClick={() => setConfirmEnd(true)} className="text-sm text-muted hover:text-danger">
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
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 p-6">
            <div className="rise w-full max-w-sm rounded-md border border-border bg-surface-2 p-5">
              <p className="font-display text-xl">End the conversation?</p>
              <p className="mt-2 text-sm text-muted">You&apos;ll get a summary and can download your transcript.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmEnd(false)} className="rounded-full px-4 py-2 text-sm">
                  Keep talking
                </button>
                <button
                  type="button"
                  onClick={() => void end()}
                  className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white"
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

function RoundButton({
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
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-12 place-items-center rounded-full transition ${
        active ? "bg-text text-bg" : "bg-surface-2 text-text hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function MicPrimer({ onAllow, onChat }: { onAllow: () => void; onChat: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-accent/15 text-accent">
        <Mic className="size-7" />
      </div>
      <div>
        <h3 className="font-display text-2xl">Martha needs your microphone</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Audio is only used to transcribe what you say. Nothing is stored on our servers.
        </p>
      </div>
      <button
        type="button"
        onClick={onAllow}
        className="w-full max-w-xs rounded-full bg-accent px-5 py-3 font-semibold text-accent-fg transition hover:brightness-110"
      >
        Allow microphone
      </button>
      <button type="button" onClick={onChat} className="text-sm text-muted underline-offset-4 hover:underline">
        Use chat instead
      </button>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="size-3.5" /> You&apos;re talking to an AI. Headphones work best.
      </p>
    </div>
  );
}
