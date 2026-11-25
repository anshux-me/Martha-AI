"use client";
import { ArrowRight, Mic } from "lucide-react";
import { useAgentUI } from "@/components/agent/AgentProvider";
import { Monogram } from "@/components/brand/Monogram";
import { CarSketch } from "@/components/landing/CarSketch";
import { catalogue, maxRange, priceRange } from "@/lib/knowledge/catalogue";

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Monogram />
      <span className="text-[13px] font-medium tracking-[0.28em]">MARTHA</span>
    </span>
  );
}

function Label({ n, children }: { n?: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
      {n && <span className="text-text/70">{n} — </span>}
      {children}
    </p>
  );
}

function Navbar() {
  const { open } = useAgentUI();
  return (
    <div className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4">
      <nav className="mx-auto flex h-14 max-w-[1080px] items-center justify-between rounded-full border border-white/10 bg-[#0e1013]/75 pr-2 pl-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <a href="#top" aria-label="Martha Motors home">
          <Wordmark />
        </a>
        <div className="hidden items-center gap-1 text-sm text-muted md:flex">
          {[
            ["Models", "#models"],
            ["Ownership", "#numbers"],
            ["How it works", "#how"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-1.5 transition hover:bg-white/5 hover:text-text">
              {label}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={() => open("voice")}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-text px-4 text-sm font-medium text-bg transition hover:bg-white"
        >
          <Mic className="size-4" /> Talk to Martha
        </button>
      </nav>
    </div>
  );
}

function Hero() {
  const { open } = useAgentUI();
  return (
    <section id="top" className="pt-32 pb-14 sm:pt-40 sm:pb-20">
      <div className="mx-auto grid max-w-[1080px] items-center gap-12 px-5 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Label>Martha Motors · AI sales advisor</Label>
          <h1 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.01em] sm:text-[68px]">
            Find the right electric car in a <em className="text-accent not-italic sm:italic">five-minute</em> conversation.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-7 text-muted">
            Tell Martha how far you drive, who rides with you and what you want to spend. She&apos;ll suggest a car,
            answer the awkward questions about charging and batteries, and ask our team to call you only if you want
            that.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => open("voice")}
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-accent px-7 text-[16px] font-medium text-accent-fg transition hover:brightness-105"
            >
              <Mic className="size-[18px]" /> Talk to Martha
            </button>
            <button
              type="button"
              onClick={() => open("chat")}
              className="inline-flex items-center justify-center gap-1.5 text-[15px] text-muted transition hover:text-text"
            >
              or type instead <ArrowRight className="size-4" />
            </button>
          </div>
          <p className="mt-6 max-w-md text-[13px] leading-5 text-muted/80">
            Martha is an AI and uses your microphone. Nothing you say is stored on our servers.
          </p>
        </div>
        <figure className="text-[#cfd5dd]">
          <CarSketch model="terra" annotate className="w-full" />
          <figcaption className="mt-3 border-t border-white/10 pt-3 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
            Fig. 1 — Martha Terra Long Range, side elevation
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Numbers() {
  const items = [
    ["560", "km", "Longest range in the lineup (Aero Long Range)"],
    ["28", "min", "10–80% on a FastCharge DC point (Terra)"],
    ["8", "yrs", "Battery warranty, or 1,60,000 km"],
    ["₹1–1.5", "/km", "Charging at home, vs ₹6–8 for petrol"],
  ];
  return (
    <section id="numbers" className="border-y border-white/10">
      <div className="mx-auto grid max-w-[1080px] grid-cols-2 lg:grid-cols-4">
        {items.map(([num, unit, text], i) => (
          <div
            key={text}
            className={`px-5 py-8 sm:py-10 ${i % 2 === 1 ? "border-l border-white/10" : ""} ${i >= 2 ? "border-t border-white/10 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <p className="font-display text-[42px] leading-none sm:text-5xl">
              {num}
              <span className="ml-1 font-mono text-sm text-muted">{unit}</span>
            </p>
            <p className="mt-3 max-w-[16rem] text-sm leading-5 text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelLineup() {
  const { open } = useAgentUI();
  return (
    <section id="models" className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1080px] px-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Label n="01">The lineup</Label>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">Five cars, drawn to size.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted">
            Ex-showroom prices. On-road prices, offers and exchange values come from our sales team.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-[14px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {catalogue.map((m) => {
            const short = m.name.replace("Martha ", "");
            return (
              <article key={m.id} className="flex flex-col bg-bg p-5 sm:p-6">
                <div className="text-[#c9cfd8]">
                  <CarSketch model={m.id} className="w-full" />
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[28px] leading-none">{short}</h3>
                  <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">{m.segment}</span>
                </div>
                <dl className="mt-5 grid grid-cols-3 border-t border-white/10 pt-4 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">From</dt>
                    <dd className="mt-1 tabular">₹{priceRange(m).min.toFixed(1)} L</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Range</dt>
                    <dd className="mt-1 tabular">{maxRange(m)} km</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Seats</dt>
                    <dd className="mt-1 tabular">{m.seats}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => open("chat", `Tell me about the ${m.name}.`)}
                  className="mt-6 inline-flex items-center gap-1.5 self-start text-sm text-text/80 underline decoration-white/20 underline-offset-4 transition hover:text-accent hover:decoration-accent"
                >
                  Ask Martha about the {short} <ArrowRight className="size-3.5" />
                </button>
              </article>
            );
          })}
          <article className="flex flex-col justify-between bg-bg p-6">
            <p className="font-display text-[28px] leading-tight">Not sure which one?</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Most people ask Martha about range on highway trips, charging in an apartment and the EMI. Ask her
              anything.
            </p>
            <button
              type="button"
              onClick={() => open("voice")}
              className="mt-6 inline-flex h-11 items-center gap-2 self-start rounded-full border border-white/15 px-5 text-sm transition hover:border-accent hover:text-accent"
            >
              <Mic className="size-4" /> Talk to Martha
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["Tell her how you drive", "Budget, family size, daily distance, whether you can charge at home."],
    ["Get a straight answer", "One or two cars that fit, with the reasons, and honest answers on range, charging and cost."],
    ["Decide what happens next", "If you'd like a call from sales, she takes your number. If not, you leave with a written summary."],
  ];
  return (
    <section id="how" className="border-t border-white/10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1080px] px-5">
        <Label n="02">How it works</Label>
        <h2 className="mt-3 max-w-xl font-display text-4xl sm:text-5xl">A conversation, not a form.</h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map(([t, d], i) => (
            <li key={t} className="border-t border-white/15 pt-5">
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
              <h3 className="mt-3 font-display text-2xl">{t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 pt-14 pb-8 text-sm text-muted">
      <div className="mx-auto max-w-[1080px] px-5">
        <div className="grid gap-8 sm:grid-cols-[1fr_1.4fr]">
          <div className="text-text">
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted">Electric, made personal.</p>
          </div>
          <div className="space-y-3 leading-6">
            <p>
              Martha Motors is a fictional brand made for a product demo. Every car, specification and price on this
              site is illustrative.
            </p>
            <p>
              Martha is an AI assistant and can get things wrong. Nothing is stored on our servers; your conversation
              stays in this browser. To reply, your voice and messages are processed by Groq, and by Google if a
              backup service is used (Google may use data from its free service to improve its products).
            </p>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Martha Motors (demo)</p>
          <p>
            Built by{" "}
            <a
              href="https://itsanshu.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text underline decoration-white/30 underline-offset-4 transition hover:text-accent hover:decoration-accent"
            >
              Anshu
            </a>
          </p>
        </div>
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
        <Numbers />
        <ModelLineup />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
