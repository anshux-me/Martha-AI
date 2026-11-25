"use client";
// Fallback speech-to-text using the browser's Web Speech API (free).
// Used when Groq Whisper is rate-limited. Note: Chrome sends this audio to Google's service.

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class BrowserSTT {
  private rec: Recognition | null = null;
  private active = false;

  static isSupported(): boolean {
    return getCtor() !== null;
  }

  /** Listen for one utterance. Calls onFinal with the text (possibly empty). */
  listenOnce(handlers: { onInterim?: (t: string) => void; onFinal: (t: string) => void; onError: (code: string) => void }) {
    const Ctor = getCtor();
    if (!Ctor) return handlers.onError("unsupported");
    this.stop();
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let delivered = false;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) handlers.onInterim?.(interim);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      delivered = true;
      this.active = false;
      handlers.onError(e.error);
    };
    rec.onend = () => {
      this.active = false;
      if (!delivered) {
        delivered = true;
        handlers.onFinal(finalText.trim());
      }
    };
    this.rec = rec;
    this.active = true;
    rec.start();
  }

  get listening() {
    return this.active;
  }

  stop() {
    if (this.rec) {
      this.rec.onend = null;
      this.rec.onresult = null;
      this.rec.onerror = null;
      try {
        this.rec.abort();
      } catch {
        /* ignore */
      }
    }
    this.rec = null;
    this.active = false;
  }
}
