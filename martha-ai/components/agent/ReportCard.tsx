"use client";
import { Download, RotateCcw } from "lucide-react";
import { downloadFile, fileStamp, leadJson, reportMarkdown, transcriptText, type StoredMessage } from "@/lib/export";
import type { Band, Report } from "@/lib/schemas";

const BAND: Record<Band, { label: string; emoji: string; cls: string; color: string }> = {
  hot: { label: "HOT", emoji: "🔥", cls: "bg-danger/15 text-danger", color: "var(--danger)" },
  warm: { label: "WARM", emoji: "🌤", cls: "bg-warning/15 text-warning", color: "var(--warning)" },
  cold: { label: "COLD", emoji: "❄️", cls: "bg-accent-2/15 text-accent-2", color: "var(--accent-2)" },
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Lead score ${score} out of 100`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset 900ms ease-out" }}
      />
      <text x="32" y="37" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="600" className="tabular">
        {score}
      </text>
    </svg>
  );
}

const fmtDuration = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;

export function ReportCard({
  report,
  error,
  messages,
  onRetry,
  onNew,
}: {
  report: Report | null;
  error: string | null;
  messages: StoredMessage[];
  onRetry: () => void;
  onNew: () => void;
}) {
  const stamp = fileStamp();
  const downloads = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <DlButton onClick={() => downloadFile(`martha-transcript-${stamp}.txt`, transcriptText(messages))}>
        Transcript .txt
      </DlButton>
      {report && (
        <>
          <DlButton
            onClick={() => downloadFile(`martha-call-report-${stamp}.md`, reportMarkdown(report, messages), "text/markdown")}
          >
            Report .md
          </DlButton>
          <DlButton onClick={() => downloadFile(`martha-lead-${stamp}.json`, leadJson(report, messages), "application/json")}>
            Lead .json
          </DlButton>
        </>
      )}
    </div>
  );

  if (!report) {
    return (
      <div className="flex flex-col gap-5 p-5">
        <h3 className="font-display text-xl font-semibold">Call summary</h3>
        <p className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">{error ?? "No report available."}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 self-start rounded-full bg-surface-2 px-4 py-2 text-sm"
        >
          <RotateCcw className="size-4" /> Try again
        </button>
        {downloads}
        <NewButton onClick={onNew} />
      </div>
    );
  }

  const b = BAND[report.score.band];
  const p = report.leadProfile;
  const budget =
    p.budgetMinLakh != null || p.budgetMaxLakh != null
      ? `₹${p.budgetMinLakh ?? "?"}–${p.budgetMaxLakh ?? "?"} L`
      : "—";
  const needs: [string, string | number | null][] = [
    ["Budget", budget],
    ["Seats", p.seatsNeeded],
    ["Daily", p.dailyKm != null ? `${p.dailyKm} km` : null],
    ["Body type", p.bodyType],
    ["Charging", p.homeCharging === "yes" ? "Home ✓" : p.homeCharging],
    ["Timeline", p.purchaseTimeline],
    ["Financing", p.financingInterest?.toUpperCase() ?? null],
  ];

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold">Call summary</h3>
          <p className="mt-1 text-sm text-muted">
            {fmtDuration(report.meta.durationSec)} · {report.meta.mode === "voice" ? "Voice" : "Chat"} ·{" "}
            {report.meta.turns} messages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.cls}`}>
            {b.emoji} {b.label}
          </span>
          <ScoreRing score={report.score.total} color={b.color} />
        </div>
      </div>

      <section>
        <h4 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Summary</h4>
        <p className="mt-2 text-[15px] leading-6">{report.summary}</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Your needs</h4>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {needs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Interested in</h4>
          <p className="mt-2 text-sm">{p.modelsInterested.length ? p.modelsInterested.join(", ") : "—"}</p>
        </div>
      </section>

      {report.objections.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Concerns</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.objections.map((o) => (
              <span key={o} className="rounded-full border border-border px-3 py-1 text-sm">
                {o}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-md border border-accent/50 bg-accent/5 p-4">
        <h4 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Next step</h4>
        <p className="mt-1 text-[15px] leading-6">
          {report.callback.requested
            ? `Our sales team will call ${report.customer.name ?? "you"}${report.callback.preferredTime ? ` ${report.callback.preferredTime.toLowerCase()}` : ""}${report.customer.phone ? ` on ${report.customer.phone}` : ""}.`
            : report.nextAction || "No callback requested."}
        </p>
      </section>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Score breakdown</summary>
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              ["Budget fit", report.score.breakdown.budgetFit, 25],
              ["Timeline", report.score.breakdown.timeline, 25],
              ["Need clarity", report.score.breakdown.needClarity, 20],
              ["Engagement", report.score.breakdown.engagement, 15],
              ["Intent", report.score.breakdown.intent, 15],
            ] as const
          ).map(([label, v, max]) => (
            <div key={label} className="grid grid-cols-[110px_1fr_48px] items-center gap-3">
              <span className="text-muted">{label}</span>
              <div className="h-1.5 rounded-full bg-border">
                <div className="h-1.5 rounded-full" style={{ width: `${(v / max) * 100}%`, background: b.color }} />
              </div>
              <span className="tabular text-right">
                {v}/{max}
              </span>
            </div>
          ))}
          <p className="mt-1 text-xs text-muted">Sentiment: {report.sentiment.overall}. {report.sentiment.trend}</p>
        </div>
      </details>

      {downloads}
      <NewButton onClick={onNew} />
    </div>
  );
}

function DlButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-sm transition hover:text-accent"
    >
      <Download className="size-4" /> {children}
    </button>
  );
}

function NewButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full bg-accent px-5 py-3 font-semibold text-accent-fg transition hover:brightness-110"
      >
        Start new conversation
      </button>
      <p className="text-center text-xs text-muted">Stored only in this browser. Nothing was saved on our servers.</p>
    </div>
  );
}
