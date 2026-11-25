# HANDOVER — Martha AI (voice sales agent for Martha Motors)

> Read this first. It gives a new engineer or AI agent the full concept, architecture, file-by-file responsibilities, current status, known issues and how to change things safely. Deeper detail lives in `PRD.md` (product), `specs.md` (technical) and `design.md` (visual design).
>
> Last updated: 26 Nov 2026. Repo: `github.com/anshux-me/Martha-AI`, branch `main`.

---

## 1. What this project is

**Martha AI** is a voice-first AI sales advisor on the website of **Martha Motors**, a **fictional** Indian electric-car brand. It was built as an interview/assignment MVP ("Autonomous AI Sales Voice Agent"), to be demoed live.

A visitor clicks **"Talk to Martha"** and has a hands-free spoken conversation. Martha:
1. Asks about needs: budget (₹ lakh), use, daily km, seats, home parking/charging, purchase timeline.
2. Recommends 1–2 models/trims from a fixed catalogue.
3. Answers questions (range, charging, battery warranty, EMI, service) **only from facts in her system prompt**.
4. Offers a **callback** from the sales team; if accepted, collects name → mobile (read back) → preferred time → consent, one item per turn.
5. When the call ends, an LLM extracts a **lead profile** from the transcript and code computes a **lead score** (Hot/Warm/Cold). The visitor sees a report card and can **download** the transcript (`.txt`), report (`.md`) and CRM-ready data (`.json`).

**Chat** is a backup mode using the same agent and history.

### Hard constraints chosen by the owner (do not violate without asking)
| Constraint | Consequence |
|---|---|
| **₹0 cost**: free tiers only | Groq free tier (STT, LLM, TTS), Gemini free tier (fallback), Render free hosting |
| **Cloud AI, no self-hosted models** | All AI via Groq API (Gemini fallback); voice-activity detection runs in the visitor's browser |
| **No login, no server-side storage** | Server is stateless; conversation lives in the browser's `localStorage`; nothing persisted or logged with content |
| **No RAG** (fast-track) | Company knowledge (~1.2k tokens) is embedded in the system prompt |
| **English only; no appointment booking; no CRM integration** | Callback request is the conversion action; report JSON is "CRM-ready" for the future |
| **Fictional brand** | Never use real brand names/logos (e.g. Tesla, Maybach) |

---

## 2. Repository layout

```
/ (repo root)
├── HANDOVER.md          ← this file
├── README.md            short overview + quick start
├── PRD.md               product requirements (scope, persona, scoring rubric, demo flow, costs)
├── specs.md             technical spec (architecture, API contracts, prompt, scaling, security)
├── design.md            design language (colours, type, layouts, components, copy)
├── render.yaml          Render Blueprint: ONE web service (frontend + API) from martha-ai/
├── .gitignore           ignores .claude/ etc.
└── martha-ai/           the Next.js 15 application (everything runs from here)
    ├── app/             pages, layout, CSS, favicon, API routes
    ├── components/      React UI (landing page + agent panel)
    ├── hooks/           useMarthaAgent.ts: the conversation controller
    ├── lib/             server + shared + client logic
    ├── scripts/         copy-vad-assets.mjs (postinstall)
    ├── tests/           vitest unit tests
    ├── public/vad/      (gitignored, generated) Silero VAD model + ONNX Runtime wasm
    ├── .env.example     all settings with defaults (copy to .env.local)
    └── package.json, next.config.ts, tsconfig.json, eslint.config.mjs, vitest.config.mts
```

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 15.5 (App Router), React 19, TypeScript** — one app serves pages and `/api/*` |
| Styling | **Tailwind CSS v4** (CSS-first: tokens in `app/globals.css` `@theme inline`), `lucide-react` icons, plain CSS animations |
| AI client | **`openai` npm SDK** pointed at OpenAI-compatible endpoints: Groq `https://api.groq.com/openai/v1`, Gemini `https://generativelanguage.googleapis.com/v1beta/openai/` |
| Speech-to-text | Groq `whisper-large-v3-turbo`; fallback: browser Web Speech `SpeechRecognition` |
| LLM | Groq `openai/gpt-oss-120b` → `openai/gpt-oss-20b` → `qwen/qwen3.8-27b` → Gemini (fallback chain, configurable) |
| Text-to-speech | Groq Orpheus `canopylabs/orpheus-v1-english` (voice `hannah`); fallback: browser `speechSynthesis` |
| Voice activity detection | `@ricky0123/vad-web` (Silero VAD v5, ONNX in the browser) + `onnxruntime-web` |
| Validation | `zod` (v4) |
| Tests | `vitest` (+ `gpt-tokenizer` for the prompt token budget test) |
| Hosting | **Render** free web service via `render.yaml` (Node 22, Singapore) |

