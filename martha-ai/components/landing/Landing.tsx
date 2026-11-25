"use client";
import { BatteryCharging, IndianRupee, Mic, Route, ShieldCheck, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgentUI } from "@/components/agent/AgentProvider";
import { CarSilhouette } from "@/components/landing/CarSilhouette";
import { catalogue, maxRange, priceRange } from "@/lib/knowledge/catalogue";

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* Double-M monogram (same as app/icon.svg) */}
      <svg viewBox="10 10 44 44" className="size-8" aria-hidden="true">
        <defs>
          <linearGradient id="logo-volt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2ee6a6" />
            <stop offset="1" stopColor="#4c8dff" />
          </linearGradient>
        </defs>
        <path d="M14.5 38 L20.5 14.5 L32 29.5 L43.5 14.5 L49.5 38" fill="none" stroke="currentColor" strokeWidth="4.6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M21 50 L25.5 35.5 L32 43.5 L38.5 35.5 L43 50" fill="none" stroke="url(#logo-volt)" strokeWidth="3.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-[0.18em]">MARTHA</span>
    </span>
  );
}

function Navbar() {
  const { open } = useAgentUI();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed inset-x-0 top-0 z-40 h-16 transition ${scrolled ? "bg-bg/80 backdrop-blur border-b border-border" : ""}`}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <a href="#top" aria-label="Martha Motors home">
          <Logo />
        </a>
        <div className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#models" className="hover:text-text">Models</a>
          <a href="#charging" className="hover:text-text">Charging</a>
          <a href="#how" className="hover:text-text">How Martha works</a>
        </div>
        <button
          type="button"
          onClick={() => open("voice")}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:brightness-110"
        >
          <Mic className="size-4" /> Talk to Martha
        </button>
      </div>
    </nav>
  );
}

function Hero() {
  const { open } = useAgentUI();
  return (
    <section id="top" className="hero-glow relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Meet Martha · Your AI EV advisor</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-semibold sm:text-[56px] sm:leading-[60px]">
            Find your Martha in a five-minute conversation.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Tell Martha how you drive and what you can spend. She&apos;ll match you with the right electric car, answer
            every question, and arrange a call back if you&apos;d like.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => open("voice")}
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-accent px-8 text-lg font-semibold text-accent-fg shadow-[0_0_40px_rgba(46,230,166,0.25)] transition hover:brightness-110"
            >
              <Mic className="size-5" /> Talk to Martha
            </button>
            <button
              type="button"
              onClick={() => open("chat")}
              className="text-center text-muted underline-offset-4 hover:text-text hover:underline"
            >
              Prefer to type? Chat instead →
            </button>
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-[13px] text-muted">
            <ShieldCheck className="size-4 shrink-0" />
            You&apos;ll be talking to an AI. Uses your microphone. Nothing is stored on our servers.
          </p>
        </div>
        <div className="relative">
          <CarSilhouette bodyType="SUV" className="w-full drop-shadow-[0_20px_60px_rgba(46,230,166,0.15)]" />
          <div className="absolute top-2 right-2 flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-sm backdrop-blur sm:top-6 sm:right-6">
            <span className="pulse-dot size-2 rounded-full bg-accent" /> Martha is online
          </div>
          <p className="mt-2 text-center text-sm text-muted">Martha Terra · Mid-size SUV</p>
        </div>
      </div>
    </section>
  );
}

function ModelLineup() {
  const { open } = useAgentUI();
  return (
    <section id="models" className="py-16 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">The lineup</p>
        <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Five electric cars. One honest advisor.</h2>
        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {catalogue.map((m) => {
            const short = m.name.replace("Martha ", "");
            return (
              <article
                key={m.id}
                className="flex w-[82%] shrink-0 snap-start flex-col rounded-md border border-border bg-surface p-5 sm:w-auto"
              >
                <div className="aspect-video rounded-sm bg-gradient-to-b from-surface-2 to-surface p-2">
                  <CarSilhouette bodyType={m.bodyType} className="h-full w-full" />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-[22px] font-semibold uppercase tracking-wide">{m.name}</h3>
                  <span className="text-right text-sm text-muted">{m.segment}</span>
                </div>
                <p className="tabular mt-2 font-display text-2xl font-semibold">From ₹{priceRange(m).min.toFixed(1)} L</p>
                <p className="mt-2 flex items-center gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="size-4 text-accent" /> Up to {maxRange(m)} km
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4 text-accent" /> {m.seats} seats
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => open("chat", `Tell me about the ${m.name}.`)}
                  className="mt-5 self-start rounded-full border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
                >
                  Ask Martha about {short} →
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: Route, title: "Up to 560 km range", text: "Real-world range for city weeks and highway weekends." },
    { icon: BatteryCharging, title: "Charge at home", text: "A 7.4 kW wallbox comes with every Martha, installed free." },
    { icon: ShieldCheck, title: "8-year battery warranty", text: "Covered for 8 years or 1,60,000 km." },
    { icon: IndianRupee, title: "₹1–1.5 per km", text: "Running costs a fraction of petrol." },
  ];
  return (
    <section id="charging" className="border-y border-border bg-surface/50 py-16 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Why electric</p>
        <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Less to worry about.</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="size-6 text-accent" />
              <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { open } = useAgentUI();
  const steps = [
    ["Tell her what you need", "Budget, family size, daily drive, charging at home."],
    ["Get a recommendation", "The right model and trim, with honest answers to every question."],
    ["Get a callback (optional)", "If you'd like, our sales team calls you at a time that suits you."],
  ];
  return (
    <section id="how" className="py-16 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">How Martha works</p>
        <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">A conversation, not a form.</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map(([t, d], i) => (
            <li key={t}>
              <span className="tabular font-display text-5xl font-semibold text-border">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => open("voice")}
          className="mt-12 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition hover:brightness-110"
        >
          <Mic className="size-5" /> Talk to Martha
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 text-sm text-muted">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 sm:px-6">
        <Logo />
        <p>
          Martha Motors is a fictional brand created for a product demo. All vehicles, specifications and prices are
          illustrative.
        </p>
        <p>
          Martha is an AI assistant and can make mistakes. Nothing is stored on our servers; your conversation stays in
          this browser. To reply to you, your voice and messages are processed by Groq, and by Google if a backup
          service is used (Google may use data from its free service to improve its products). Martha&apos;s voice is
          generated on your device.
        </p>
        <p>© {new Date().getFullYear()} Martha Motors (demo)</p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ModelLineup />
        <Benefits />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
