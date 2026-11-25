# design.md — Martha Motors Design Language

| Field | Value |
|---|---|
| Version | 1.1 (fast-track MVP, zero-cost: Martha's voice comes from the visitor's browser) |
| Companion docs | [`PRD.md`](PRD.md), [`specs.md`](specs.md) |
| Direction | **Dark-first, premium EV.** Calm, minimal, confident. The conversation with Martha is the hero, not the page chrome. |

---

## 1. Design principles

1. **Voice first, never voice only.** The biggest action on every screen is "Talk to Martha". Chat is always one tap away and never feels like a lesser option.
2. **Show what Martha is doing.** At every moment the visitor can tell whether Martha is listening, thinking or speaking, through the orb, a status label and the live transcript.
3. **Calm confidence.** Plenty of negative space, one accent colour, restrained motion. A premium car brand, not a gadget.
4. **Honest by design.** AI disclosure, the privacy note ("Nothing is stored on our servers") and fictional-brand disclaimers are visible, not buried.
5. **One source of truth.** Car data in the UI comes from the same `catalogue.ts` Martha uses, so the page and the agent never disagree.

---

## 2. Brand identity

| Element | Definition |
|---|---|
| Name | **Martha Motors** (fictional) |
| Agent | **Martha**, AI Sales Advisor |
| Tagline | **"Electric, made personal."** |
| Hero line | "Find your Martha in a five-minute conversation." |
| Logo | Wordmark **MARTHA** in Space Grotesk 600, tracking +0.18em, with a small **"M" monogram**: two rising strokes forming an M, ending in a charge-bolt notch. Monochrome (text colour), with the accent used only on the notch. |
| Personality | Knowledgeable friend at a showroom: warm, direct, never pushy |
| Imagery | Unbranded studio renders or SVG silhouettes of the five models on dark gradients. **No real-brand cars, logos or photos.** |

---

## 3. Colour system

Defined as CSS variables in `globals.css` and mapped in `tailwind.config.ts`. Dark is the default theme; light tokens exist for later use and for printing the report.

### 3.1 Core tokens
| Token | Dark (default) | Light | Usage |
|---|---|---|---|
| `--bg` | `#0A0B0D` | `#F7F8FA` | Page background |
| `--surface` | `#121418` | `#FFFFFF` | Cards, panels |
| `--surface-2` | `#1A1D23` | `#F0F2F5` | Inputs, nested cards, user bubbles |
| `--border` | `#262A31` | `#E2E5EA` | Dividers, card outlines |
| `--text` | `#F2F4F7` | `#0E1116` | Primary text |
| `--text-muted` | `#9AA3AF` | `#5B6572` | Secondary text, captions |
| `--accent` | `#2EE6A6` (Volt Mint) | `#0FA97A` | Primary CTA, active states, listening |
| `--accent-fg` | `#04140E` | `#FFFFFF` | Text on accent |
| `--accent-2` | `#4C8DFF` (Ion Blue) | `#2F6FE8` | Thinking state, links, secondary highlights |
| `--danger` | `#F2555A` | `#D93A40` | End call, errors |
| `--warning` | `#F5B83D` | `#B7821A` | Warm band, cautions |
| `--success` | `#2EE6A6` | `#0FA97A` | Confirmations |

### 3.2 Lead band colours
| Band | Colour | Badge |
|---|---|---|
| 🔥 Hot | `--danger` tint `#F2555A` | `bg-danger/15 text-danger` |
| 🌤 Warm | `--warning` `#F5B83D` | `bg-warning/15 text-warning` |
| ❄️ Cold | `--accent-2` `#4C8DFF` | `bg-accent-2/15 text-accent-2` |

### 3.3 Gradients
- **Hero glow:** `radial-gradient(60% 50% at 70% 40%, rgba(46,230,166,0.18), transparent 70%)` on `--bg`
- **Orb:** conic gradient `--accent → --accent-2 → --accent`, blurred and masked to a circle

**Contrast:** every text/background pair meets WCAG AA (≥ 4.5:1 for body text, ≥ 3:1 for large text and UI). On dark backgrounds the accent is used only for large text, icons and buttons with `--accent-fg` text.

