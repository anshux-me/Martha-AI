// Streaming sentence chunker: feed tokens, get complete sentences out as soon as they end.
// Handles decimals ("29.5"), common abbreviations and over-long sentences.

const ABBREVIATIONS = ["rs.", "approx.", "e.g.", "i.e.", "etc.", "mr.", "mrs.", "ms.", "dr.", "vs.", "no."];
const MAX_CHARS = 200;

export class SentenceSplitter {
  private buffer = "";

  /** Add streamed text; returns any sentences that are now complete. */
  push(text: string): string[] {
    this.buffer += text;
    const out: string[] = [];
    let idx: number;
    while ((idx = this.findBoundary(this.buffer)) !== -1) {
      const sentence = this.buffer.slice(0, idx + 1).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (sentence) out.push(sentence);
    }
    // Force-split very long sentences at a comma/semicolon (or a space).
    while (this.buffer.length > MAX_CHARS) {
      const head = this.buffer.slice(0, MAX_CHARS);
      let cut = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"));
      if (cut < 40) cut = head.lastIndexOf(" ");
      if (cut < 1) cut = MAX_CHARS - 1;
      out.push(this.buffer.slice(0, cut + 1).trim());
      this.buffer = this.buffer.slice(cut + 1);
    }
    return out;
  }

  /** Returns whatever is left (call when the stream ends). */
  flush(): string[] {
    const rest = this.buffer.trim();
    this.buffer = "";
    return rest ? [rest] : [];
  }

  private findBoundary(s: string): number {
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "\n" && s.slice(0, i).trim()) return i;
      if (ch !== "." && ch !== "!" && ch !== "?") continue;
      const next = s[i + 1];
      if (next === undefined) return -1; // wait: could be a decimal or more punctuation
      if (next !== " " && next !== "\n" && next !== '"' && next !== "'" && next !== ")") continue;
      if (ch === ".") {
        const before = s.slice(0, i + 1).toLowerCase();
        const lastWord = before.split(/\s+/).pop() ?? "";
        if (ABBREVIATIONS.includes(lastWord)) continue;
        if (/\d$/.test(s.slice(0, i)) && /\d/.test(s[i + 2] ?? "")) continue;
      }
      return i;
    }
    return -1;
  }
}
