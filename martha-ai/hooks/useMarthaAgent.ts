"use client";
/**
 * The whole conversation controller: voice pipeline (VAD → STT → chat stream → on-device speech),
 * chat mode, barge-in, fallbacks, end-of-call report and browser persistence.
 *
 * Every function below reads only refs (never React state), so callbacks registered once
 * (VAD, speech events) always see current values.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MicVAD } from "@ricky0123/vad-web";
import { BrowserSTT } from "@/lib/client/browser-stt";
import {
  clearSession,
  DEFAULT_VOICE_PREFS,
  loadSession,
  loadVoicePrefs,
  newSessionId,
  saveSession,
  saveVoicePrefs,
  type VoicePrefs,
} from "@/lib/client/session";
import { SpeechOutput } from "@/lib/client/speech-output";
import type { StoredMessage } from "@/lib/export";
import { GREETING } from "@/lib/prompts/system";
import type { Report } from "@/lib/schemas";
import { SentenceSplitter } from "@/lib/sentence-splitter";
import { readSSE } from "@/lib/sse";

export type Mode = "voice" | "chat";
export type AgentStatus =
  | "idle" // chat ready / nothing running
  | "primer" // waiting for the visitor to allow the microphone
  | "connecting"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "ending"
  | "report";
export type Toast = { id: number; kind: "info" | "warning" | "error"; text: string };
export type DebugInfo = {
  model?: string;
  sttMs?: number;
  ttftMs?: number;
  firstAudioMs?: number;
  sttSource?: "groq" | "browser";
  ttsEngine?: "groq" | "browser";
};

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const MAX_UTTERANCE_SAMPLES = 16000 * 30;

export function useMarthaAgent() {
  // ---------- state (for rendering) ----------
  const [mode, setModeState] = useState<Mode>("voice");
  const [status, setStatusState] = useState<AgentStatus>("idle");
  const [messages, setMessagesState] = useState<StoredMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [caption, setCaption] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [muted, setMutedState] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefsState] = useState<VoicePrefs>(DEFAULT_VOICE_PREFS);
  const [debug, setDebug] = useState<DebugInfo>({});
  const [hasSavedSession, setHasSavedSession] = useState(false);

  // ---------- refs (source of truth for logic) ----------
  const modeRef = useRef<Mode>("voice");
  const statusRef = useRef<AgentStatus>("idle");
  const messagesRef = useRef<StoredMessage[]>([]);
  const mutedRef = useRef(false);
  const prefsRef = useRef<VoicePrefs>(DEFAULT_VOICE_PREFS);
  const sessionRef = useRef({ id: "", startedAt: "" });
  const reportRef = useRef<Report | null>(null);

  const speechRef = useRef<SpeechOutput | null>(null);
  const vadRef = useRef<MicVAD | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const browserSttRef = useRef<BrowserSTT | null>(null);
  const sttSourceRef = useRef<"groq" | "browser">("groq");

  const abortRef = useRef<AbortController | null>(null);
  const turnRef = useRef(0);
  const streamDoneRef = useRef(false);
  const committedRef = useRef(false); // assistant message of the current turn already added
  const spokenRef = useRef<string[]>([]);
  const captionQueueRef = useRef<string[]>([]);
  const errorsRef = useRef(0);
  const utteranceEndRef = useRef(0);
  const firstAudioLoggedRef = useRef(false);
  const pulseRef = useRef(0);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speech = () => {
    if (!speechRef.current) {
      const sp = new SpeechOutput();
      sp.onEngineFallback = (reason) => {
        setDebug((d) => ({ ...d, ttsEngine: "browser" }));
        showToast(
          "info",
          reason === "tts_terms_required"
            ? "Groq's voice isn't enabled on this account yet, so Martha is using your browser's voice."
            : reason === "tts_rate_limited"
              ? "Groq's free voice limit was reached, so Martha is using your browser's voice for now."
              : "Groq's voice is unavailable right now, so Martha is using your browser's voice.",
        );
      };
      speechRef.current = sp;
      applySpeechPrefs(sp, prefsRef.current);
    }
    return speechRef.current;
  };
  function applySpeechPrefs(sp: SpeechOutput, p: VoicePrefs) {
    sp.configure({
      engine: p.engine,
      browserVoices: voicesRef.current,
      browserVoiceURI: p.voiceURI,
      groqVoice: p.groqVoice,
      rate: p.rate,
    });
  }
  const browserStt = () => (browserSttRef.current ??= new BrowserSTT());

  // ---------- small setters keeping refs + state in sync ----------
  const setStatus = (s: AgentStatus) => {
    statusRef.current = s;
    setStatusState(s);
    tuneVad(s);
  };
  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  };
  const setMessages = (m: StoredMessage[]) => {
    messagesRef.current = m;
    setMessagesState(m);
  };
  const addMessage = (m: Omit<StoredMessage, "at">) =>
    setMessages([...messagesRef.current, { ...m, at: new Date().toISOString() }]);
  const showToast = (kind: Toast["kind"], text: string) => setToast({ id: Date.now(), kind, text });

  // ---------- mount: restore session + voices ----------
  useEffect(() => {
    const p = loadVoicePrefs();
    prefsRef.current = p;
    setPrefsState(p);
    const saved = loadSession();
    if (saved && saved.messages.length) {
      sessionRef.current = { id: saved.id, startedAt: saved.startedAt };
      setMessages(saved.messages);
      setMode(saved.mode);
      if (saved.report) {
        reportRef.current = saved.report;
        setReport(saved.report);
        setStatus("report");
      }
      setHasSavedSession(true);
    }
    SpeechOutput.loadVoices().then((v) => {
      voicesRef.current = v;
      setVoices(v);
      applySpeechPrefs(speech(), prefsRef.current);
    });
    const turns = turnRef;
    return () => {
      turns.current++;
      abortRef.current?.abort();
      speechRef.current?.cancel();
      void stopVoiceInput();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- persistence (browser only) ----------
  useEffect(() => {
    if (!messages.length || !sessionRef.current.id) return;
    saveSession({
      id: sessionRef.current.id,
      startedAt: sessionRef.current.startedAt,
      updatedAt: new Date().toISOString(),
      mode,
      messages,
      report: report ?? undefined,
    });
  }, [messages, mode, report]);

  // ---------- helpers ----------
  function ensureSession() {
    if (!sessionRef.current.id) sessionRef.current = { id: newSessionId(), startedAt: new Date().toISOString() };
    speech().sessionId = sessionRef.current.id;
  }

  function ensureGreeting(via: Mode): boolean {
    ensureSession();
    if (messagesRef.current.length) return false;
    addMessage({ role: "assistant", content: GREETING, via });
    return true;
  }

  function tuneVad(s: AgentStatus) {
    // Higher threshold while Martha talks so her own voice (echo) doesn't count as an interruption.
    const vad = vadRef.current;
    if (!vad) return;
    try {
      vad.setOptions(
        s === "speaking"
          ? { positiveSpeechThreshold: 0.85, negativeSpeechThreshold: 0.7, minSpeechMs: 300 }
          : { positiveSpeechThreshold: 0.6, negativeSpeechThreshold: 0.45, minSpeechMs: 250 },
      );
    } catch {
      /* older VAD builds */
    }
  }

  // ---------- voice input lifecycle ----------
  async function stopVoiceInput() {
    browserSttRef.current?.stop();
    const vad = vadRef.current;
    vadRef.current = null;
    if (vad) {
      try {
        await vad.destroy();
      } catch {
        /* ignore */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function voiceSupported(): string | null {
    if (typeof window === "undefined") return "unsupported";
    if (!navigator.mediaDevices?.getUserMedia) return "Your browser doesn't support microphone access.";
    if (!window.AudioContext || typeof WebAssembly === "undefined") return "Your browser doesn't support voice.";
    if (prefsRef.current.engine === "browser" && !SpeechOutput.isSupported()) {
      return "Your browser can't speak replies aloud.";
    }
    return null;
  }

  async function fallbackToChat(reason: string) {
    turnRef.current++;
    abortRef.current?.abort();
    speech().cancel();
    await stopVoiceInput();
    setMode("chat");
    setCaption("");
    setStreaming("");
    ensureGreeting("chat");
    setStatus("idle");
    showToast("warning", reason);
  }

  /** Must be called from a click handler (audio unlock on iOS). */
  async function startVoice(initialPrompt?: string) {
    const unsupported = voiceSupported();
    if (unsupported) return fallbackToChat(`${unsupported} Let's chat instead.`);
    speech().unlock();
    setMode("voice");
    setChatError(null);
    setStatus("connecting");
    errorsRef.current = 0;

    // Greeting (or "I'm listening") is spoken right away while the mic + VAD load.
    const isNew = ensureGreeting("voice");
    if (!initialPrompt) {
      beginSpeakingTurn();
      speakSentence(isNew ? GREETING : "I'm listening.");
      speech().endOfTurn();
      streamDoneRef.current = true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      streamRef.current = stream;
      try {
        window.localStorage.setItem("martha.mic", "1");
      } catch {
        /* ignore */
      }
      stream.getAudioTracks().forEach((t) => (t.enabled = !mutedRef.current));
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      if (sttSourceRef.current === "groq") {
        const { MicVAD } = await import("@ricky0123/vad-web");
        const vad = await MicVAD.new({
          model: "v5",
          baseAssetPath: "/vad/",
          onnxWASMBasePath: "/vad/",
          getStream: async () => stream,
          pauseStream: async () => {},
          resumeStream: async () => stream,
          positiveSpeechThreshold: 0.6,
          negativeSpeechThreshold: 0.45,
          redemptionMs: 600,
          minSpeechMs: 250,
          preSpeechPadMs: 300,
          startOnLoad: true,
          onSpeechRealStart: () => onVisitorSpeechStart(),
          onSpeechEnd: (audio: Float32Array) => void onVisitorSpeechEnd(audio),
        });
        if (modeRef.current !== "voice") {
          await vad.destroy();
          return;
        }
        vadRef.current = vad;
      }

      if (initialPrompt) {
        sendUser(initialPrompt, "voice");
      } else if (statusRef.current === "connecting") {
        afterSpeaking();
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      await fallbackToChat(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was blocked, so let's chat instead. You can switch back anytime."
          : "Voice couldn't start on this device, so let's chat instead.",
      );
    }
  }

  function onVisitorSpeechStart() {
    if (mutedRef.current || modeRef.current !== "voice") return;
    const s = statusRef.current;
    if ((s === "speaking" || s === "thinking") && prefsRef.current.bargeIn) bargeIn();
  }

  async function onVisitorSpeechEnd(audio: Float32Array) {
    if (mutedRef.current || modeRef.current !== "voice") return;
    const s = statusRef.current;
    if (s !== "listening" && s !== "connecting") return; // ignore echo / speech while busy
    utteranceEndRef.current = performance.now();
    setStatus("transcribing");
    try {
      const { utils } = await import("@ricky0123/vad-web");
      const samples = audio.length > MAX_UTTERANCE_SAMPLES ? audio.slice(-MAX_UTTERANCE_SAMPLES) : audio;
      const wav = utils.encodeWAV(samples, 1, 16000, 1, 16);
      const form = new FormData();
      form.append("audio", new Blob([wav], { type: "audio/wav" }), "utterance.wav");
      form.append("sessionId", sessionRef.current.id);
      const t0 = performance.now();
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (res.status === 429 || res.status === 503) return switchToBrowserStt();
      if (!res.ok) throw new Error(`stt ${res.status}`);
      const { text } = (await res.json()) as { text: string };
      setDebug((d) => ({ ...d, sttMs: Math.round(performance.now() - t0), sttSource: "groq" }));
      errorsRef.current = 0;
      if (modeRef.current !== "voice") return;
      if (!text || text.length < 2) return setStatus("listening");
      sendUser(text, "voice");
    } catch {
      errorsRef.current++;
      if (errorsRef.current >= 2) return switchToBrowserStt();
      showToast("info", "Sorry, I didn't catch that. Please say it again.");
      setStatus("listening");
    }
  }

  async function switchToBrowserStt() {
    if (!BrowserSTT.isSupported()) {
      return fallbackToChat("Voice is having trouble right now. Switched to chat; your conversation is saved.");
    }
    sttSourceRef.current = "browser";
    setDebug((d) => ({ ...d, sttSource: "browser" }));
    const vad = vadRef.current;
    vadRef.current = null;
    await vad?.destroy().catch(() => {});
    errorsRef.current = 0;
    showToast("info", "Switched to your browser's speech recognition to keep things going.");
    setStatus("listening");
    startBrowserListen();
  }

  function startBrowserListen() {
    if (modeRef.current !== "voice" || mutedRef.current || statusRef.current !== "listening") return;
    browserStt().listenOnce({
      onInterim: (t) => setCaption(t),
      onFinal: (t) => {
        setCaption("");
        if (modeRef.current !== "voice" || statusRef.current !== "listening") return;
        if (t.length < 2) return startBrowserListen();
        utteranceEndRef.current = performance.now();
        sendUser(t, "voice");
      },
      onError: (code) => {
        if (code === "not-allowed" || code === "unsupported" || code === "service-not-allowed") {
          void fallbackToChat("Voice is having trouble right now. Switched to chat; your conversation is saved.");
        } else {
          setTimeout(startBrowserListen, 500);
        }
      },
    });
  }

  // ---------- speaking ----------
  function beginSpeakingTurn() {
    const turn = ++turnRef.current;
    spokenRef.current = [];
    captionQueueRef.current = [];
    streamDoneRef.current = false;
    committedRef.current = false;
    firstAudioLoggedRef.current = false;
    const sp = speech();
    sp.onBoundary = () => (pulseRef.current = 1);
    sp.onSentenceEnd = (s) => {
      if (turn !== turnRef.current) return;
      spokenRef.current.push(s);
      captionQueueRef.current.shift();
      setCaption(captionQueueRef.current[0] ?? "");
    };
    sp.onIdle = () => {
      if (turn !== turnRef.current) return;
      if (streamDoneRef.current) afterSpeaking();
    };
    return turn;
  }

  function speakSentence(s: string) {
    if (!firstAudioLoggedRef.current) {
      firstAudioLoggedRef.current = true;
      if (utteranceEndRef.current) {
        setDebug((d) => ({ ...d, firstAudioMs: Math.round(performance.now() - utteranceEndRef.current) }));
      }
      setStatus("speaking");
    }
    captionQueueRef.current.push(s);
    if (captionQueueRef.current.length === 1) setCaption(s);
    speech().enqueue(s);
  }

  function afterSpeaking() {
    setCaption("");
    if (modeRef.current !== "voice") return;
    const s = statusRef.current;
    if (s === "speaking" || s === "thinking" || s === "connecting") {
      setStatus("listening");
      if (sttSourceRef.current === "browser") startBrowserListen();
    }
  }

  /** Visitor started talking over Martha: stop, keep only what was actually said. */
  function bargeIn() {
    const wasSpeaking = statusRef.current === "speaking";
    const spoken = spokenRef.current.join(" ").trim();
    turnRef.current++;
    abortRef.current?.abort();
    speech().cancel();
    setStreaming("");
    setCaption("");
    if (wasSpeaking) {
      const content = `${spoken || captionQueueRef.current[0] || ""}…`.trim();
      const msgs = [...messagesRef.current];
      const last = msgs[msgs.length - 1];
      if (committedRef.current && last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content, interrupted: true };
        setMessages(msgs);
      } else if (content !== "…") {
        addMessage({ role: "assistant", content, via: "voice", interrupted: true });
      }
    }
    setStatus("listening");
  }

  // ---------- conversation turns ----------
  function sendUser(text: string, via: Mode) {
    const trimmed = text.trim();
    if (!trimmed) return;
    ensureGreeting(via);
    addMessage({ role: "user", content: trimmed.slice(0, 2000), via });
    void runTurn();
  }

  async function runTurn() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const isVoice = modeRef.current === "voice";
    const turn = beginSpeakingTurn();
    const splitter = new SentenceSplitter();
    let full = "";
    setChatError(null);
    setStreaming("");
    setStatus("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          sessionId: sessionRef.current.id,
          mode: modeRef.current,
          messages: messagesRef.current.slice(-60).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        throw new ApiError(res.status, err?.error?.code ?? "http_error", err?.error?.message ?? "Martha couldn't respond.");
      }
      for await (const ev of readSSE(res.body)) {
        if (turn !== turnRef.current) return;
        const data = ev.data as Record<string, unknown>;
        if (ev.event === "meta") {
          setDebug((d) => ({ ...d, model: `${data.provider}:${data.model}` }));
        } else if (ev.event === "token") {
          full += String(data.t ?? "");
          setStreaming(full);
          if (isVoice) splitter.push(String(data.t ?? "")).forEach(speakSentence);
        } else if (ev.event === "done") {
          const timings = data.timings as { ttftMs?: number } | undefined;
          setDebug((d) => ({ ...d, ttftMs: timings?.ttftMs ?? d.ttftMs }));
        } else if (ev.event === "error") {
          throw new ApiError(503, String(data.code ?? "upstream_error"), String(data.message ?? "Martha couldn't respond."));
        }
      }
      if (turn !== turnRef.current) return;
      if (isVoice) {
        splitter.flush().forEach(speakSentence);
        speech().endOfTurn();
      }
      streamDoneRef.current = true;
      const content = full.trim() || "Sorry, could you say that again?";
      addMessage({ role: "assistant", content, via: modeRef.current });
      committedRef.current = true;
      setStreaming("");
      errorsRef.current = 0;
      if (!isVoice) setStatus("idle");
      else if (!full.trim()) {
        speakSentence(content);
        speech().endOfTurn();
      }
      else if (!speech().speaking) afterSpeaking();
    } catch (err) {
      if (ac.signal.aborted || turn !== turnRef.current) return;
      speech().cancel();
      setStreaming("");
      setCaption("");
      const message =
        err instanceof ApiError && err.code === "not_configured"
          ? err.message
          : err instanceof ApiError && (err.code === "all_providers_busy" || err.status === 429)
            ? "Martha is busy right now. Please try again in a minute. Your conversation is saved."
            : "Martha couldn't respond. Please retry.";
      if (modeRef.current === "voice") {
        errorsRef.current++;
        if (errorsRef.current >= 2) return fallbackToChat(message);
        showToast("warning", message);
        setStatus("listening");
        if (sttSourceRef.current === "browser") startBrowserListen();
      } else {
        setChatError(message);
        setStatus("idle");
      }
    }
  }

  // ---------- public actions ----------
  function startChat(initialPrompt?: string) {
    setMode("chat");
    setChatError(null);
    if (statusRef.current !== "report") setStatus("idle");
    ensureGreeting("chat");
    if (initialPrompt) sendUser(initialPrompt, "chat");
  }

  async function switchMode(next: Mode) {
    if (next === modeRef.current) return;
    if (next === "voice") return startVoice();
    if (statusRef.current === "speaking" || statusRef.current === "thinking") bargeIn();
    turnRef.current++;
    speech().cancel();
    await stopVoiceInput();
    setCaption("");
    startChat();
  }

  function sendText(text: string) {
    if (statusRef.current === "thinking") return;
    sendUser(text, "chat");
  }

  function retryLast() {
    const last = messagesRef.current[messagesRef.current.length - 1];
    if (last?.role === "user") void runTurn();
  }

  function setMuted(m: boolean) {
    mutedRef.current = m;
    setMutedState(m);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !m));
    if (m) browserSttRef.current?.stop();
    else if (sttSourceRef.current === "browser") startBrowserListen();
  }

  function updatePrefs(p: Partial<VoicePrefs>) {
    const next = { ...prefsRef.current, ...p };
    prefsRef.current = next;
    setPrefsState(next);
    saveVoicePrefs(next);
    applySpeechPrefs(speech(), next);
  }

  function previewVoice(p: Pick<VoicePrefs, "engine" | "groqVoice" | "voiceURI">) {
    const v = voices.find((x) => x.voiceURI === p.voiceURI) ?? voices[0] ?? null;
    void speech().preview("Hi, I'm Martha, your Martha Motors advisor.", {
      engine: p.engine,
      groqVoice: p.groqVoice,
      browserVoice: v,
      rate: prefsRef.current.rate,
    });
  }

  async function generateReport() {
    setReportError(null);
    setStatus("ending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current.id,
          mode: modeRef.current,
          startedAt: sessionRef.current.startedAt || new Date().toISOString(),
          endedAt: new Date().toISOString(),
          messages: messagesRef.current.slice(-200).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "Couldn't build the report.");
      const r = (await res.json()) as Report;
      reportRef.current = r;
      setReport(r);
    } catch (err) {
      setReportError((err as Error).message || "Couldn't build the report right now.");
    }
    setStatus("report");
  }

  /** End the conversation and build the report. Returns false if there was nothing to report. */
  async function endConversation(): Promise<boolean> {
    turnRef.current++;
    abortRef.current?.abort();
    speech().cancel();
    await stopVoiceInput();
    setCaption("");
    setStreaming("");
    if (!messagesRef.current.some((m) => m.role === "user")) {
      newConversation();
      return false;
    }
    await generateReport();
    return true;
  }

  /** Pause everything without ending (panel closed). */
  async function pause() {
    if (statusRef.current === "speaking" || statusRef.current === "thinking") bargeIn();
    turnRef.current++;
    speech().cancel();
    await stopVoiceInput();
    setCaption("");
    if (statusRef.current !== "report") setStatus("idle");
  }

  function newConversation() {
    turnRef.current++;
    abortRef.current?.abort();
    speech().cancel();
    void stopVoiceInput();
    clearSession();
    sessionRef.current = { id: "", startedAt: "" };
    reportRef.current = null;
    sttSourceRef.current = "groq";
    if (speechRef.current) applySpeechPrefs(speechRef.current, prefsRef.current);
    errorsRef.current = 0;
    setMessages([]);
    setReport(null);
    setReportError(null);
    setChatError(null);
    setStreaming("");
    setCaption("");
    setDebug({});
    setHasSavedSession(false);
    setStatus("idle");
  }

  /** Orb animation level 0..1: mic loudness while listening, word pulses while speaking. */
  const getLevel = useCallback((): number => {
    if (statusRef.current === "speaking") {
      pulseRef.current *= 0.9;
      return Math.max(pulseRef.current, speechRef.current?.outputLevel() ?? 0);
    }
    const a = analyserRef.current;
    if (!a || mutedRef.current) return 0;
    const buf = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / buf.length) * 4);
  }, []);

  const currentVoiceName = useMemo(() => {
    if (prefs.engine === "groq" && debug.ttsEngine !== "browser") return `Groq Orpheus · ${prefs.groqVoice}`;
    const v = voices.find((x) => x.voiceURI === prefs.voiceURI) ?? voices[0];
    return v ? `Browser · ${v.name}` : "Browser default";
  }, [voices, prefs.engine, prefs.groqVoice, prefs.voiceURI, debug.ttsEngine]);

  return {
    mode,
    status,
    messages,
    streaming,
    caption,
    report,
    reportError,
    chatError,
    toast,
    muted,
    voices,
    prefs,
    debug,
    hasSavedSession,
    currentVoiceName,
    getLevel,
    startVoice,
    startChat,
    switchMode,
    sendText,
    retryLast,
    setMuted,
    updatePrefs,
    previewVoice,
    endConversation,
    retryReport: generateReport,
    pause,
    newConversation,
    dismissToast: () => setToast(null),
    setPrimer: () => setStatus("primer"),
  };
}

export type MarthaAgent = ReturnType<typeof useMarthaAgent>;