---

## 4. Typography

| Role | Font | Size / line-height | Weight |
|---|---|---|---|
| Display (hero) | Space Grotesk | 56/60 desktop · 36/40 mobile | 600 |
| H2 (section) | Space Grotesk | 36/42 · 28/34 | 600 |
| H3 (card title) | Space Grotesk | 22/28 | 600 |
| Body | Inter | 16/26 | 400 |
| Body small / captions | Inter | 14/22 | 400 |
| Label / overline | Inter | 12/16, uppercase, +0.12em tracking | 600 |
| Numbers (price, range, score) | Space Grotesk, tabular figures | as context | 600 |
| Debug overlay | JetBrains Mono | 12/18 | 400 |

Load with `next/font/google` (self-hosted at build time, no runtime calls to Google).

---

## 5. Layout and spacing

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96 px (Tailwind default scale)
- **Radius:** `--radius-sm 8px` (inputs, chips) · `--radius-md 14px` (cards) · `--radius-lg 24px` (panels) · `full` (orb, pills, icon buttons)
- **Container:** max width 1200 px, 24 px side padding (16 px on mobile)
- **Grid:** 12 columns on desktop; model cards 3-up (≥ 1024 px), 2-up (≥ 640 px), 1-up on mobile or as a horizontal snap-scroll carousel
- **Elevation:** shadows used sparingly on dark: `0 10px 40px rgba(0,0,0,0.45)` for the agent panel only; elsewhere a 1 px `--border`
- **Breakpoints:** `sm 640` · `md 768` · `lg 1024` · `xl 1280`

---

## 6. Information architecture

```
/ (single page)
├── Navbar           logo · Models · Charging · Ownership · [Talk to Martha]
├── Hero             headline · subline · [🎙 Talk to Martha] · "Prefer to type? Chat instead" · privacy microcopy · car render
├── Model lineup     5 model cards → "Ask Martha about <model>"
├── Why electric     4 benefit tiles: Range · Charging · 8-yr battery warranty · Running cost
├── How Martha works 3 steps: Tell her what you need → Get a recommendation → Get a callback (optional)
├── Footer           fictional-brand disclaimer · privacy note · © Martha Motors (demo)
└── Agent panel      overlay (sheet on desktop, full screen on mobile)
     ├── Voice view   (default)
     ├── Chat view    (backup)
     └── Report view  (end of conversation)
```
No other routes. `?debug=1` shows the latency overlay.

---

## 7. Landing page

### 7.1 Navbar
- Height 64 px, transparent over the hero; turns `--bg/80` with backdrop blur after scrolling.
- Right side: a compact **"Talk to Martha"** pill button (accent) with a mic icon. On mobile it's the only item besides the logo and menu.

### 7.2 Hero
- Left (desktop) / top (mobile):
  - overline **"MEET MARTHA · YOUR AI EV ADVISOR"**
  - display headline
  - subline: *"Tell Martha how you drive and what you can spend. She'll match you with the right electric car, answer every question, and arrange a call back if you'd like."*
- **Primary CTA:** large pill button, 56 px tall, accent, labelled `🎙 Talk to Martha`.
- **Secondary:** text link `Prefer to type? Chat instead →`.
- **Microcopy** under the CTAs (muted, 13 px): *"You'll be talking to an AI. Uses your microphone. Nothing is stored on our servers."*
- Right: a Martha Terra render on the hero glow, with a small floating "mini orb" chip ("Martha is online ●") that pulses gently.

### 7.3 Model card
```
┌──────────────────────────────┐
│ [car render, 16:9]           │
│ MARTHA TERRA     Mid-size SUV│  ← H3 + muted segment
│ From ₹22.0 L                 │  ← numeric, large
│ ⚡ Up to 500 km · 👥 5 seats  │  ← icon stats (lucide: Zap, Users)
│ [Ask Martha about Terra →]   │  ← ghost button: opens agent with context
└──────────────────────────────┘
```
"Ask Martha about Terra" opens the agent panel in the visitor's last-used mode and sends the first user message for them: *"Tell me about the Martha Terra."*

