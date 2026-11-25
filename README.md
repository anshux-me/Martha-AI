# Martha-AI

A voice-first AI sales agent for **Martha Motors**, a fictional Indian EV brand. Visitors talk to Martha hands-free on the website. She recommends the right car from the catalogue, answers questions about range, charging, warranty and EMI, offers a callback from the sales team, and at the end of the call produces a scored lead report that the visitor can download.

**Runs on free tiers (₹0):**
- Speech-to-text: Groq Whisper
- Replies: Groq LLMs, with Gemini as fallback
- Martha's voice: Groq Orpheus, with the browser's built-in voice as fallback
- Hosting: Render (free web service, one `render.yaml` Blueprint)

No login and no server-side storage: the conversation stays in the visitor's browser.

## Repository

| Path | What |
|---|---|
| [`PRD.md`](PRD.md) | Product requirements: problem, scope, agent design, lead scoring, demo workflow, commercial case |
| [`specs.md`](specs.md) | Technical specification: architecture, API, system prompt, voice pipeline, scalability, security, costs |
| [`design.md`](design.md) | Design language: brand, colours, typography, layouts, components |
| [`martha-ai/`](martha-ai/) | The Next.js application (see its [README](martha-ai/README.md) for setup) |

## Quick start

```bash
cd martha-ai
npm install
cp .env.example .env.local   # add your free GROQ_API_KEY
npm run dev                  # http://localhost:3000
```