Models actually available on the owner's Groq account (checked 26 Nov 2026): `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `openai/gpt-oss-safeguard-20b`, `qwen/qwen3.8-27b`, `allam-2-7b`, `whisper-large-v3`, `whisper-large-v3-turbo`, `canopylabs/orpheus-v1-english`, `canopylabs/orpheus-arabic-saudi`, prompt-guard models. **Llama models are no longer listed.**

---

## 4. Architecture

```
┌──────────────────────────── Visitor's browser ────────────────────────────┐
│ Landing page ──► Agent panel (Voice ⇄ Chat)          [components/]       │
│                                                                           │
│ useMarthaAgent (hooks/) — the controller / state machine:                 │
│   Mic → Silero VAD (end of speech) → WAV → POST /api/stt  → text          │
│     (fallback: BrowserSTT = Web Speech recognition)                       │
│   text → POST /api/chat (SSE token stream)                                │
│   tokens → SentenceSplitter → SpeechOutput:                               │
│       Groq engine: POST /api/tts → WAV → Web Audio (first sentence alone, │
│                    rest merged ≤200 chars)                                │
│       Browser engine: speechSynthesis (automatic fallback)                │
│   barge-in: visitor speaks → stop audio, abort stream, keep spoken part   │
│   End → POST /api/report → ReportCard + downloads                         │
│   localStorage: martha.session.v1 (conversation), martha.voice (prefs),   │
│                 martha.mic (mic was granted before)                       │
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │ HTTPS (same origin)
┌──────────────── Next.js API routes (stateless, app/api/) ────────────────┐
│ /api/stt    multipart WAV → Groq Whisper → {text}                         │
│ /api/chat   {mode, messages} → system prompt + trimmed history →          │
│             LLM fallback chain → SSE (meta/token/done/error)              │
│ /api/tts    {text, voice} → Groq Orpheus → audio/wav                      │
│ /api/report {messages,…} → LLM (JSON) → zod → scoring.ts → report JSON    │
│ /api/health config summary (no secrets)                                   │
│ Every route: per-IP in-memory rate limit, zod validation, request id,     │
│ structured logs WITHOUT message text / audio / phone numbers              │
└────────────────────┬────────────────────────────┬────────────────────────┘
                     ▼                            ▼
              GroqCloud (free)             Google Gemini (free, optional)
```

### Key design decisions (and why)
1. **Stateless server, client carries state.** The browser sends the full message list each turn; the server keeps nothing. This meets the no-storage rule and scales horizontally.
2. **Client orchestrates the voice pipeline** with small single-purpose endpoints, so each piece can be tested with `curl` and debugged live.
3. **Sentence-level pipelining:** Martha starts speaking the first sentence while the LLM is still generating.
4. **Provider fallback chain:** on 429 / 5xx / removed model **before the first token**, try the next model; a 429 puts that model on a 60 s cooldown (in-memory). Mid-stream failures surface as an error rather than silently restarting.
5. **Deterministic scoring:** the LLM only extracts facts; `lib/scoring.ts` computes the score, so it's consistent and unit-tested.
6. **Single source of truth for cars:** `lib/knowledge/catalogue.ts` feeds the landing-page cards, the prompt knowledge table and scoring price ranges.
7. **Free-tier aware prompt:** system prompt ≤ 2,000 tokens (enforced by a test), history trimmed to the greeting + last 12 messages, voice replies capped at 250 tokens (chat 500).