### 7.4 Benefit tiles and steps
Icon (accent, 24 px) + H3 + one line of copy. Steps use large muted numerals `01 02 03`.

---

## 8. Agent panel (core experience)

### 8.1 Container
| Viewport | Presentation |
|---|---|
| Desktop (≥ 1024) | Right-side sheet, **440 px** wide, full height, `--surface`, radius-lg on the left edges; the page behind is dimmed (`bg-black/50`) |
| Tablet | Sheet 400 px |
| Mobile | **Full-screen** takeover with safe-area padding; swipe down or ✕ closes (with an end-call confirmation if a call is live) |

### 8.2 Panel anatomy
```
┌─────────────────────────────────────────┐
│ ◉ Martha         [ Voice | Chat ] ⋯  ✕ │  header: mini orb, name, "AI Sales Advisor",
│   AI Sales Advisor  ● Listening          │  status pill, mode toggle, ⋯ voice settings, close
├─────────────────────────────────────────┤
│                                         │
│            ( big animated orb )         │  VOICE VIEW
│                                         │
│   "The Terra Long Range fits a family   │  live caption: Martha's current sentence
│    of five nicely…"                     │  (large, centred, 18px)
│                                         │
│   ▾ Show transcript (12)                │  collapsible full transcript
├─────────────────────────────────────────┤
│   [🔇 Mute]   [ ⏹ End call ]   [💬 Chat] │  controls (End = danger, centre, largest)
└─────────────────────────────────────────┘
```

**Chat view:** the body becomes the transcript, with the composer at the bottom: input, send button, a 🎙 button that switches back to voice, and quick-reply chips above the input. "End chat" sits in the header overflow.

**Report view:** replaces the body after the conversation ends (§8.6).

**Voice settings (⋯ menu):** a small popover with:
- **Martha's voice:** a dropdown of the browser's English voices, with the auto-picked one marked "Recommended" and a ▶ preview button that says *"Hi, I'm Martha."*
- **Speaking speed:** a slider from 0.8× to 1.3×
- **Let me interrupt Martha:** a toggle, on by default; turn it off in noisy rooms
- Muted footnote: *"Martha's voice comes from your browser, so it may sound different on other devices."*

Choices are saved in this browser.

### 8.3 Voice orb states
Diameter 180 px desktop / 160 px mobile. Built with Framer Motion. Mic level comes from an `AnalyserNode`. Browser speech can't be measured that way, so the speaking animation is driven by word-boundary events instead.

| State | Visual | Label | Colour |
|---|---|---|---|
| Connecting | Soft fade-in, slow rotation | "Connecting…" | muted |
| Listening | Breathing scale 1.0 ↔ 1.04; **inner ripples react to mic level** | "Listening" | `--accent` |
| Thinking | Conic gradient spins (1.2 s/rev), shimmering ring | "Thinking…" | `--accent-2` |
| Speaking | **A soft pulse on each spoken word** (speech `boundary` events), with a gentle looping pulse on browsers that don't fire them; mint → blue gradient | "Speaking" | accent → accent-2 |
| Muted | Desaturated, mic-off badge on the orb | "Muted" | `--text-muted` |
| Error / reconnecting | Brief red ring flash, then the previous state | "Reconnecting…" | `--danger` |

The status pill in the header mirrors the label with a coloured dot (`●`). With `prefers-reduced-motion`, the orb only changes colour and opacity, with no scaling or rotation.

### 8.4 Transcript and messages
| Element | Style |
|---|---|
| Martha message | Left-aligned, no bubble background, `--text`, small mini-orb avatar on the first message of a group |
| Visitor message | Right-aligned bubble, `--surface-2`, radius-md (tail corner 4 px) |
| Via-voice marker | Tiny 🎙 icon on messages that were spoken (vs typed) |
| Interrupted | Martha's text ends with "…" plus a muted "interrupted" tag |
| Streaming | Text appears token by token; a blinking caret `▍` while streaming |
| Timestamps | Shown on hover/long-press only (muted 12 px) |
| Chat formatting | Bold model names, short bullet lists; ₹ values in tabular numerals |

