// Copies the Silero VAD model, its audio worklet and the ONNX Runtime wasm files into public/vad,
// so the browser loads them from our own origin (no third-party CDN at runtime).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vad");
mkdirSync(out, { recursive: true });

const vadDist = join(root, "node_modules", "@ricky0123", "vad-web", "dist");
const ortDist = join(root, "node_modules", "onnxruntime-web", "dist");

const copy = (dir, file) => {
  const src = join(dir, file);
  if (existsSync(src)) copyFileSync(src, join(out, file));
};

["silero_vad_v5.onnx", "silero_vad_legacy.onnx", "vad.worklet.bundle.min.js"].forEach((f) => copy(vadDist, f));
readdirSync(ortDist)
  .filter((f) => /^ort-wasm-simd-threaded(\.jsep)?\.(wasm|mjs)$/.test(f))
  .forEach((f) => copy(ortDist, f));

console.log(`VAD assets copied to ${out}: ${readdirSync(out).join(", ")}`);
