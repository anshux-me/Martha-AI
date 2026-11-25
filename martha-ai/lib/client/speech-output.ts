"use client";
import { toSpeechText } from "@/lib/speech-text";
import { DEFAULT_ORPHEUS_VOICE, TTS_MAX_CHARS } from "@/lib/tts-voices";
import { pickBestVoice, rankVoices } from "@/lib/voices";

export type SpeechEngine = "groq" | "browser";

/**
 * Speaks Martha's replies, sentence by sentence, in order.
 *
 * Engine "groq": Groq Orpheus via /api/tts, played with Web Audio. To respect the free tier
 * (~10 requests/min), the first sentence of a reply is sent alone (fast start) and the rest are
 * merged into chunks of up to ~200 characters. Any failure (rate limit, terms not accepted,
 * network) switches to the browser engine for the rest of the session.
 *
 * Engine "browser": the browser's built-in speechSynthesis (free, on-device).
 */
export class SpeechOutput {
  engine: SpeechEngine = "groq";
  sessionId = "";

  private browserVoice: SpeechSynthesisVoice | null = null;
  private rate = 1;
  private groqVoice: string = DEFAULT_ORPHEUS_VOICE;

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private current: AudioBufferSourceNode | null = null;
  private chain: Promise<void> = Promise.resolve();
  private fetchAbort: AbortController | null = null;
  private pending: string[] = [];
  private sentFirst = false;
  private outstanding = 0;
  private live = new Set<SpeechSynthesisUtterance>();
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private generation = 0;

