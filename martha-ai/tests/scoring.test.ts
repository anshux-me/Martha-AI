import { describe, expect, it } from "vitest";
import { ReportExtractionSchema } from "@/lib/schemas";
import {
  bandFor,
  budgetFitScore,
  engagementScore,
  isValidIndianMobile,
  needClarityScore,
  scoreLead,
  timelineScore,
} from "@/lib/scoring";

const priya = ReportExtractionSchema.parse({
  summary: "Priya wants a family EV around 30 lakh.",
  customer: { name: "Priya", phone: "98450 12345", email: null },
  callback: { requested: true, preferredTime: "Tomorrow evening", consent: true },
  leadProfile: {
    budgetMinLakh: 28,
    budgetMaxLakh: 32,
    seatsNeeded: 5,
    bodyType: "SUV",
    homeCharging: "yes",
    purchaseTimeline: "1-3 months",
    financingInterest: "emi",
    modelsInterested: ["Terra Long Range"],
  },
  sentiment: { overall: "positive", trend: "warmed up" },
  askedPriceFinanceOrTestDrive: true,
});

describe("scoring rubric", () => {
  it("scores the PRD demo scenario as 90 / hot", () => {
    const s = scoreLead(priya, 7);
    expect(s.breakdown).toEqual({ budgetFit: 25, timeline: 18, needClarity: 20, engagement: 12, intent: 15 });
    expect(s.total).toBe(90);
    expect(s.band).toBe("hot");
  });

  it("budget fit: overlap, near miss, unknown, no fit", () => {
    expect(budgetFitScore(25, 30)).toBe(25);
    expect(budgetFitScore(null, 10)).toBe(15); // 10 is within 15% of Spark's 11.5
    expect(budgetFitScore(null, null)).toBe(5);
    expect(budgetFitScore(1, 3)).toBe(0);
    expect(budgetFitScore(60, 70)).toBe(15); // 70 ≥ 78 × 0.85
    expect(budgetFitScore(120, 150)).toBe(0);
  });

  it("timeline", () => {
    expect(timelineScore("<1 month")).toBe(25);
    expect(timelineScore("1-3 months")).toBe(18);
    expect(timelineScore("3-6 months")).toBe(10);
    expect(timelineScore("exploring")).toBe(3);
    expect(timelineScore(null)).toBe(3);
  });

  it("need clarity", () => {
    expect(needClarityScore(priya.leadProfile)).toBe(20);
    expect(needClarityScore({ ...priya.leadProfile, modelsInterested: [] })).toBe(12);
    expect(needClarityScore({ ...priya.leadProfile, modelsInterested: [], bodyType: null })).toBe(4);
  });

  it("engagement is capped at 15", () => {
    expect(engagementScore("positive", 30)).toBe(15);
    expect(engagementScore("neutral", 3)).toBe(7);
    expect(engagementScore("negative", 0)).toBe(1);
  });

  it("intent needs a valid phone for full points", () => {
    expect(scoreLead({ ...priya, customer: { ...priya.customer, phone: "12345" } }, 7).breakdown.intent).toBe(8);
    expect(
      scoreLead({ ...priya, askedPriceFinanceOrTestDrive: false, callback: { ...priya.callback, requested: false } }, 7)
        .breakdown.intent,
    ).toBe(0);
  });

  it("bands", () => {
    expect(bandFor(70)).toBe("hot");
    expect(bandFor(69)).toBe("warm");
    expect(bandFor(40)).toBe("warm");
    expect(bandFor(39)).toBe("cold");
  });

  it("validates Indian mobile numbers", () => {
    expect(isValidIndianMobile("9845012345")).toBe(true);
    expect(isValidIndianMobile("+91 98450-12345")).toBe(true);
    expect(isValidIndianMobile("5845012345")).toBe(false);
    expect(isValidIndianMobile("98450")).toBe(false);
    expect(isValidIndianMobile(null)).toBe(false);
  });
});

describe("report extraction schema", () => {
  it("tolerates missing fields and bad enums from the model", () => {
    const x = ReportExtractionSchema.parse({
      summary: "Short chat.",
      leadProfile: { bodyType: "truck", budgetMaxLakh: "40" },
      sentiment: { overall: "excited" },
    });
    expect(x.leadProfile.bodyType).toBeNull();
    expect(x.leadProfile.budgetMaxLakh).toBe(40);
    expect(x.sentiment.overall).toBe("neutral");
    expect(x.callback.requested).toBe(false);
    expect(x.leadProfile.modelsInterested).toEqual([]);
  });
});
