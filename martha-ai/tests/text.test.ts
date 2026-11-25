import { encode } from "gpt-tokenizer";
import { describe, expect, it } from "vitest";
import { parseChain } from "@/lib/config";
import { compressTranscript, trimHistory } from "@/lib/history";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { SentenceSplitter } from "@/lib/sentence-splitter";
import { toSpeechText } from "@/lib/speech-text";
import { pickBestVoice, rankVoices, type VoiceLike } from "@/lib/voices";

const feed = (chunks: string[]) => {
  const s = new SentenceSplitter();
  const out = chunks.flatMap((c) => s.push(c));
  return [...out, ...s.flush()];
};

describe("SentenceSplitter", () => {
  it("emits sentences as soon as they end, across token boundaries", () => {
    const s = new SentenceSplitter();
    expect(s.push("The Terra is a great")).toEqual([]);
    expect(s.push(" fit. It has")).toEqual(["The Terra is a great fit."]);
    expect(s.push(" 500 km of range! Want")).toEqual(["It has 500 km of range!"]);
    expect(s.flush()).toEqual(["Want"]);
  });

  it("does not split decimals or abbreviations", () => {
    expect(feed(["It costs ₹29", ".5 L approx. on paper. Next one."])).toEqual([
      "It costs ₹29.5 L approx. on paper.",
      "Next one.",
    ]);
    expect(feed(["Compare Terra vs. Atlas today."])).toEqual(["Compare Terra vs. Atlas today."]);
  });

  it("force-splits very long sentences at commas", () => {
    const long = "The Atlas seats seven, " + "it has a big boot, ".repeat(15) + "and long range.";
    const out = feed([long]);
    expect(out.length).toBeGreaterThan(1);
    out.forEach((s) => expect(s.length).toBeLessThanOrEqual(200));
    expect(out.join(" ").replace(/\s+/g, " ")).toBe(long.trim().replace(/\s+/g, " "));
  });
});

describe("toSpeechText", () => {
  it("strips markdown/emojis and expands units", () => {
    expect(toSpeechText("**Terra LR**: ₹29.5 L, 500 km 🚗")).toBe("Terra LR: 29.5 lakh rupees, 500 kilometres");
    expect(toSpeechText("- a 72kWh pack\n- see https://x.y")).toBe("a 72 kilowatt hours pack see");
  });
});

describe("voice ranking", () => {
  const v = (name: string, lang: string): VoiceLike => ({ name, lang, voiceURI: name, localService: true });
  const voices = [v("Alex", "en-US"), v("Thomas", "fr-FR"), v("Microsoft Neerja Online (Natural)", "en-IN"), v("Google UK English Female", "en-GB")];

  it("prefers Indian English natural voices and drops non-English", () => {
    const ranked = rankVoices(voices);
    expect(ranked[0].name).toContain("Neerja");
    expect(ranked.find((x) => x.lang === "fr-FR")).toBeUndefined();
  });

  it("respects a saved preference", () => {
    expect(pickBestVoice(voices, "Alex")?.name).toBe("Alex");
    expect(pickBestVoice(voices, "missing")?.name).toContain("Neerja");
  });
});

describe("history", () => {
  const msgs = Array.from({ length: 20 }, (_, i) => ({
    role: (i % 2 === 0 ? "assistant" : "user") as "assistant" | "user",
    content: `m${i}. More words here.`,
  }));

  it("keeps the greeting plus the last N messages", () => {
    const t = trimHistory(msgs, 12);
    expect(t).toHaveLength(13);
    expect(t[0].content).toBe("m0. More words here.");
    expect(t[12].content).toBe("m19. More words here.");
    expect(trimHistory(msgs.slice(0, 5), 12)).toHaveLength(5);
  });

  it("compresses long transcripts but keeps visitor messages", () => {
    const out = compressTranscript(msgs, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out).toContain("Visitor: m19. More words here.");
  });
});

describe("system prompt", () => {
  it("stays within the free-tier token budget (≤ 2,000 tokens)", () => {
    for (const mode of ["voice", "chat"] as const) {
      const tokens = encode(buildSystemPrompt(mode)).length;
      expect(tokens).toBeLessThanOrEqual(2000);
    }
  });

  it("contains every model and the callback protocol", () => {
    const p = buildSystemPrompt("voice");
    for (const m of ["Spark", "Terra", "Aero", "Atlas", "Volt GT"]) expect(p).toContain(m);
    expect(p).toContain("consent");
    expect(p).toContain("VOICE:");
    expect(buildSystemPrompt("chat")).toContain("CHAT:");
  });
});

describe("parseChain", () => {
  it("splits on the first colon so model ids can contain slashes", () => {
    expect(parseChain("groq:openai/gpt-oss-120b, gemini:gemini-flash-latest")).toEqual([
      { provider: "groq", model: "openai/gpt-oss-120b" },
      { provider: "gemini", model: "gemini-flash-latest" },
    ]);
    expect(() => parseChain("openai:gpt")).toThrow();
  });
});
