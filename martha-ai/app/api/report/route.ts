import { getConfig, parseChain } from "@/lib/config";
import { checkRate, jsonError, logEvent, requestId } from "@/lib/http";
import { AllProvidersBusyError, completeWithFallback, NotConfiguredError } from "@/lib/llm/chain";
import { REPORT_SYSTEM_PROMPT } from "@/lib/prompts/report";
import { ReportExtractionSchema, ReportRequestSchema, type Report } from "@/lib/schemas";
import { scoreLead } from "@/lib/scoring";
import { compressTranscript } from "@/lib/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: Request) {
  const rid = requestId();
  const limited = checkRate(req, rid);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON", rid);
  }
  const parsed = ReportRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request", rid);

  const { messages, mode, startedAt, endedAt, sessionId } = parsed.data;
  const cfg = getConfig();
  const chain = parseChain(cfg.REPORT_CHAIN);
  const transcript = compressTranscript(messages);
  const t0 = performance.now();

  try {
    let feedback = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const { entry, content } = await completeWithFallback(chain, {
        json: true,
        temperature: 0,
        messages: [
          { role: "system", content: REPORT_SYSTEM_PROMPT },
          { role: "user", content: `TRANSCRIPT:\n${transcript}${feedback}` },
        ],
      });
      let extraction;
      try {
        extraction = ReportExtractionSchema.parse(extractJson(content));
      } catch (e) {
        feedback = `\n\nYour previous output was invalid (${(e as Error).message.slice(0, 300)}). Return ONLY the JSON object.`;
        continue;
      }
      const userTurns = messages.filter((m) => m.role === "user").length;
      const { askedPriceFinanceOrTestDrive: _asked, ...rest } = extraction;
      void _asked;
      const report: Report = {
        ...rest,
        score: scoreLead(extraction, userTurns),
        meta: {
          turns: messages.length,
          userTurns,
          durationSec: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
          mode,
          generatedAt: new Date().toISOString(),
          model: `${entry.provider}:${entry.model}`,
        },
      };
      logEvent({ rid, route: "report", sessionId, model: report.meta.model, totalMs: Math.round(performance.now() - t0), status: 200 });
      return Response.json(report, { headers: { "x-request-id": rid, "cache-control": "no-store" } });
    }
    return jsonError(502, "invalid_model_output", "Couldn't build the report. Please try again.", rid);
  } catch (err) {
    const busy = err instanceof AllProvidersBusyError;
    const unconfigured = err instanceof NotConfiguredError;
    logEvent({ rid, route: "report", sessionId, status: busy || unconfigured ? 503 : 502, error: (err as Error).message?.slice(0, 200) });
    if (unconfigured) return jsonError(503, "not_configured", "Martha isn't set up yet: the server has no AI API key.", rid);
    return jsonError(busy ? 503 : 502, busy ? "all_providers_busy" : "upstream_error", "Couldn't build the report right now.", rid);
  }
}
