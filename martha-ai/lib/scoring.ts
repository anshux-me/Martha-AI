import { catalogue, priceRange, type Model } from "@/lib/knowledge/catalogue";
import type { Band, ReportExtraction, ScoreBreakdown } from "@/lib/schemas";

const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export function isValidIndianMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return PHONE_RE.test(phone.replace(/[\s-]/g, "").replace(/^\+91/, ""));
}

export function budgetFitScore(
  min: number | null,
  max: number | null,
  models: Model[] = catalogue,
): number {
  if (min == null && max == null) return 5;
  const lo = min ?? 0;
  const hi = max ?? min ?? 0;
  const ranges = models.map(priceRange);
  if (ranges.some((r) => lo <= r.max && hi >= r.min)) return 25;
  // within 15% of any range
  if (ranges.some((r) => hi >= r.min * 0.85 && lo <= r.max * 1.15)) return 15;
  return 0;
}

export function timelineScore(t: ReportExtraction["leadProfile"]["purchaseTimeline"]): number {
  switch (t) {
    case "<1 month":
      return 25;
    case "1-3 months":
      return 18;
    case "3-6 months":
      return 10;
    default:
      return 3;
  }
}

export function needClarityScore(p: ReportExtraction["leadProfile"]): number {
  if (p.modelsInterested.length > 0) return 20;
  if (p.bodyType && p.seatsNeeded) return 12;
  return 4;
}

export function engagementScore(
  sentiment: "positive" | "neutral" | "negative",
  userTurns: number,
): number {
  const s = sentiment === "positive" ? 10 : sentiment === "neutral" ? 6 : 1;
  return Math.min(15, s + Math.min(5, Math.floor(userTurns / 3)));
}

export function intentScore(x: ReportExtraction): number {
  if (x.callback.requested && isValidIndianMobile(x.customer.phone)) return 15;
  if (x.askedPriceFinanceOrTestDrive) return 8;
  return 0;
}

export function bandFor(total: number): Band {
  if (total >= 70) return "hot";
  if (total >= 40) return "warm";
  return "cold";
}

export function scoreLead(
  x: ReportExtraction,
  userTurns: number,
): { total: number; band: Band; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    budgetFit: budgetFitScore(x.leadProfile.budgetMinLakh, x.leadProfile.budgetMaxLakh),
    timeline: timelineScore(x.leadProfile.purchaseTimeline),
    needClarity: needClarityScore(x.leadProfile),
    engagement: engagementScore(x.sentiment.overall, userTurns),
    intent: intentScore(x),
  };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, band: bandFor(total), breakdown };
}