### 8.5 Mode switching and fallback
- **Segmented toggle** `[ 🎙 Voice | 💬 Chat ]` in the header: the active segment has an accent background.
- **Manual switch:** the transcript stays put; only the body layout changes (cross-fade, 200 ms).
- **Automatic fallback:** a toast appears at the top of the panel, `--surface-2` with an info icon:
  - *"Microphone access was blocked, so let's chat instead. You can switch back anytime."*
  - *"Voice is having trouble right now. Switched to chat; your conversation is saved."*
- **Mic permission primer** (before the browser prompt): a small card saying *"Martha needs your microphone to hear you. Audio is only used to transcribe what you say."* with buttons [Allow microphone] and [Use chat instead].

### 8.6 Report view (end of conversation)
```
┌─────────────────────────────────────────┐
│ Call summary              🔥 HOT  90/100 │  ← band badge + score ring (animated fill)
│ 4 min 46 s · Voice · 14 turns           │
├─────────────────────────────────────────┤
│ Summary                                 │
│ Priya is looking for a 5-seat family EV…│
│                                         │
│ Your needs           Interested in      │
│ Budget  ₹25–32 L     Martha Terra LR    │  ← 2-column key/value grid
│ Seats   5            ₹29.5 L · 500 km   │
│ Daily   60 km                           │
│ Charging Home ✓                         │
│ Timeline 1–3 months                     │
│                                         │
│ Concerns  [Battery life] [Highway charging]  ← chips
│                                         │
│ ┌ Next step ──────────────────────────┐ │  ← accent-bordered callout
│ │ Sales will call you tomorrow evening│ │
│ │ on 98XXX XXX21.                     │ │
│ └─────────────────────────────────────┘ │
│ Score breakdown ▾  (5 mini bars)        │
├─────────────────────────────────────────┤
│ [⬇ Transcript .txt] [⬇ Report .md] [⬇ .json] │
│ [ Start new conversation ]              │
│ Stored only in this browser. Nothing    │
│ was saved on our servers.               │
└─────────────────────────────────────────┘
```
- While the report is generating: a skeleton loader plus the line *"Martha is writing up your call…"*.
- The phone number is shown in full to the visitor (it's their data). The masked form shown above is for screenshots only.

---

## 9. Components inventory

| Component | Variants / notes |
|---|---|
| `Button` | `primary` (accent), `secondary` (surface-2), `ghost`, `danger`; sizes `sm 36` / `md 44` / `lg 56`; pill radius; icon-left support |
| `IconButton` | 44 × 44 minimum (touch target), tooltip label |
| `SegmentedToggle` | Voice / Chat |
| `VoiceSettings` | Popover: voice dropdown with preview, speed slider, interrupt toggle |
| `StatusPill` | Coloured dot + label, `aria-live="polite"` |
| `VoiceOrb` | States in §8.3; props `state`, `level` (0–1) |
| `MessageBubble` | `assistant` / `user`; `streaming`, `interrupted`, `viaVoice` flags |
| `QuickReplyChip` | Outline chip, scrolls horizontally on mobile |
| `Composer` | Auto-growing textarea (max 4 lines), Enter to send, Shift+Enter for a new line |
| `Toast` | `info` / `warning` / `error`; auto-dismiss after 5 s; `role="status"` |
| `ModelCard` | §7.3 |
| `ScoreRing` | SVG ring, colour by band, number centred |
| `Badge` | Band badges (§3.2), neutral |
| `Sheet` | Agent panel container, focus-trapped |
| `Skeleton` | Report loading |
| `DebugOverlay` | Mono font, bottom-left: per-stage ms (STT / LLM first token / speech start / total), the provider and model that answered, and which speech-to-text is active (Groq or browser) |

Icons: `lucide-react`, 20 px in UI and 24 px in features, 1.75 stroke: `Mic`, `MicOff`, `PhoneOff`, `MessageSquare`, `Send`, `Download`, `Zap`, `Users`, `BatteryCharging`, `ShieldCheck`, `X`, `RotateCcw`.

---

## 10. Motion

| Interaction | Animation | Duration / easing |
|---|---|---|
| Panel open/close | Slide from right (desktop) / slide up (mobile) + backdrop fade | 280 ms, `cubic-bezier(0.22, 1, 0.36, 1)` |
| Mode switch | Cross-fade body | 200 ms ease-out |
| Message appear | Fade + 6 px rise | 180 ms |
| Orb state change | Colour/gradient morph | 300 ms |
| Score ring | Fill from 0 to score | 900 ms ease-out, after the report loads |
| Hero | Car render subtle parallax on scroll; glow drift | — |

All non-essential motion is disabled under `prefers-reduced-motion: reduce`.

---

## 11. Voice and copy guidelines

**Martha (agent) voice:** warm, brief, specific. Uses "you" and concrete numbers. Never salesy superlatives ("best ever", "unbeatable").

| Do | Don't |
|---|---|
| "The Terra Long Range gets about 500 km on a charge — plenty for your 60 km days." | "The Terra is the most amazing SUV ever made!" |
| "I don't have exact on-road prices, but our sales team can share them. Want a call back?" | Guess an on-road price |
| "Could I get your mobile number for the callback?" | Ask for address, ID or other personal data |

**UI microcopy:**
| Context | Copy |
|---|---|
| Primary CTA | **Talk to Martha** |
| Secondary CTA | Prefer to type? Chat instead |
| Listening hint (first turn) | "Go ahead, I'm listening." |
| Chat placeholder | "Ask about models, range, charging, EMI…" |
| End call confirm | "End the call? You'll get a summary and can download your transcript." |
| Busy (all free providers rate-limited) | "Martha is busy right now. Please try again in a minute. Your conversation is saved." |
| Speech-to-text switched to browser | Toast: "Switched to your browser's speech recognition to keep things going." |
| Privacy note | "Nothing is stored on our servers. Your conversation stays in this browser." |
| Privacy details (link from the privacy note) | "To reply to you, your voice and messages are processed by Groq, and by Google if a backup service is used. Google may use data from its free service to improve its products. Martha's voice is generated on your device." |
| AI disclosure | "Martha is an AI assistant and can make mistakes. Prices are illustrative." |
| Footer disclaimer | "Martha Motors is a fictional brand created for a product demo. All vehicles, specifications and prices are illustrative." |

---

## 12. Accessibility

- The **live transcript doubles as captions**, so every spoken word is also shown as text.
- Status changes are announced through `aria-live="polite"` (status pill) and new Martha messages through `aria-live="polite"` on the transcript, throttled to per message rather than per token.
- Full keyboard support: `Space` toggles mute in voice view, `Esc` closes the panel (with end confirmation), and focus is trapped inside the sheet.
- Touch targets ≥ 44 px. Visible focus ring: 2 px `--accent-2` outline, 2 px offset.
- Colour is never the only signal: bands have emoji and text labels, and orb states have text labels.
- `prefers-reduced-motion` and `prefers-contrast` respected.

---

## 13. Responsive behaviour summary

| Area | Mobile (< 640) | Desktop (≥ 1024) |
|---|---|---|
| Hero | Stacked; CTA full width; render below text | Two columns |
| Model lineup | Horizontal snap carousel | 3-up grid (2 rows) |
| Agent panel | Full screen | 440 px right sheet |
| Orb | 160 px | 180 px |
| Controls | Bottom bar, safe-area aware | Panel footer |
| Report downloads | Stacked full-width buttons | Inline row |

---

## 14. Tailwind token mapping (excerpt)

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      bg: "var(--bg)", surface: "var(--surface)", "surface-2": "var(--surface-2)",
      border: "var(--border)", text: "var(--text)", muted: "var(--text-muted)",
      accent: "var(--accent)", "accent-fg": "var(--accent-fg)", "accent-2": "var(--accent-2)",
      danger: "var(--danger)", warning: "var(--warning)", success: "var(--success)",
    },
    fontFamily: {
      display: ["var(--font-space-grotesk)", "sans-serif"],
      sans: ["var(--font-inter)", "sans-serif"],
      mono: ["var(--font-jetbrains)", "monospace"],
    },
    borderRadius: { sm: "8px", md: "14px", lg: "24px" },
  },
}
```
