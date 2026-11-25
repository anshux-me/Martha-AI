import type { Report } from "@/lib/schemas";

export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  at: string;
  via: "voice" | "chat";
  interrupted?: boolean;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function transcriptText(messages: StoredMessage[]): string {
  return messages
    .map((m) => `[${time(m.at)}] ${m.role === "assistant" ? "Martha" : "You"}: ${m.content}${m.interrupted ? " (interrupted)" : ""}`)
    .join("\n");
}

export function reportMarkdown(report: Report, messages: StoredMessage[]): string {
  const p = report.leadProfile;
  const budget =
    p.budgetMinLakh != null || p.budgetMaxLakh != null
      ? `₹${p.budgetMinLakh ?? "?"}–${p.budgetMaxLakh ?? "?"} L`
      : "—";
  const row = (k: string, v: unknown) => `| ${k} | ${v ?? "—"} |`;
  return [
    `# Martha Motors — call report`,
    ``,
    `**Lead score:** ${report.score.total}/100 (${report.score.band.toUpperCase()}) · **Sentiment:** ${report.sentiment.overall} · ${Math.round(report.meta.durationSec / 60)} min · ${report.meta.mode}`,
    ``,
    `## Summary`,
    report.summary,
    ``,
    ...report.keyPoints.map((k) => `- ${k}`),
    ``,
    `## Lead profile`,
    `| Field | Value |`,
    `|---|---|`,
    row("Budget", budget),
    row("Use case", p.useCase),
    row("Daily km", p.dailyKm),
    row("Seats", p.seatsNeeded),
    row("Body type", p.bodyType),
    row("Home charging", p.homeCharging),
    row("Timeline", p.purchaseTimeline),
    row("Financing", p.financingInterest),
    row("Decision maker", p.decisionMaker),
    row("Interested in", p.modelsInterested.join(", ") || "—"),
    ``,
    `## Callback`,
    report.callback.requested
      ? `Requested by ${report.customer.name ?? "visitor"} on ${report.customer.phone ?? "—"}, ${report.callback.preferredTime ?? "any time"} (consent: ${report.callback.consent ? "yes" : "no"})`
      : "Not requested.",
    ``,
    `## Objections`,
    ...(report.objections.length ? report.objections.map((o) => `- ${o}`) : ["- None"]),
    ``,
    `## Next action`,
    report.nextAction,
    ``,
    `## Score breakdown`,
    ...Object.entries(report.score.breakdown).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Transcript`,
    "```",
    transcriptText(messages),
    "```",
  ].join("\n");
}

export function leadJson(report: Report, messages: StoredMessage[]): string {
  return JSON.stringify({ source: "martha-ai", crmReady: true, report, transcript: messages }, null, 2);
}

export function downloadFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileStamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
