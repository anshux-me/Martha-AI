export const REPORT_SYSTEM_PROMPT = `You analyse a sales conversation between Martha (an AI sales advisor for
Martha Motors, an EV brand) and a website visitor. Extract facts ONLY from the transcript; use null when
something was not said. Respond with a single JSON object, no prose, matching exactly:

{
  "summary": string,                       // 3-5 sentences, third person, about the visitor
  "keyPoints": string[],                   // 3-6 short bullets
  "customer": { "name": string|null, "phone": string|null, "email": string|null },
  "callback": { "requested": boolean, "preferredTime": string|null, "consent": boolean },
  "leadProfile": {
    "budgetMinLakh": number|null, "budgetMaxLakh": number|null,
    "useCase": string|null, "dailyKm": number|null, "seatsNeeded": number|null,
    "bodyType": "hatchback"|"SUV"|"sedan"|"coupe"|null,
    "homeCharging": "yes"|"no"|"unsure"|null,
    "purchaseTimeline": "<1 month"|"1-3 months"|"3-6 months"|"exploring"|null,
    "financingInterest": "emi"|"lease"|"cash"|null,
    "decisionMaker": string|null,
    "modelsInterested": string[]           // e.g. ["Terra Long Range"]
  },
  "sentiment": { "overall": "positive"|"neutral"|"negative", "trend": string },
  "objections": string[],
  "questionsAsked": string[],
  "askedPriceFinanceOrTestDrive": boolean, // asked about on-road price, EMI/finance, offers or test drive
  "nextAction": string                     // one sentence for the sales team
}

Rules: budget "around 30 lakh" → min 28, max 32. A single number "under 40" → min null, max 40.
Phone: digits only as spoken/typed, keep exactly as given. consent=true only if the visitor agreed to be called.`;
