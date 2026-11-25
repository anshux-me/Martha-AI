import { z } from "zod";

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});
export type ChatMessage = z.infer<typeof MessageSchema>;

export const ChatRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  mode: z.enum(["voice", "chat"]),
  messages: z.array(MessageSchema).min(1).max(60),
});

export const ReportRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  mode: z.enum(["voice", "chat"]),
  startedAt: z.string(),
  endedAt: z.string(),
  messages: z.array(MessageSchema).min(1).max(200),
});

const nullableStr = z.string().nullable().optional().transform((v) => v ?? null);
const nullableNum = z.coerce.number().nullable().optional().catch(null).transform((v) => v ?? null);

export const ReportExtractionSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  customer: z
    .object({ name: nullableStr, phone: nullableStr, email: nullableStr })
    .default({ name: null, phone: null, email: null }),
  callback: z
    .object({
      requested: z.boolean().default(false),
      preferredTime: nullableStr,
      consent: z.boolean().default(false),
    })
    .default({ requested: false, preferredTime: null, consent: false }),
  leadProfile: z
    .object({
      budgetMinLakh: nullableNum,
      budgetMaxLakh: nullableNum,
      useCase: nullableStr,
      dailyKm: nullableNum,
      seatsNeeded: nullableNum,
      bodyType: z.enum(["hatchback", "SUV", "sedan", "coupe"]).nullable().optional().catch(null).transform((v) => v ?? null),
      homeCharging: z.enum(["yes", "no", "unsure"]).nullable().optional().catch(null).transform((v) => v ?? null),
      purchaseTimeline: z
        .enum(["<1 month", "1-3 months", "3-6 months", "exploring"])
        .nullable()
        .optional()
        .catch(null)
        .transform((v) => v ?? null),
      financingInterest: z.enum(["emi", "lease", "cash"]).nullable().optional().catch(null).transform((v) => v ?? null),
      decisionMaker: nullableStr,
      modelsInterested: z.array(z.string()).default([]),
    })
    .default({
      budgetMinLakh: null, budgetMaxLakh: null, useCase: null, dailyKm: null, seatsNeeded: null,
      bodyType: null, homeCharging: null, purchaseTimeline: null, financingInterest: null,
      decisionMaker: null, modelsInterested: [],
    }),
  sentiment: z
    .object({ overall: z.enum(["positive", "neutral", "negative"]).catch("neutral"), trend: z.string().default("") })
    .default({ overall: "neutral", trend: "" }),
  objections: z.array(z.string()).default([]),
  questionsAsked: z.array(z.string()).default([]),
  askedPriceFinanceOrTestDrive: z.boolean().default(false),
  nextAction: z.string().default(""),
});
export type ReportExtraction = z.infer<typeof ReportExtractionSchema>;
export type LeadProfile = ReportExtraction["leadProfile"];

export type ScoreBreakdown = {
  budgetFit: number;
  timeline: number;
  needClarity: number;
  engagement: number;
  intent: number;
};
export type Band = "hot" | "warm" | "cold";

export type Report = Omit<ReportExtraction, "askedPriceFinanceOrTestDrive"> & {
  score: { total: number; band: Band; breakdown: ScoreBreakdown };
  meta: {
    turns: number;
    userTurns: number;
    durationSec: number;
    mode: "voice" | "chat";
    generatedAt: string;
    model: string;
  };
};
