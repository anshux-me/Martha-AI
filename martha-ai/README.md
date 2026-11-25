# Martha AI: voice sales agent for Martha Motors

A voice-first AI sales advisor for **Martha Motors**, a fictional EV brand. Visitors talk to Martha hands-free. She recommends a car from the catalogue, answers questions, offers a sales callback, and at the end produces a scored lead report that the visitor can download.

**₹0 to run:**
- Speech-to-text: Groq Whisper (free tier)
- Replies: Groq LLMs (free tier), with Google Gemini (free tier) as fallback
- Martha's voice: Groq Orpheus (free tier), with the browser's built-in speech as automatic fallback
- Hosting: Vercel Hobby
- Storage: none on the server. The conversation lives in the visitor's `localStorage`.

Product, technical and design docs: [`../PRD.md`](../PRD.md), [`../specs.md`](../specs.md), [`../design.md`](../design.md).

## Quick start

```bash
npm install                 # also copies the voice-activity model into public/vad
cp .env.example .env.local  # then paste your free GROQ_API_KEY (and optionally GEMINI_API_KEY)
# one time: accept the Orpheus terms at https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english
npm run dev                 # http://localhost:3000
```

The microphone works on `localhost` and on HTTPS. Use Chrome or Edge on desktop for the best on-device voices, and wear headphones so Martha doesn't hear herself and stop talking.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests (scoring, sentence splitter, speech text, voices, history, prompt token budget) |
| `npm run typecheck` / `npm run lint` | Type and lint checks |

Add `?debug=1` to the URL to see per-turn timings: speech-to-text time, LLM time to first token, time until Martha starts speaking, and which model answered.

## How it works

```
Browser: mic → Silero VAD (end of speech) → POST /api/stt ──► Groq Whisper
                                           → POST /api/chat (SSE) ──► LLM chain: Groq models → Gemini
         tokens → sentence splitter → POST /api/tts ──► Groq Orpheus (fallback: browser speechSynthesis), barge-in supported
         End call → POST /api/report ──► LLM extracts lead profile → lib/scoring.ts computes score
         Report + transcript → download (.txt / .md / .json). Session kept in localStorage only.
```

| Area | Where |
|---|---|
| Persona, rules, sales playbook | `lib/prompts/system.ts` |
| Car catalogue (single source for UI, prompt and scoring) | `lib/knowledge/catalogue.ts`, `lib/knowledge/faq.ts` |
| Model / provider fallback chain | `.env` → `CHAT_CHAIN`, `REPORT_CHAIN`; logic in `lib/llm/chain.ts` |
| Voice pipeline, barge-in, fallbacks | `hooks/useMarthaAgent.ts` |
| On-device speech and voice choice | `lib/client/speech-output.ts`, `lib/voices.ts` |
| Lead scoring rubric | `lib/scoring.ts` |
| Report extraction prompt | `lib/prompts/report.ts` |
| API routes | `app/api/{stt,chat,report,health}/route.ts` |

**Fallbacks:**
- If Groq speech-to-text is rate-limited, the app switches to the browser's own speech recognition.
- If an LLM is rate-limited or has been removed, the next model in the chain takes over.
- If the mic is blocked or the browser can't do voice, the app switches to chat, keeping the conversation.

## Deploy (free)

1. Push to GitHub.
2. Import the repo in Vercel (Hobby plan).
3. Set `GROQ_API_KEY`, and optionally `GEMINI_API_KEY`, in Project → Settings → Environment Variables.
4. Deploy.

`GET /api/health` shows which models are configured and whether each provider has a key.

> Model IDs and free-tier limits change. Check console.groq.com (Settings → Limits) and Google AI Studio, then edit `CHAT_CHAIN` / `REPORT_CHAIN`.
