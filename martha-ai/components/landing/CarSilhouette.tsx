import type { Model } from "@/lib/knowledge/catalogue";

// Simple, unbranded side-profile silhouettes (no real-brand vehicles).
const BODIES: Record<Model["bodyType"], string> = {
  hatchback:
    "M40 118 L52 92 Q60 76 80 72 L150 66 Q172 64 188 76 L222 100 L268 106 Q288 110 292 124 L294 136 L40 136 Z",
  SUV: "M30 124 L36 92 Q40 74 62 70 L190 64 Q210 64 224 76 L250 98 L290 104 Q306 108 308 122 L310 138 L30 138 Z",
  sedan:
    "M26 124 L44 106 Q72 98 104 82 Q126 70 160 70 L196 72 Q214 74 228 88 L250 104 L296 110 Q312 114 312 126 L312 136 L26 136 Z",
  coupe:
    "M24 126 L40 112 Q80 102 116 82 Q138 72 170 72 Q200 74 222 92 L246 108 L298 114 Q314 118 314 128 L314 136 L24 136 Z",
};

export function CarSilhouette({ bodyType, className }: { bodyType: Model["bodyType"]; className?: string }) {
  return (
    <svg viewBox="0 0 340 170" className={className} role="img" aria-label={`${bodyType} silhouette`}>
      <defs>
        <linearGradient id={`body-${bodyType}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2a2f37" />
          <stop offset="1" stopColor="#15181d" />
        </linearGradient>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#4c8dff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#2ee6a6" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <ellipse cx="170" cy="150" rx="150" ry="8" fill="#000" opacity="0.45" />
      <path d={BODIES[bodyType]} fill={`url(#body-${bodyType})`} stroke="#3a404a" strokeWidth="1.5" />
      <path d="M70 100 L96 80 L200 76 L228 100 Z" fill="url(#glass)" opacity={bodyType === "SUV" ? 1 : 0.8} />
      <path d={`M40 ${bodyType === "SUV" ? 112 : 118} H300`} stroke="#2ee6a6" strokeOpacity="0.5" strokeWidth="1.5" />
      {[90, 250].map((x) => (
        <g key={x}>
          <circle cx={x} cy="136" r="22" fill="#0a0b0d" stroke="#3a404a" strokeWidth="2" />
          <circle cx={x} cy="136" r="10" fill="#1a1d23" stroke="#2ee6a6" strokeOpacity="0.6" />
        </g>
      ))}
    </svg>
  );
}