---

## 5. File-by-file guide (`martha-ai/`)

### 5.1 `app/`
| File | Role |
|---|---|
| `layout.tsx` | Root HTML, fonts via `next/font/google` (Instrument Serif display, Inter body, JetBrains Mono labels/debug), metadata, viewport/theme colour. |
| `page.tsx` | Client page: `<AgentProvider>` wrapping `<Landing/>` and `<AgentPanel/>`. The only route. |
| `globals.css` | Tailwind v4 import, **design tokens** (`--bg`, `--surface`, `--accent` #2EE6A6 "Volt Mint", `--accent-2` #4C8DFF "Ion Blue", …) mapped via `@theme inline`; orb animations (`.orb[data-state=…]`), caret, `.rise`, `.no-scrollbar`, reduced-motion rules. Dark-only. |
| `icon.svg` | Favicon: original **double-M monogram** (silver M over a smaller mint→blue M) in a dark rounded badge with a ring. Next.js serves it automatically. |
| `api/chat/route.ts` | Validates `ChatRequestSchema`, builds `[system, ...trimHistory()]`, streams via `streamWithFallback`, emits SSE events `meta`, `token`, `done` (with `ttftMs`), `error` (`not_configured` / `all_providers_busy` / `upstream_error`). Chat mode gets 2× `CHAT_MAX_TOKENS`. |
| `api/stt/route.ts` | Accepts `multipart/form-data` (`audio` WAV ≤ 2 MB, `sessionId`), calls Groq Whisper with `language:"en"`, temperature 0 and a vocabulary prompt (model names, "lakh", "EMI"…). Maps errors: 429 → `stt_rate_limited`, 400 → `invalid_audio`, else 502. |
| `api/tts/route.ts` | `{sessionId, text, voice?}` → cleans text (`toSpeechText`), caps at 200 chars, validates voice against `ORPHEUS_VOICES`, calls Groq `audio.speech.create(... response_format:"wav")`, returns `audio/wav`. Errors: `tts_terms_required` (503), `tts_rate_limited` (429), `tts_unavailable` (503 when `TTS_ENGINE=browser`), `upstream_error`. |
| `api/report/route.ts` | Validates request, `compressTranscript()`, calls `completeWithFallback(REPORT_CHAIN, json mode, temp 0)`, parses with `ReportExtractionSchema` (one retry with error feedback), computes `scoreLead()`, returns `Report` with `meta` (turns, userTurns, durationSec, model). |
| `api/health/route.ts` | Returns configured STT/TTS/chains and whether Groq/Gemini keys exist (no secrets). Used by Render's health check. |

> **Gotcha:** Next.js route files may only export HTTP handlers and route config (`runtime`, `dynamic`, `maxDuration`). Put helpers in `lib/` (that's why `lib/history.ts` exists).

### 5.2 `components/`
| File | Role |
|---|---|
| `agent/AgentProvider.tsx` | React context holding the single `useMarthaAgent()` instance plus `isOpen`. `open(mode, prompt?)` must be called **from a click** (audio unlock). Voice opens directly if `localStorage["martha.mic"]==="1"`, otherwise shows the mic **primer** first. If a finished report exists, opening without a prompt shows the report; with a prompt it starts a new conversation. `close()` pauses (doesn't end). |
| `agent/AgentPanel.tsx` | The sheet/dialog (440 px right sheet on desktop, full screen on mobile), styled like the landing page: header (monogram, serif "Martha", mono status, pill Voice/Chat toggle, voice settings, close), toast, body (mic primer / voice view with call timer, `VoiceVisualizer`, serif status headline, live caption, collapsible transcript / chat transcript / report skeleton / ReportCard), footer (labelled Mute, red "End call" pill, Chat — or chat composer), end-confirmation overlay, `?debug=1` latency overlay. Keyboard: Esc (close or confirm end), Space (mute in voice). |
| `agent/VoiceVisualizer.tsx` | Canvas ring of 72 radial bars around the monogram, redrawn every frame from `getLevel()` (no React re-renders): **listening** = mint bars following mic level + CSS ripple rings; **speaking** = white bars following Orpheus output; **thinking/transcribing/connecting** = a blue highlight sweeping the ring; idle/muted = still grey ticks. Exports `STATUS_LABEL`, `STATUS_DOT`. |
| `agent/Transcript.tsx` | Message list; minimal markdown (bold, bullets); 🎙 marker for spoken messages; "interrupted" tag; streaming text with caret; auto-scroll; `aria-live`. |
| `agent/ChatComposer.tsx` | Auto-growing textarea (Enter sends), quick-reply chips (first 2 user turns), mic button to switch to voice. |
| `agent/VoiceSettings.tsx` | Popover: one dropdown with optgroups **Groq Orpheus** (6 voices) and **browser voices** (encoded as `groq:<id>` / `browser:<voiceURI>`), ▶ preview, speed slider 0.8–1.3×, "Let me interrupt Martha" toggle. |
| `agent/ReportCard.tsx` | Report view: band badge + animated score ring, summary, needs grid, interested-in, concerns chips, next step callout, score breakdown bars, download buttons (txt/md/json), error state with retry, "Start new conversation". |
| `landing/Landing.tsx` | Floating **pill navbar** (monogram, links, CTA), Hero (serif headline + annotated sketch "Fig. 1"), By-the-numbers strip, ModelLineup (spec-sheet cards from `catalogue`; "Ask Martha about X" opens chat with a prompt), HowItWorks, Footer (disclaimers + "Built by Anshu" → https://itsanshu.me/). |
| `landing/CarSketch.tsx` | Pencil-style SVG side elevations per model (`spark`, `terra`, `aero`, `atlas`, `voltgt`): wobble filter, overdraw, hatching, axle construction lines, dimension line; `annotate` adds hero callouts. Edit `SHAPES` to redraw a car. |

### 5.3 `hooks/useMarthaAgent.ts` — the brain of the client (most important file)
One hook = the whole conversation controller. **Rule: every function reads refs, not React state**, so callbacks registered once (VAD, audio events) never go stale. State is mirrored into refs via `setStatus`, `setMode`, `setMessages`.

**Statuses:** `idle` (chat ready/paused) · `primer` · `connecting` · `listening` · `transcribing` · `thinking` · `speaking` · `ending` · `report`.

**Voice turn flow:**
1. `startVoice(prompt?)` (from a click): feature checks → `speech().unlock()` → greeting (spoken immediately) → `getUserMedia` (echo cancellation on) → mic `AnalyserNode` → `MicVAD.new({model:"v5", baseAssetPath:"/vad/", onnxWASMBasePath:"/vad/", redemptionMs:600, …})`. Failure → `fallbackToChat()` with a toast.
2. `onVisitorSpeechEnd(audio)` → `encodeWAV` (16 kHz PCM) → `/api/stt` → `sendUser(text)`. A 429/503 or two errors → `switchToBrowserStt()`.
3. `sendUser` → `runTurn()`: POST `/api/chat`, read SSE, feed tokens to `SentenceSplitter`, `speakSentence()` each sentence → `SpeechOutput.enqueue`; at stream end `speech().endOfTurn()` flushes buffered text; add the assistant message; when speech goes idle → `afterSpeaking()` → `listening`.
4. **Barge-in** (`onSpeechRealStart` while speaking/thinking and `prefs.bargeIn`): cancel speech, abort fetch, keep only sentences actually spoken (`spokenRef`) + "…" with `interrupted:true`. While speaking, VAD thresholds are raised (`tuneVad`) to avoid echo triggering.
5. Errors in voice: one → toast and keep listening; two → switch to chat.

**Other actions:** `startChat`, `switchMode`, `sendText`, `retryLast`, `setMuted`, `updatePrefs`, `previewVoice`, `endConversation` (→ `/api/report` → `report` status; returns false if the visitor never spoke), `retryReport`, `pause`, `newConversation` (clears storage), `getLevel` (orb).

**Persistence:** on every messages/mode/report change → `saveSession()` (localStorage, 24 h TTL). On mount: restore session + voice prefs, load browser voices.

### 5.4 `lib/` — server and shared logic
| File | Runs on | Role |
|---|---|---|
| `config.ts` | server (`server-only`) | zod-parsed env with defaults, **parsed lazily** so builds work without secrets; `parseChain("groq:model,gemini:model")` splits on the first colon (model ids contain `/`). |
| `llm/providers.ts` | server | Cached OpenAI SDK clients per provider (`maxRetries:0`, 30 s timeout); `hasKey()`; `isReasoningModel()` (gpt-oss → sends `reasoning_effort`). |
| `llm/chain.ts` | server | `streamWithFallback` / `completeWithFallback`, `isRetryable` (429, 5xx, connection, 404, 400/403 mentioning "model"), 60 s cooldown on 429, `NotConfiguredError`, `AllProvidersBusyError`. |
| `http.ts` | server | request id, JSON error helper, client IP, `checkRate()`, `logEvent()` (never pass content/PII). |
| `rate-limit.ts` | server | In-memory sliding window per IP (per instance; swap for Upstash Redis at scale). |
| `prompts/system.ts` | shared | `GREETING` and `buildSystemPrompt(mode)`: ROLE, GOAL, PLAYBOOK (answer direct questions first; don't re-ask; recommend once budget + seats/use known; callback at most twice; **one callback item per message**; **never invent visitor details**), STYLE (voice: no symbols, numbers as words, one question; chat: <120 words, ≤6 bullets, no tables/emojis), RULES, KNOWLEDGE (compact catalogue table + FAQ facts). |
| `prompts/report.ts` | server | Extraction prompt specifying the exact JSON shape (summary, keyPoints, customer, callback, leadProfile, sentiment, objections, questionsAsked, `askedPriceFinanceOrTestDrive`, nextAction). |
| `knowledge/catalogue.ts` | shared | 5 fictional models × trims (price ₹L, kWh, range, 0-100, top speed, DC/AC times, drive), `priceRange`, `maxRange`, `catalogueToCompactTable`. |
| `knowledge/faq.ts` | shared | ~15 one-line facts (wallbox included, FastCharge network, 8 yr / 1,60,000 km battery warranty, EMI example, showrooms, delivery…). |
| `schemas.ts` | shared | zod: `ChatRequestSchema`, `ReportRequestSchema`, tolerant `ReportExtractionSchema` (bad enums → null, coerces numbers); types `Report`, `LeadProfile`, `Band`, `ScoreBreakdown`. |
| `scoring.ts` | shared | Rubric: budget fit 25 · timeline 25 · need clarity 20 · engagement 15 (sentiment 10/6/1 + 1 per 3 visitor turns, max 5) · intent 15 (callback + valid Indian mobile `^[6-9]\d{9}$`) → **Hot ≥ 70, Warm 40–69, Cold < 40**. |
| `history.ts` | shared | `trimHistory` (greeting + last N), `compressTranscript` (keeps visitor turns, shortens old Martha turns, caps ~14k chars). |
| `sentence-splitter.ts` | shared | Streaming chunker: emits on `. ! ?` + space/newline; ignores decimals ("29.5") and abbreviations; force-splits >200 chars at commas. |
| `speech-text.ts` | shared | Cleans text for speech: strips markdown/emoji/URLs, `₹29.5 L` → "29.5 lakh rupees", km/kWh/kW expansions, "EV"/"EMI" spelled out. |
| `voices.ts` | shared | Ranks browser voices (en-IN > natural/neural > female hints) and picks the best or the saved one. |
| `tts-voices.ts` | shared | `ORPHEUS_VOICES` (hannah, diana, autumn, austin, daniel, troy — **not yet verified against Groq**), default `hannah`, `TTS_MAX_CHARS=200`. |
| `sse.ts` | shared | `sseEncode` (server), `readSSE` async generator (client). |
| `export.ts` | client | Transcript `.txt`, report `.md`, lead `.json` builders + `downloadFile` (Blob). |
| `client/session.ts` | client | localStorage session/prefs with try/catch; `VoicePrefs {engine, groqVoice, voiceURI, rate, bargeIn}`. |
| `client/speech-output.ts` | client | **Two-engine speech queue.** Groq engine: first sentence sent alone, later sentences merged into ≤200-char chunks (`endOfTurn()` flushes); audio fetched in parallel, played in order through Web Audio with an `AnalyserNode` (`outputLevel()`); any error → `switchToBrowser()` + `onEngineFallback(reason)`. Browser engine: one utterance per sentence, keeps references (Chrome GC bug), 10 s pause/resume keep-alive. `cancel()` bumps a generation counter to invalidate in-flight work. `unlock()` must run in a click (iOS). |
| `client/browser-stt.ts` | client | Web Speech recognition wrapper (`listenOnce`, `en-IN`, interim results). |

### 5.5 Other files
| File | Role |
|---|---|
| `scripts/copy-vad-assets.mjs` | `postinstall`: copies `silero_vad_v5.onnx`, `silero_vad_legacy.onnx`, `vad.worklet.bundle.min.js` and `ort-wasm-simd-threaded(.jsep).{wasm,mjs}` into `public/vad/` (gitignored). **If the voice orb never reacts, check these exist.** |
| `next.config.ts` | Security headers + **CSP** (`'wasm-unsafe-eval'` needed for ONNX; `'unsafe-eval'` only in dev), `Permissions-Policy: microphone=(self)`. If you add any third-party host (e.g. a CDN), update the CSP. |
| `vitest.config.mts` | `@` alias; `server-only` aliased to `tests/empty.ts` so server modules are testable. |
| `eslint.config.mjs` | Next config; ignores `public/vad/**`. |
| `.env.example` | Every setting with defaults (see §7). |
| `../render.yaml` | Render Blueprint (see §8). |

---

## 6. Data contracts (quick reference)

**`POST /api/chat`** body: `{ sessionId, mode: "voice"|"chat", messages: [{role:"user"|"assistant", content}] }` (1–60 messages, ≤2,000 chars each; `system` role rejected). Response: SSE.
```
event: meta   data: {"provider":"groq","model":"openai/gpt-oss-120b"}
event: token  data: {"t":"The Terra"}
event: done   data: {"finishReason":"stop","usage":{…},"timings":{"ttftMs":694}}
event: error  data: {"code":"all_providers_busy","message":"…"}
```
**`POST /api/report`** body: `{ sessionId, mode, startedAt, endedAt, messages }` → `Report`:
```json
{ "summary": "…", "keyPoints": ["…"], "customer": {"name":"Priya","phone":"9845012345","email":null},
  "callback": {"requested":true,"preferredTime":"tomorrow evening","consent":true},
  "leadProfile": {"budgetMinLakh":28,"budgetMaxLakh":32,"useCase":"family","dailyKm":60,"seatsNeeded":5,
    "bodyType":null,"homeCharging":"yes","purchaseTimeline":"1-3 months","financingInterest":"emi",
    "decisionMaker":null,"modelsInterested":["Terra Long Range"]},
  "sentiment": {"overall":"positive","trend":"…"}, "objections": ["Battery life"], "questionsAsked": [],
  "nextAction": "…",
  "score": {"total":91,"band":"hot","breakdown":{"budgetFit":25,"timeline":18,"needClarity":20,"engagement":13,"intent":15}},
  "meta": {"turns":17,"userTurns":10,"durationSec":286,"mode":"voice","generatedAt":"…","model":"groq:openai/gpt-oss-120b"} }
```
All errors: `{ "error": { "code", "message" } }` with `x-request-id` header.

---

## 7. Configuration (`martha-ai/.env.local`, or Render env vars)
| Variable | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | — | **Required.** Free at console.groq.com. |
| `GEMINI_API_KEY` | empty | Optional fallback LLM (Google AI Studio). Empty → Gemini entries skipped. |
| `GROQ_STT_MODEL` | `whisper-large-v3-turbo` | |
| `CHAT_CHAIN` | `groq:openai/gpt-oss-120b,groq:openai/gpt-oss-20b,groq:qwen/qwen3.8-27b,gemini:gemini-flash-lite-latest` | Ordered fallback list, `provider:model`. |
| `REPORT_CHAIN` | `groq:openai/gpt-oss-120b,groq:openai/gpt-oss-20b,gemini:gemini-flash-latest` | |
| `REASONING_EFFORT` | `low` | Sent only to gpt-oss models. |
| `CHAT_TEMPERATURE` / `CHAT_MAX_TOKENS` / `HISTORY_MAX_MESSAGES` | `0.4` / `250` / `12` | Chat mode uses 2× max tokens. |
| `RATE_LIMIT_PER_MIN` | `60` | Per IP, all endpoints combined. |
| `TTS_ENGINE` | `groq` | `groq` (Orpheus + browser fallback) or `browser`. |
| `GROQ_TTS_MODEL` / `GROQ_TTS_VOICE` | `canopylabs/orpheus-v1-english` / `hannah` | |

**Free-tier limits (approximate, per account, per model; check console.groq.com → Settings → Limits):** LLMs ~30 req/min, ~1,000 req/day, ~8K tokens/min; Whisper ~20 req/min, ~2,000/day; **Orpheus ~10 req/min, ~100/day**. One chat turn ≈ 1.5–3K tokens, so rapid-fire testing trips the 120b per-minute limit and the chain falls back to 20b (observed; 20b is noticeably weaker).

---

## 8. Run, test, deploy

```bash
cd martha-ai
npm install                 # postinstall copies VAD assets to public/vad
cp .env.example .env.local  # add GROQ_API_KEY
npm run dev                 # http://localhost:3000   (?debug=1 shows latency overlay)
npm test                    # 20 vitest tests
npm run typecheck && npm run lint
npm run build && PORT=10000 npm start   # production-like run
```
- Microphone requires `localhost` or HTTPS. The Claude desktop preview pane **blocks the mic**; test voice in real Chrome/Edge with headphones.
- Don't run `npm run build` while `npm run dev` is running (both use `.next/`).

**Render (current hosting):** `render.yaml` at the repo root defines one free web service `martha-ai` (rootDir `martha-ai`, `npm ci && npm run build`, `npm start`, health `/api/health`, Node 22, Singapore, auto-deploy on commit). Dashboard → New → Blueprint → connect the repo → enter `GROQ_API_KEY` (and optionally `GEMINI_API_KEY`) → Apply. Free instances sleep after ~15 min idle (≈1 min cold start), so open the URL before a demo. **Not yet deployed as of this handover.**

**Git:** remote `origin = git@github.com:anshux-me/Martha-AI.git` (SSH key `~/.ssh/id_ed25519` on the owner's machine is registered with GitHub). `.env.local` is gitignored — never commit secrets.

---

## 9. Current status

### Verified working (with the owner's real Groq key)
- Landing page, chat mode, voice→chat automatic fallback (mic blocked), report card render, mobile layout, favicon/logo.
- `/api/chat` streaming with gpt-oss-120b (first token ≈ 0.5–0.9 s, prompt ≈ 1,500 tokens); grounding (only catalogue prices), on-road price → callback, prompt-injection refusal; fallback to gpt-oss-20b on 429.
- Full demo conversation (Priya: family of 5, ₹30 L, 60 km/day → Terra Long Range, callback) after prompt fixes: one callback item per message, correct read-back, consent asked.
- `/api/report`: 2.3 s, score 91 Hot, all fields extracted correctly.
- `/api/stt` plumbing (Groq Whisper call ≈ 0.8 s with a synthetic clip; invalid audio → 400).
- Production build + `PORT=10000 npm start` smoke test (health, home, VAD model, icon, chat).
- typecheck, lint, 20 unit tests all pass.

### Not yet verified
- **A real spoken end-to-end conversation in a browser** (mic + VAD + Whisper on real speech + speech output + barge-in).
- **Groq Orpheus audio:** the owner's key returns `model_terms_required` even after the owner reported accepting terms. Likely terms accepted in a different Groq org or not by an org admin. Until fixed, the app automatically uses the browser voice (toast explains). Orpheus voice ids in `lib/tts-voices.ts` are unverified.
- Render deployment itself.

### Known issues / small gaps
- Report sometimes omits an objection from `objections` that appears in the summary (seen: "highway charging").
- gpt-oss-20b (fallback) follows style rules less well (may ask several questions, use emojis); 120b is preferred.
- In browser-STT fallback mode, barge-in is not supported (recognition restarts after Martha finishes).
- No silence nudge (PRD FR-V12, P2) and no Kokoro voice option (dropped).
- In-memory rate limit and cooldowns are per server instance.

---

## 10. How to make common changes
| Want to… | Edit |
|---|---|
| Change Martha's behaviour, tone, rules | `lib/prompts/system.ts` (keep ≤ 2,000 tokens; `npm test` enforces it) |
| Add/edit a car, trim or price | `lib/knowledge/catalogue.ts` (updates UI cards, prompt and scoring together) |
| Add/edit company facts | `lib/knowledge/faq.ts` |
| Swap/reorder models or providers | `CHAT_CHAIN` / `REPORT_CHAIN` env (also in `render.yaml`) |
| Change voice / force browser voice | `GROQ_TTS_VOICE` / `TTS_ENGINE=browser`; voice list in `lib/tts-voices.ts` |
| Change scoring weights or bands | `lib/scoring.ts` + `tests/scoring.test.ts` |
| Add a report field | `lib/prompts/report.ts` → `ReportExtractionSchema` in `lib/schemas.ts` → `components/agent/ReportCard.tsx` → `lib/export.ts` |
| Tune interruption sensitivity / end-of-speech delay | VAD options in `startVoice()` and `tuneVad()` in `hooks/useMarthaAgent.ts` |
| Change look & feel | tokens in `app/globals.css`; components in `components/`; follow `design.md` |
| Add a CRM push (roadmap) | new route `app/api/crm/route.ts` posting the report JSON; call it after `generateReport()` succeeds (only if callback consent is true) |

### Conventions
- TypeScript strict; zod at every API boundary; Tailwind utility classes with design tokens (`bg-surface`, `text-muted`, `bg-accent`…).
- Never log message text, audio or phone numbers (`logEvent` fields only).
- Server-only modules start with `import "server-only"`.
- In the hook, read refs inside callbacks; never rely on React state there.
- Keep everything free-tier friendly: small prompts, trimmed history, few TTS requests.
- Fictional brand only; no real trademarks.

---

## 11. Roadmap (from PRD)
CRM push (HubSpot/webhook) · RAG when knowledge outgrows the prompt · test-drive booking · Hindi/regional languages · telephony (Twilio/Exotel) · embeddable widget · consented aggregated analytics · paid premium voice for consistency.