  /** Called on each word boundary (browser engine only; drives the orb pulse). */
  onBoundary: (() => void) | null = null;
  /** Called after each sentence has been spoken, with its text. */
  onSentenceEnd: ((text: string) => void) | null = null;
  /** Called when everything queued has been spoken. */
  onIdle: (() => void) | null = null;
  /** Called once if Groq voice fails and we switch to the browser voice. */
  onEngineFallback: ((reason: string) => void) | null = null;

  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  /** Voices can load asynchronously; resolves with the English voices ranked best-first. */
  static loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
    if (!SpeechOutput.isSupported()) return Promise.resolve([]);
    const now = window.speechSynthesis.getVoices();
    if (now.length) return Promise.resolve(rankVoices(now));
    return new Promise((resolve) => {
      const done = () => resolve(rankVoices(window.speechSynthesis.getVoices()));
      const t = setTimeout(done, timeoutMs);
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        () => {
          clearTimeout(t);
          done();
        },
        { once: true },
      );
    });
  }

  configure(opts: {
    engine: SpeechEngine;
    browserVoices: SpeechSynthesisVoice[];
    browserVoiceURI: string | null;
    groqVoice: string;
    rate: number;
  }) {
    this.engine = opts.engine;
    this.browserVoice = pickBestVoice(opts.browserVoices, opts.browserVoiceURI);
    this.groqVoice = opts.groqVoice;
    this.rate = opts.rate;
  }

  get speaking(): boolean {
    return this.outstanding > 0 || this.live.size > 0;
  }

  /** Output loudness 0..1 while Groq audio plays (for the orb). */
  outputLevel(): number {
    const a = this.analyser;
    if (!a || !this.current) return 0;
    const buf = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / buf.length) * 3);
  }

  /** Call inside a user gesture (iOS Safari): unlocks Web Audio and speech synthesis. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx && window.AudioContext) {
      this.ctx = new AudioContext();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.connect(this.ctx.destination);
    }
    void this.ctx?.resume();
    if (SpeechOutput.isSupported()) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  }

  /** Queue one sentence. */
  enqueue(text: string) {
    if (!toSpeechText(text)) {
      this.onSentenceEnd?.(text);
      if (!this.speaking) this.onIdle?.();
      return;
    }
    if (this.engine === "groq" && this.ctx) {
      if (!this.sentFirst) {
        this.sentFirst = true;
        this.sendChunk([text]);
      } else {
        this.pending.push(text);
        if (this.pending.join(" ").length >= TTS_MAX_CHARS - 40) this.flushPending();
      }
      return;
    }
    this.chainBrowser([text]);
  }

  /** The reply has finished streaming: send whatever is still buffered. */
  endOfTurn() {
    this.flushPending();
    this.sentFirst = false;
  }

  /** Stop immediately (barge-in / end call). Does not fire onIdle. */
  cancel() {
    this.generation++;
    this.fetchAbort?.abort();
    this.fetchAbort = null;
    try {
      this.current?.stop();
    } catch {
      /* already stopped */
    }
    this.current = null;
    this.chain = Promise.resolve();
    this.pending = [];
    this.sentFirst = false;
    this.outstanding = 0;
    this.live.clear();
    this.stopKeepAlive();
    if (SpeechOutput.isSupported()) window.speechSynthesis.cancel();
  }

  /** Short sample for the voice settings menu. */
  async preview(text: string, opts: { engine: SpeechEngine; groqVoice: string; browserVoice: SpeechSynthesisVoice | null; rate: number }) {
    this.cancel();
    this.unlock();
    if (opts.engine === "groq" && this.ctx) {
      try {
        const buf = await this.fetchAudio(text, opts.groqVoice, new AbortController().signal);
        await this.playBuffer(buf);
        return;
      } catch {
        /* fall through to browser preview */
      }
    }
    if (!SpeechOutput.isSupported()) return;
    const u = new SpeechSynthesisUtterance(text);
    if (opts.browserVoice) u.voice = opts.browserVoice;
    u.rate = opts.rate;
    window.speechSynthesis.speak(u);
  }

  // ---------------- Groq engine ----------------

  private flushPending() {
    if (!this.pending.length) return;
    const chunk: string[] = [];
    for (const s of this.pending) {
      if (chunk.length && [...chunk, s].join(" ").length > TTS_MAX_CHARS) {
        this.sendChunk([...chunk]);
        chunk.length = 0;
      }
      chunk.push(s);
    }
    if (chunk.length) this.sendChunk(chunk);
    this.pending = [];
  }

  private sendChunk(sentences: string[]) {
    const gen = this.generation;
    this.fetchAbort ??= new AbortController();
    const signal = this.fetchAbort.signal;
    this.outstanding++;
    // Start fetching now; playback waits for the previous chunk.
    const audio = this.fetchAudio(sentences.join(" "), this.groqVoice, signal);
    audio.catch(() => {}); // handled in the chain
    this.chain = this.chain
      .then(async () => {
        if (gen !== this.generation) return;
        let buf: AudioBuffer;
        try {
          buf = await audio;
        } catch (err) {
          if (gen !== this.generation) return;
          this.switchToBrowser((err as Error).message);
          await this.speakBrowserNow(sentences, gen);
          return;
        }
        if (gen !== this.generation) return;
        await this.playBuffer(buf);
        if (gen !== this.generation) return;
        sentences.forEach((s) => this.onSentenceEnd?.(s));
      })
      .finally(() => {
        if (gen !== this.generation) return;
        this.outstanding--;
        if (!this.speaking) this.onIdle?.();
      });
  }

  private async fetchAudio(text: string, voice: string, signal: AbortSignal): Promise<AudioBuffer> {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: this.sessionId || "preview", text, voice }),
      signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      throw new Error(body?.error?.code ?? `tts_${res.status}`);
    }
    const bytes = await res.arrayBuffer();
    if (!this.ctx) throw new Error("no_audio_context");
    return await this.ctx.decodeAudioData(bytes);
  }

  private playBuffer(buf: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ctx || !this.analyser) return resolve();
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = this.rate;
      src.connect(this.analyser);
      src.onended = () => {
        if (this.current === src) this.current = null;
        resolve();
      };
      this.current = src;
      src.start();
    });
  }

  private switchToBrowser(reason: string) {
    if (this.engine === "browser") return;
    this.engine = "browser";
    this.onEngineFallback?.(reason);
  }

  // ---------------- Browser engine ----------------

  /** Queue sentences on the browser engine, keeping order with any Groq audio still playing. */
  private chainBrowser(sentences: string[]) {
    const gen = this.generation;
    this.outstanding++;
    this.chain = this.chain
      .then(() => (gen === this.generation ? this.speakBrowserNow(sentences, gen) : undefined))
      .finally(() => {
        if (gen !== this.generation) return;
        this.outstanding--;
        if (!this.speaking) this.onIdle?.();
      });
  }

  private speakBrowserNow(sentences: string[], gen: number): Promise<void> {
    if (!SpeechOutput.isSupported()) {
      sentences.forEach((s) => this.onSentenceEnd?.(s));
      return Promise.resolve();
    }
    return sentences.reduce<Promise<void>>(
      (p, text) =>
        p.then(
          () =>
            new Promise<void>((resolve) => {
              if (gen !== this.generation) return resolve();
              const u = new SpeechSynthesisUtterance(toSpeechText(text));
              if (this.browserVoice) {
                u.voice = this.browserVoice;
                u.lang = this.browserVoice.lang;
              } else {
                u.lang = "en-IN";
              }
              u.rate = this.rate;
              u.onboundary = () => this.onBoundary?.();
              const finish = () => {
                this.live.delete(u);
                if (!this.live.size) this.stopKeepAlive();
                if (gen === this.generation) this.onSentenceEnd?.(text);
                resolve();
              };
              u.onend = finish;
              u.onerror = finish;
              this.live.add(u); // keep a reference: Chrome can GC utterances before onend
              window.speechSynthesis.speak(u);
              this.startKeepAlive();
            }),
        ),
      Promise.resolve(),
    );
  }

  private startKeepAlive() {
    if (this.keepAlive) return;
    // Chrome can silently pause long speech queues; nudge it.
    this.keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10_000);
  }

  private stopKeepAlive() {
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
  }
}
